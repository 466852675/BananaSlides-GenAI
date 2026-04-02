/**
 * ResourceService - 资源管理核心服务
 *
 * 统一管理所有文件资源的注册、查询、生命周期管理
 * 确保：
 * 1. 项目关联资源永久保留
 * 2. 模板/收藏引用资源永久保留
 * 3. 官方资源永久保留
 * 4. 只清理真正的孤立废弃文件
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import type { AssetType, AssetStatus } from '@prisma/client';

// ============================================================
// 类型定义
// ============================================================

export interface RegisterAssetParams {
  type: AssetType;
  url: string;
  filename: string;
  projectId?: string;
  sessionId?: string;
  taskId?: string;
  templateId?: string;
  favoriteId?: string;
  isReferenced?: boolean;
  isOfficial?: boolean;
  sizeBytes?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  pointsCost?: number;
}

export interface ResourceStats {
  total: number;
  totalSize: number;
  byType: Record<string, number>;
  protectedCount: number;
  orphanedCount: number;
}

export interface CleanupReport {
  timestamp: Date;
  scanned: number;
  protected: number;
  archived: number;
  purged: number;
  spaceReclaimed: number;
  errors: string[];
}

// ============================================================
// ResourceService 类
// ============================================================

export class ResourceService {

  // ============================================================
  // 资源注册
  // ============================================================

  /**
   * 注册资源（统一入口）
   */
  async registerAsset(params: RegisterAssetParams) {
    const {
      type,
      url,
      filename,
      projectId,
      sessionId,
      taskId,
      templateId,
      favoriteId,
      isReferenced = false,
      isOfficial = false,
      sizeBytes,
      mimeType,
      metadata,
      pointsCost
    } = params;

    try {
      const asset = await prisma.assetRegistry.create({
        data: {
          type,
          url,
          filename,
          projectId: projectId || null,
          sessionId: sessionId || null,
          taskId: taskId || null,
          templateId: templateId || null,
          favoriteId: favoriteId || null,
          isReferenced,
          isOfficial,
          sizeBytes: sizeBytes || null,
          mimeType: mimeType || null,
          metadata: metadata ? JSON.stringify(metadata) : null,
          pointsCost: pointsCost || null,
          status: 'ACTIVE'
        }
      });

      logger.info(`[Resource] 注册资源成功: ${asset.id} - ${type} - ${filename}`);
      return asset;
    } catch (error) {
      logger.error(`[Resource] 注册资源失败: ${filename}`, error);
      throw error;
    }
  }

  /**
   * 注册 AI 生成图片
   */
  async registerImage(params: {
    url: string;
    projectId: string;
    sessionId?: string;
    taskId?: string;
    slideIndex?: number;
    slideTitle?: string;
    pointsCost?: number;
    sizeBytes?: number;
  }) {
    const { url, projectId, sessionId, taskId, slideIndex, slideTitle, pointsCost, sizeBytes } = params;

    // 从 URL 提取文件名
    const filename = this.extractFilename(url) || `image-${Date.now()}.png`;

    return this.registerAsset({
      type: 'IMAGE',
      url,
      filename,
      projectId,
      sessionId,
      taskId,
      sizeBytes,
      metadata: {
        slideIndex,
        slideTitle,
        source: 'ai-generation'
      },
      pointsCost
    });
  }

  /**
   * 注册模板示例图片
   */
  async registerTemplateImage(params: {
    url: string;
    templateId: string;
    isOfficial?: boolean;
  }) {
    const { url, templateId, isOfficial = false } = params;
    const filename = this.extractFilename(url) || `template-${Date.now()}.png`;

    return this.registerAsset({
      type: 'TEMPLATE_IMAGE',
      url,
      filename,
      templateId,
      isReferenced: true,
      isOfficial
    });
  }

  /**
   * 注册收藏示例图片
   */
  async registerFavoriteImage(params: {
    url: string;
    favoriteId: string;
  }) {
    const { url, favoriteId } = params;
    const filename = this.extractFilename(url) || `favorite-${Date.now()}.png`;

    return this.registerAsset({
      type: 'FAVORITE_IMAGE',
      url,
      filename,
      favoriteId,
      isReferenced: true
    });
  }

  /**
   * 注册用户上传文件
   */
  async registerUserUpload(params: {
    url: string;
    filename: string;
    sizeBytes: number;
    mimeType: string;
    projectId?: string;
    userId?: string;
  }) {
    const { url, filename, sizeBytes, mimeType, projectId, userId } = params;

    // 根据文件类型确定 AssetType
    const type = this.determineUploadType(mimeType);

    return this.registerAsset({
      type,
      url,
      filename,
      projectId,
      sizeBytes,
      mimeType,
      metadata: {
        source: 'user-upload',
        userId
      }
    });
  }

  /**
   * 注册项目缩略图
   */
  async registerThumbnail(params: {
    url: string;
    projectId: string;
  }) {
    const { url, projectId } = params;
    const filename = this.extractFilename(url) || `thumbnail-${projectId}.png`;

    return this.registerAsset({
      type: 'THUMBNAIL',
      url,
      filename,
      projectId
    });
  }

  // ============================================================
  // 资源查询
  // ============================================================

  /**
   * 获取项目资源列表
   */
  async getProjectAssets(projectId: string) {
    return prisma.assetRegistry.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 获取资源统计
   */
  async getResourceStats(projectId?: string): Promise<ResourceStats> {
    const where = projectId ? { projectId } : {};

    const assets = await prisma.assetRegistry.findMany({
      where,
      select: {
        type: true,
        sizeBytes: true,
        projectId: true,
        templateId: true,
        favoriteId: true,
        isReferenced: true,
        isOfficial: true
      }
    });

    const stats: ResourceStats = {
      total: assets.length,
      totalSize: assets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0),
      byType: {},
      protectedCount: 0,
      orphanedCount: 0
    };

    for (const asset of assets) {
      // 按类型统计
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;

      // 保护/孤立统计
      if (asset.projectId || asset.templateId || asset.favoriteId || asset.isReferenced || asset.isOfficial) {
        stats.protectedCount++;
      } else {
        stats.orphanedCount++;
      }
    }

    return stats;
  }

  /**
   * 根据 URL 查找资源
   */
  async findByUrl(url: string) {
    return prisma.assetRegistry.findFirst({
      where: { url }
    });
  }

  // ============================================================
  // 生命周期管理
  // ============================================================

  /**
   * 检查资源是否应该被保护（永不被清理）
   */
  async shouldProtect(asset: {
    projectId?: string | null;
    templateId?: string | null;
    favoriteId?: string | null;
    isReferenced: boolean;
    isOfficial: boolean;
    sessionId?: string | null;
  }): Promise<boolean> {
    // 1. 官方资源 → 永久保护
    if (asset.isOfficial) return true;

    // 2. 被模板引用 → 永久保护
    if (asset.templateId) {
      const template = await prisma.styleTemplate.findUnique({
        where: { id: asset.templateId },
        select: { id: true }
      });
      if (template) return true;
    }

    // 3. 被收藏引用 → 永久保护
    if (asset.favoriteId) {
      const favorite = await prisma.favorite.findUnique({
        where: { id: asset.favoriteId },
        select: { id: true }
      });
      if (favorite) return true;
    }

    // 4. 被标记为引用 → 永久保护
    if (asset.isReferenced) return true;

    // 5. 关联有效项目 → 永久保护
    if (asset.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: asset.projectId },
        select: { id: true }
      });
      if (project) return true;
    }

    // 6. 关联活跃会话 → 保护
    if (asset.sessionId) {
      const session = await prisma.agentSession.findUnique({
        where: { id: asset.sessionId },
        select: { id: true, status: true }
      });
      if (session && session.status === 'ACTIVE') return true;
    }

    return false;
  }

  /**
   * 检查是否可以清理
   */
  async canCleanup(asset: {
    id: string;
    status: string;
    projectId?: string | null;
    sessionId?: string | null;
    templateId?: string | null;
    favoriteId?: string | null;
    isReferenced: boolean;
    isOfficial: boolean;
    deletedAt?: Date | null;
    createdAt: Date;
  }): Promise<boolean> {
    // 有保护条件 → 不可清理
    if (await this.shouldProtect(asset)) return false;

    // 状态必须是 DELETED 或孤立
    if (asset.status === 'DELETED') {
      // 检查保留期（7天）
      if (!asset.deletedAt) return false;
      const daysSinceDelete = this.daysBetween(asset.deletedAt, new Date());
      return daysSinceDelete >= 7;
    }

    // 孤立资源检查（无任何关联超过 7 天）
    if (!asset.projectId && !asset.sessionId && !asset.templateId && !asset.favoriteId) {
      const daysSinceCreate = this.daysBetween(asset.createdAt, new Date());
      return daysSinceCreate >= 7;
    }

    return false;
  }

  /**
   * 归档项目资源（项目删除时调用）
   */
  async archiveProjectAssets(projectId: string): Promise<number> {
    const assets = await prisma.assetRegistry.findMany({
      where: { projectId, status: 'ACTIVE' }
    });

    let archivedCount = 0;

    for (const asset of assets) {
      // 检查是否被其他地方引用
      const hasOtherReference = asset.isReferenced ||
                                 asset.templateId ||
                                 asset.favoriteId;

      if (hasOtherReference) {
        // 有其他引用 → 保持 ACTIVE，只移除项目关联
        await prisma.assetRegistry.update({
          where: { id: asset.id },
          data: { projectId: null }
        });
        logger.info(`[Resource] 资源 ${asset.id} 有其他引用，保留并移除项目关联`);
      } else {
        // 无其他引用 → 标记归档
        await prisma.assetRegistry.update({
          where: { id: asset.id },
          data: {
            status: 'ARCHIVED',
            deletedAt: new Date(),
            deletedBy: 'cascade'
          }
        });
        archivedCount++;
        logger.info(`[Resource] 资源 ${asset.id} 已归档，30天后清理`);
      }
    }

    logger.info(`[Resource] 项目 ${projectId} 资源归档完成: ${archivedCount} 个`);
    return archivedCount;
  }

  /**
   * 标记资源为删除
   */
  async markAsDeleted(assetId: string, deletedBy: string = 'user') {
    return prisma.assetRegistry.update({
      where: { id: assetId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy
      }
    });
  }

  /**
   * 标记资源为保护
   */
  async markAsProtected(assetId: string) {
    return prisma.assetRegistry.update({
      where: { id: assetId },
      data: {
        isReferenced: true
      }
    });
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 从 URL 提取文件名
   */
  private extractFilename(url: string): string | null {
    if (!url) return null;
    const parts = url.split('/');
    return parts[parts.length - 1] || null;
  }

  /**
   * 根据 MIME 类型确定上传类型
   */
  private determineUploadType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType === 'application/pdf') return 'DOCUMENT';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'DOCUMENT';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCUMENT';
    return 'USER_UPLOAD';
  }

  /**
   * 计算两个日期之间的天数
   */
  private daysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
  }
}

// ============================================================
// 导出单例
// ============================================================

export const resourceService = new ResourceService();
export default resourceService;