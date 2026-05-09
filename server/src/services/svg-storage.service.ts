/**
 * SVG Storage Service — 管理 SVG 文件的保存、读取和删除
 *
 * SVG 文件存储在 uploads/svg/{projectId}/ 目录下
 * 文件名格式: {slideIndex}_{hash}.svg
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const SVG_DIR = path.join(UPLOADS_DIR, 'svg');

export class SvgStorageService {
  /**
   * 保存 SVG 内容到文件系统
   * @returns 相对 URL 路径，如 /uploads/svg/{projectId}/3_a1b2c3.svg
   */
  static async save(
    projectId: string,
    slideIndex: number,
    svgContent: string
  ): Promise<string> {
    // 确保目录存在
    const projectDir = path.join(SVG_DIR, projectId);
    await fs.mkdir(projectDir, { recursive: true });

    // 生成文件名：使用内容的短 hash 避免覆盖
    const hash = crypto
      .createHash('md5')
      .update(svgContent)
      .digest('hex')
      .substring(0, 8);

    const filename = `${slideIndex}_${hash}.svg`;
    const filePath = path.join(projectDir, filename);

    // 写入文件
    await fs.writeFile(filePath, svgContent, 'utf-8');

    // 返回相对 URL 路径
    return `/uploads/svg/${projectId}/${filename}`;
  }

  /**
   * 读取 SVG 文件内容
   * @param relativePath 相对路径，如 /uploads/svg/{projectId}/3_a1b2c3.svg
   * @returns SVG 文本内容
   */
  static async read(relativePath: string): Promise<string> {
    // 将 URL 路径转换为文件系统路径
    const absolutePath = path.join(
      UPLOADS_DIR,
      relativePath.replace('/uploads/', '')
    );

    try {
      return await fs.readFile(absolutePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `SVG file not found: ${relativePath} — ${(error as Error).message}`
      );
    }
  }

  /**
   * 删除 SVG 文件
   */
  static async delete(relativePath: string): Promise<void> {
    const absolutePath = path.join(
      UPLOADS_DIR,
      relativePath.replace('/uploads/', '')
    );

    try {
      await fs.unlink(absolutePath);
    } catch {
      // 文件不存在时静默忽略
    }
  }

  /**
   * 删除项目的所有 SVG 文件
   */
  static async deleteProjectFiles(projectId: string): Promise<void> {
    const projectDir = path.join(SVG_DIR, projectId);
    try {
      await fs.rm(projectDir, { recursive: true, force: true });
    } catch {
      // 目录不存在时静默忽略
    }
  }

  /**
   * 将相对 URL 路径转换为绝对文件系统路径
   */
  static resolveAbsolutePath(relativePath: string): string {
    return path.join(UPLOADS_DIR, relativePath.replace('/uploads/', ''));
  }
}

export default SvgStorageService;
