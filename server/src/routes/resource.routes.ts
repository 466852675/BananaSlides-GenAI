/**
 * 资源管理 API 路由
 *
 * 提供资源统计、查看、管理等接口
 */

import { Router, Request, Response } from 'express';
import { resourceService } from '../services/resource.service';
import { resourceCleanupService } from '../services/resource-cleanup.service';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { prisma } from '../db';

const router = Router();

// ============================================================
// 用户接口
// ============================================================

/**
 * GET /api/resources/stats
 * 获取资源统计
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;

    const stats = await resourceService.getResourceStats(projectId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Resources] 获取统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取资源统计失败'
    });
  }
});

/**
 * GET /api/resources/project/:id
 * 获取项目资源列表
 */
router.get('/project/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 验证项目所有权
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: '项目不存在'
      });
    }

    if (project.userId !== userId) {
      const userRole = (req as any).user?.role;
      if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: '无权访问此项目资源'
        });
      }
    }

    const assets = await resourceService.getProjectAssets(projectId);

    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    console.error('[Resources] 获取项目资源失败:', error);
    res.status(500).json({
      success: false,
      message: '获取项目资源失败'
    });
  }
});

/**
 * DELETE /api/resources/:id
 * 删除资源（软删除）
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const assetId = String(req.params.id);
    const userId = (req as any).user?.id;

    // 获取资源
    const asset = await prisma.assetRegistry.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: '资源不存在'
      });
    }

    // 验证权限（如果是项目资源，需要验证项目所有权）
    if (asset.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: asset.projectId },
        select: { userId: true }
      });

      if (project && project.userId !== userId) {
        const userRole = (req as any).user?.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
          return res.status(403).json({
            success: false,
            message: '无权删除此资源'
          });
        }
      }
    }

    // 标记删除
    await resourceService.markAsDeleted(assetId, 'user');

    res.json({
      success: true,
      message: '资源已标记删除，将在 7 天后永久删除'
    });
  } catch (error) {
    console.error('[Resources] 删除资源失败:', error);
    res.status(500).json({
      success: false,
      message: '删除资源失败'
    });
  }
});

// ============================================================
// 管理员接口
// ============================================================

/**
 * GET /api/resources/admin/orphaned
 * 获取孤立资源列表（管理员）
 */
router.get('/admin/orphaned', authenticate, requirePermission('admin.resources.view'), async (req: Request, res: Response) => {
  try {
    const assets = await resourceCleanupService.findOrphanedAssets();

    res.json({
      success: true,
      data: assets
    });
  } catch (error) {
    console.error('[Resources] 获取孤立资源失败:', error);
    res.status(500).json({
      success: false,
      message: '获取孤立资源失败'
    });
  }
});

/**
 * GET /api/resources/admin/stats
 * 获取清理统计（管理员）
 */
router.get('/admin/stats', authenticate, requirePermission('admin.resources.view'), async (req: Request, res: Response) => {
  try {
    const stats = await resourceCleanupService.getCleanupStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Resources] 获取清理统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取清理统计失败'
    });
  }
});

/**
 * POST /api/resources/admin/cleanup
 * 手动触发清理（管理员）
 */
router.post('/admin/cleanup', authenticate, requirePermission('admin.resources.manage'), async (req: Request, res: Response) => {
  try {
    const report = await resourceCleanupService.runDailyCleanup();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('[Resources] 手动清理失败:', error);
    res.status(500).json({
      success: false,
      message: '手动清理失败'
    });
  }
});

/**
 * POST /api/resources/admin/:id/protect
 * 标记资源为保护（管理员）
 */
router.post('/admin/:id/protect', authenticate, requirePermission('admin.resources.manage'), async (req: Request, res: Response) => {
  try {
    const assetId = String(req.params.id);

    await resourceService.markAsProtected(assetId);

    res.json({
      success: true,
      message: '资源已标记为保护，不会被自动清理'
    });
  } catch (error) {
    console.error('[Resources] 标记保护失败:', error);
    res.status(500).json({
      success: false,
      message: '标记保护失败'
    });
  }
});

export default router;