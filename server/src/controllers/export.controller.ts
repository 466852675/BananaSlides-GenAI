/**
 * Export Controller — 服务端 PPTX 导出（SVG 模式）
 *
 * POST /api/export/pptx — 接收 projectId，从 DB 加载 SVG 幻灯片，
 * 调用 Python Bridge 转换为可编辑 DrawingML PPTX，返回二进制文件下载
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PythonBridgeService } from '../services/python-bridge.service';
import { SvgStorageService } from '../services/svg-storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const prisma = new PrismaClient();

const logger = {
  info: (msg: string) => console.log(`[ExportCtrl] ${msg}`),
  error: (msg: string) => console.error(`[ExportCtrl] ${msg}`),
};

/**
 * POST /api/export/pptx
 * Body: { projectId: string, mode: 'native' | 'legacy' }
 * Response: 二进制 PPTX 文件下载
 */
export const handleExportPptx = async (req: Request, res: Response): Promise<void> => {
  const { projectId, mode } = req.body;

  if (!projectId) {
    res.status(400).json({ success: false, error: 'projectId is required' });
    return;
  }

  const conversionMode = mode === 'legacy' ? 'legacy' : 'native';

  try {
    // 1. 加载项目
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Slide: { orderBy: { index: 'asc' } } },
    });

    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    // 2. 检查权限（非管理员只能导出自己的项目）
    if (req.user && project.userId && project.userId !== req.user.id) {
      const userRole = (req.user as any).role;
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        res.status(403).json({ success: false, error: 'Permission denied' });
        return;
      }
    }

    // 3. 检查 generationMode
    const generationMode = (project as any).generationMode || 'image';
    if (generationMode !== 'svg') {
      res.status(400).json({
        success: false,
        error: 'This project uses image mode. Use client-side export instead.',
      });
      return;
    }

    // 4. 收集 SVG 文件路径
    const slides = project.Slide.filter(
      (s: any) => s.svgContent && s.status !== 'error'
    );

    if (slides.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No SVG slides found in this project',
      });
      return;
    }

    const slideInfos = slides.map((s: any) => ({
      svgFilePath: SvgStorageService.resolveAbsolutePath(s.svgContent),
      slideIndex: s.index,
      title: s.title || `Slide ${s.index + 1}`,
    }));

    // 验证所有 SVG 文件存在
    for (const info of slideInfos) {
      try {
        await fs.access(info.svgFilePath);
      } catch {
        res.status(400).json({
          success: false,
          error: `SVG file not found: slide ${info.slideIndex + 1}`,
        });
        return;
      }
    }

    // 5. 生成临时输出路径
    const tmpDir = path.join(os.tmpdir(), 'ppt-export');
    await fs.mkdir(tmpDir, { recursive: true });
    const outputPath = path.join(
      tmpDir,
      `${project.title || 'presentation'}_${Date.now()}.pptx`
    );

    // 6. 调用 Python Bridge 转换
    logger.info(`Converting ${slides.length} SVG slides to PPTX (mode: ${conversionMode})`);
    const result = await PythonBridgeService.batchConvertToPptx(
      slideInfos,
      outputPath,
      { mode: conversionMode }
    );

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: `PPTX conversion failed: ${result.errors.join('; ')}`,
      });
      return;
    }

    // 7. 流式返回 PPTX 文件
    try {
      const pptxBuffer = await fs.readFile(result.outputPath);
      const filename = `${project.title || 'presentation'}.pptx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', pptxBuffer.length);
      res.send(pptxBuffer);

      logger.info(`Exported PPTX: ${filename} (${pptxBuffer.length} bytes)`);
    } finally {
      // 清理临时文件
      try { await fs.unlink(result.outputPath); } catch { /* ignore */ }
    }
  } catch (error: any) {
    logger.error(`Export failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};