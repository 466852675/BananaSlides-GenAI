/**
 * 回收箱服务
 *
 * 提供项目软删除、恢复、彻底删除等功能
 */

import { prisma } from '../db';
import { resourceService } from './resource.service';

// ============================================================
// 配置
// ============================================================

const TRASH_RETENTION_DAYS = 30; // 回收箱保留 30 天

// ============================================================
// 类型定义
// ============================================================

export interface TrashItem {
  id: string;
  displayId: string | null;
  title: string;
  thumbnailUrl: string | null;
  deletedAt: Date;
  deletedBy: string | null;
  expiresAt: Date; // 过期时间
  remainingDays: number; // 剩余天数
  slideCount: number; // 幻灯片数量
  createdAt: Date;
  userId: string | null;
  status: string;
  scenarioType?: string; // 项目类型，用于分类显示
}

export interface TrashListResult {
  items: TrashItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrashListParams {
  page: number;
  pageSize: number;
  keyword?: string;
  deletedBy?: 'user' | 'admin';
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minRemainingDays?: number;
  maxRemainingDays?: number;
  userId?: string; // 管理员用：筛选特定用户
}

export interface TrashStats {
  total: number;
  expiring: number; // 即将过期（5天内）
  userDeleted: number;
  adminDeleted: number;
}

// ============================================================
// 回收箱服务
// ============================================================

class TrashService {

  /**
   * 计算缩略图（与前端 calculateThumbnail 逻辑一致）
   * 优先级：
   * 1. 项目已有的 thumbnailUrl
   * 2. 按页面类型优先级查找已生成的图片（variants）
   * 3. 按页面类型优先级查找预览图（previewUrl）
   * 4. 任意幻灯片的已生成图片
   * 5. styleMap 中的参考图（模板封面等）
   */
  private calculateThumbnail(
    projectThumbnailUrl: string | null,
    items: Array<{ pageType?: string; previewUrl?: string | null; variants?: string }>,
    styleMapJson?: string | null
  ): string | null {
    // 1. 如果项目已有缩略图，直接使用
    if (projectThumbnailUrl) {
      return projectThumbnailUrl;
    }

    const pageTypePriority = ['cover', 'directory', 'transition', 'content', 'end'];

    // 2. 按页面类型优先级查找已生成的图片
    for (const pageType of pageTypePriority) {
      const slide = items.find(item => item.pageType === pageType);
      if (slide?.variants) {
        try {
          const variants = JSON.parse(slide.variants);
          if (Array.isArray(variants) && variants.length > 0) {
            return variants[0];
          }
        } catch (e) {
          // JSON 解析失败，忽略
        }
      }
    }

    // 3. 按页面类型优先级查找预览图
    for (const pageType of pageTypePriority) {
      const slide = items.find(item => item.pageType === pageType);
      if (slide?.previewUrl) {
        return slide.previewUrl;
      }
    }

    // 4. 任意幻灯片的已生成图片
    for (const slide of items) {
      if (slide.variants) {
        try {
          const variants = JSON.parse(slide.variants);
          if (Array.isArray(variants) && variants.length > 0) {
            return variants[0];
          }
        } catch (e) {
          // 忽略
        }
      }
      if (slide.previewUrl) {
        return slide.previewUrl;
      }
    }

    // 5. styleMap 中的参考图（模板封面等）
    if (styleMapJson) {
      try {
        const styleMap = JSON.parse(styleMapJson);
        if (styleMap) {
          for (const pageType of pageTypePriority) {
            if (styleMap[pageType]) {
              return styleMap[pageType];
            }
          }
        }
      } catch (e) {
        // JSON 解析失败，忽略
      }
    }

    return null;
  }

  /**
   * 获取用户回收箱列表
   */
  async getUserTrashList(userId: string, params: TrashListParams): Promise<TrashListResult> {
    const { page, pageSize, keyword, deletedBy, startDate, endDate, minRemainingDays, maxRemainingDays } = params;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {
      userId,
      isDeleted: true,
      deletedAt: { not: null }
    };

    // 关键词搜索
    if (keyword) {
      where.title = { contains: keyword };
    }

    // 删除来源筛选
    if (deletedBy) {
      where.deletedBy = deletedBy;
    }

    // 项目状态筛选
    if (params.status) {
      where.status = params.status;
    }

    // 删除时间范围
    if (startDate || endDate) {
      where.deletedAt = {};
      if (startDate) where.deletedAt.gte = startDate;
      if (endDate) where.deletedAt.lte = endDate;
    }

    // 剩余天数范围
    if (minRemainingDays !== undefined || maxRemainingDays !== undefined) {
      const now = new Date();
      where.deletedAt = where.deletedAt || {};

      const minDays = minRemainingDays ?? 0;
      const maxDays = maxRemainingDays ?? TRASH_RETENTION_DAYS;

      if (minRemainingDays !== undefined) {
        // remainingDays >= min => deletedAt <= now - (30 - min)天
        const threshold = new Date(now.getTime() - (TRASH_RETENTION_DAYS - minDays) * 24 * 60 * 60 * 1000);
        where.deletedAt.gte = threshold;
      }
      if (maxRemainingDays !== undefined) {
        const threshold = new Date(now.getTime() - (TRASH_RETENTION_DAYS - maxDays) * 24 * 60 * 60 * 1000);
        where.deletedAt.lte = threshold;
      }
    }

    // 查询总数
    const total = await prisma.project.count({ where });

    // 查询列表
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        title: true,
        thumbnailUrl: true,
        styleMap: true,
        deletedAt: true,
        deletedBy: true,
        createdAt: true,
        userId: true,
        status: true,
        scenarioType: true,
        items: {
          select: { id: true, pageType: true, previewUrl: true, variants: true },
          orderBy: { index: 'asc' }
        }
      }
    });

    // 构建返回结果
    const items: TrashItem[] = projects.map(p => {
      const deletedAt = p.deletedAt!;
      const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

      // 计算缩略图（与前端 calculateThumbnail 逻辑一致）
      const thumbnailUrl = this.calculateThumbnail(p.thumbnailUrl, p.items as any[], p.styleMap);

      return {
        id: p.id,
        displayId: p.displayId,
        title: p.title,
        thumbnailUrl,
        deletedAt,
        deletedBy: p.deletedBy,
        expiresAt,
        remainingDays,
        slideCount: p.items.length,
        createdAt: p.createdAt,
        userId: p.userId,
        status: p.status,
        scenarioType: (p as any).scenarioType || 'BUSINESS'
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取管理员回收箱列表（所有用户）
   */
  async getAdminTrashList(params: TrashListParams): Promise<TrashListResult> {
    const { page, pageSize, keyword, deletedBy, startDate, endDate, userId, status, minRemainingDays, maxRemainingDays } = params;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {
      isDeleted: true,
      deletedAt: { not: null }
    };

    // 关键词搜索
    if (keyword) {
      where.title = { contains: keyword };
    }

    // 删除来源筛选
    if (deletedBy) {
      where.deletedBy = deletedBy;
    }

    // 用户筛选
    if (userId) {
      where.userId = userId;
    }

    // 项目状态筛选
    if (status) {
      where.status = status;
    }

    // 删除时间范围
    if (startDate || endDate) {
      where.deletedAt = {};
      if (startDate) where.deletedAt.gte = startDate;
      if (endDate) where.deletedAt.lte = endDate;
    }

    // 剩余天数范围（简化计算）
    if (minRemainingDays !== undefined || maxRemainingDays !== undefined) {
      const now = new Date();
      where.deletedAt = where.deletedAt || {};
      if (minRemainingDays !== undefined) {
        const threshold = new Date(now.getTime() - (TRASH_RETENTION_DAYS - minRemainingDays) * 24 * 60 * 60 * 1000);
        where.deletedAt.gte = threshold;
      }
      if (maxRemainingDays !== undefined) {
        const threshold = new Date(now.getTime() - (TRASH_RETENTION_DAYS - maxRemainingDays) * 24 * 60 * 60 * 1000);
        where.deletedAt.lte = threshold;
      }
    }

    // 查询总数
    const total = await prisma.project.count({ where });

    // 查询列表
    const projects = await prisma.project.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { deletedAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        title: true,
        thumbnailUrl: true,
        styleMap: true,
        deletedAt: true,
        deletedBy: true,
        createdAt: true,
        userId: true,
        status: true,
        scenarioType: true,
        items: {
          select: { id: true, pageType: true, previewUrl: true, variants: true },
          orderBy: { index: 'asc' }
        },
        user: { select: { id: true, nickname: true, email: true } }
      }
    });

    // 构建返回结果
    const items: TrashItem[] = projects.map(p => {
      const deletedAt = p.deletedAt!;
      const expiresAt = new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

      // 计算缩略图（与前端 calculateThumbnail 逻辑一致）
      const thumbnailUrl = this.calculateThumbnail(p.thumbnailUrl, p.items as any[], p.styleMap);

      return {
        id: p.id,
        displayId: p.displayId,
        title: p.title,
        thumbnailUrl,
        deletedAt,
        deletedBy: p.deletedBy,
        expiresAt,
        remainingDays,
        slideCount: p.items.length,
        createdAt: p.createdAt,
        userId: p.userId,
        status: p.status,
        scenarioType: (p as any).scenarioType || 'BUSINESS'
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取回收箱统计
   */
  async getTrashStats(userId?: string): Promise<TrashStats> {
    const now = new Date();
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const whereBase: any = {
      isDeleted: true,
      deletedAt: { not: null }
    };
    if (userId) {
      whereBase.userId = userId;
    }

    // 总数
    const total = await prisma.project.count({ where: whereBase });

    // 即将过期（deletedAt <= now - 25天，即剩余 <= 5天）
    const expiringWhere = { ...whereBase };
    expiringWhere.deletedAt = {
      not: null,
      lte: new Date(now.getTime() - (TRASH_RETENTION_DAYS - 5) * 24 * 60 * 60 * 1000)
    };
    const expiring = await prisma.project.count({ where: expiringWhere });

    // 用户删除
    const userDeleted = await prisma.project.count({
      where: { ...whereBase, deletedBy: 'user' }
    });

    // 管理员删除
    const adminDeleted = await prisma.project.count({
      where: { ...whereBase, deletedBy: 'admin' }
    });

    return { total, expiring, userDeleted, adminDeleted };
  }

  /**
   * 软删除项目（移入回收箱）
   */
  async softDeleteProject(projectId: string, deletedBy: 'user' | 'admin', operatorId?: string): Promise<{ success: boolean; message: string }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, isDeleted: true }
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    if (project.isDeleted) {
      throw new Error('项目已在回收箱中');
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 标记项目删除
      await tx.project.update({
        where: { id: projectId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy
        }
      });

      // 2. 标记 AgentSession 删除（如果存在）
      await tx.agentSession.updateMany({
        where: { projectId, isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      // 3. 归档关联资源
      await tx.assetRegistry.updateMany({
        where: { projectId, status: 'ACTIVE' },
        data: {
          status: 'TRASHED'
        }
      });

      // 4. 记录操作日志
      await tx.auditLog.create({
        data: {
          userId: operatorId || project.userId,
          type: 'PROJECT_SOFT_DELETE',
          content: projectId,
          reason: `deletedBy: ${deletedBy}`,
          severity: 'INFO'
        }
      });
    });

    return {
      success: true,
      message: '项目已移至回收箱，30天内可恢复'
    };
  }

  /**
   * 恢复项目
   */
  async restoreProject(projectId: string, operatorId?: string): Promise<{ success: boolean; message: string }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, isDeleted: true, deletedAt: true }
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    if (!project.isDeleted) {
      throw new Error('项目不在回收箱中');
    }

    // 检查是否过期
    const expiresAt = new Date(project.deletedAt!.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    if (expiresAt < new Date()) {
      throw new Error('项目已超过 30 天保留期，无法恢复');
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 恢复项目
      await tx.project.update({
        where: { id: projectId },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        }
      });

      // 2. 恢复 AgentSession（如果存在）
      await tx.agentSession.updateMany({
        where: { projectId, isDeleted: true },
        data: {
          isDeleted: false,
          deletedAt: null
        }
      });

      // 3. 恢复关联资源
      await tx.assetRegistry.updateMany({
        where: { projectId, status: 'TRASHED' },
        data: {
          status: 'ACTIVE'
        }
      });

      // 4. 记录操作日志
      await tx.auditLog.create({
        data: {
          userId: operatorId || project.userId,
          type: 'PROJECT_RESTORE',
          content: projectId,
          severity: 'INFO'
        }
      });
    });

    return {
      success: true,
      message: '项目已恢复'
    };
  }

  /**
   * 彻底删除项目
   */
  async permanentDeleteProject(projectId: string, operatorId?: string): Promise<{ success: boolean; message: string }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true, isDeleted: true, title: true }
    });

    if (!project) {
      throw new Error('项目不存在');
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 将资源标记为孤立（准备清理）
      await tx.assetRegistry.updateMany({
        where: { projectId, status: 'TRASHED' },
        data: {
          status: 'ARCHIVED',
          projectId: null, // 移除项目关联，变为孤立
          deletedAt: new Date(),
          deletedBy: 'cascade'
        }
      });

      // 2. 删除 AgentSession
      await tx.agentSession.deleteMany({
        where: { projectId }
      });

      // 3. 删除幻灯片
      await tx.slide.deleteMany({
        where: { projectId }
      });

      // 4. 删除快照
      await tx.projectSnapshot.deleteMany({
        where: { projectId }
      });

      // 5. 删除项目
      await tx.project.delete({
        where: { id: projectId }
      });

      // 6. 记录操作日志
      await tx.auditLog.create({
        data: {
          userId: operatorId || project.userId,
          type: 'PROJECT_PERMANENT_DELETE',
          content: projectId,
          reason: `title: ${project.title}`,
          severity: 'WARNING'
        }
      });
    });

    return {
      success: true,
      message: '项目已彻底删除，关联资源将在 7 天后自动清理'
    };
  }

  /**
   * 批量恢复
   */
  async batchRestore(projectIds: string[], operatorId?: string): Promise<{ success: boolean; restored: number; failed: number; errors: string[] }> {
    const results = {
      success: true,
      restored: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const projectId of projectIds) {
      try {
        await this.restoreProject(projectId, operatorId);
        results.restored++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${projectId}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * 批量彻底删除
   */
  async batchPermanentDelete(projectIds: string[], operatorId?: string): Promise<{ success: boolean; deleted: number; failed: number; errors: string[] }> {
    const results = {
      success: true,
      deleted: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const projectId of projectIds) {
      try {
        await this.permanentDeleteProject(projectId, operatorId);
        results.deleted++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${projectId}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * 清空用户回收箱（彻底删除所有）
   */
  async clearUserTrash(userId: string): Promise<{ success: boolean; deleted: number }> {
    const projects = await prisma.project.findMany({
      where: { userId, isDeleted: true },
      select: { id: true }
    });

    const projectIds = projects.map(p => p.id);
    const result = await this.batchPermanentDelete(projectIds, userId);

    return {
      success: true,
      deleted: result.deleted
    };
  }

  /**
   * 检查并处理过期项目（定时任务调用）
   */
  async processExpiredProjects(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();
    const threshold = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // 查找过期项目
    const expiredProjects = await prisma.project.findMany({
      where: {
        isDeleted: true,
        deletedAt: { lte: threshold }
      },
      select: { id: true }
    });

    const results = {
      processed: 0,
      errors: [] as string[]
    };

    for (const project of expiredProjects) {
      try {
        await this.permanentDeleteProject(project.id, 'system');
        results.processed++;
      } catch (err: any) {
        results.errors.push(`${project.id}: ${err.message}`);
      }
    }

    console.log(`[Trash] 处理过期项目: ${results.processed} 个已清理, ${results.errors.length} 个失败`);
    return results;
  }

  /**
   * 发送过期提醒（即将过期的项目）
   */
  async sendExpiryReminders(): Promise<{ sent: number }> {
    const now = new Date();
    // 25天前删除的 = 5天后过期
    const threshold25Days = new Date(now.getTime() - (TRASH_RETENTION_DAYS - 5) * 24 * 60 * 60 * 1000);
    // 30天前删除的 = 今天过期
    const threshold30Days = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const expiringProjects = await prisma.project.findMany({
      where: {
        isDeleted: true,
        deletedAt: {
          gte: threshold30Days,
          lte: threshold25Days
        }
      },
      select: {
        id: true,
        title: true,
        deletedAt: true,
        userId: true
      }
    });

    let sent = 0;

    for (const project of expiringProjects) {
      if (!project.userId) continue;

      try {
        // 发送站内信
        const expiresAt = new Date(project.deletedAt!.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await prisma.userMessage.create({
          data: {
            userId: project.userId,
            type: 'SYSTEM',
            title: '项目即将过期',
            content: `《${project.title}》将在 ${remainingDays} 天后永久删除，如需保留请及时从回收箱恢复。`,
            bizType: 'trash_expiry',
            bizId: project.id,
            isImportant: true,
            expiresAt: expiresAt
          }
        });
        sent++;
      } catch (err) {
        console.error(`[Trash] 发送过期提醒失败: ${project.id}`, err);
      }
    }

    console.log(`[Trash] 发送过期提醒: ${sent} 条`);
    return { sent };
  }
}

export const trashService = new TrashService();