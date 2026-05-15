/**
 * ResourceCleanupService - 资源清理服务
 *
 * 定期清理孤立资源，释放存储空间
 * 确保只清理无主的废弃文件，保护有价值数据
 *
 * 新增功能：
 * - 回收箱过期项目处理
 * - TRASHED 状态资源清理
 * - 过期提醒发送
 */

import { prisma } from '../db';
import { logger } from '../utils/logger';
import { resourceService, CleanupReport } from './resource.service';
import { AuditService } from './audit.service';
import fs from 'fs';
import path from 'path';

// ============================================================
// 清理策略配置
// ============================================================

const CLEANUP_POLICIES = {
  ORPHANED_ASSETS: { maxAge: 7, unit: 'days' },     // 孤立资源 7 天
  ARCHIVED_ASSETS: { maxAge: 30, unit: 'days' },    // 归档资源 30 天
  DELETED_ASSETS: { maxAge: 7, unit: 'days' },      // 已删除 7 天
  TRASHED_ASSETS: { maxAge: 7, unit: 'days' },      // 回收箱资源清理后 7 天
} as const;

const TRASH_RETENTION_DAYS = 30; // 回收箱保留 30 天
const EXPIRY_REMINDER_DAYS = 5;  // 过期前 5 天提醒

// ============================================================
// ResourceCleanupService 类
// ============================================================

export class ResourceCleanupService {

  /**
   * 执行每日清理
   */
  async runDailyCleanup(): Promise<CleanupReport> {
    const report: CleanupReport = {
      timestamp: new Date(),
      scanned: 0,
      protected: 0,
      archived: 0,
      purged: 0,
      spaceReclaimed: 0,
      errors: []
    };

    logger.info('[Cleanup] 开始每日资源清理...');

    try {
      // 1. 处理回收箱过期项目
      const trashResult = await this.processExpiredTrashProjects();
      logger.info(`[Cleanup] 回收箱过期处理: ${trashResult.processed} 个项目已清理`);

      // 2. 发送过期提醒
      const reminderResult = await this.sendExpiryReminders();
      logger.info(`[Cleanup] 过期提醒发送: ${reminderResult.sent} 条`);

      // 3. 查找所有待检查的资源
      const candidates = await this.findCleanupCandidates();
      report.scanned = candidates.length;
      logger.info(`[Cleanup] 发现 ${candidates.length} 个待检查资源`);

      // 4. 逐个检查处理
      for (const asset of candidates) {
        try {
          // 检查保护状态
          if (await resourceService.shouldProtect(asset)) {
            report.protected++;
            continue;
          }

          // 检查是否可以清理
          if (await resourceService.canCleanup(asset)) {
            const size = asset.sizeBytes || 0;
            await this.purgeAsset(asset);
            report.purged++;
            report.spaceReclaimed += size;
          } else if (asset.status === 'ACTIVE' && !asset.projectId && !asset.sessionId) {
            // 孤立资源标记归档
            await this.markAsArchived(asset.id);
            report.archived++;
          }
        } catch (err) {
          const errorMsg = `处理资源 ${asset.id} 失败: ${err}`;
          report.errors.push(errorMsg);
          logger.error(`[Cleanup] ${errorMsg}`);
        }
      }

      logger.info(`[Cleanup] 清理完成: 扫描 ${report.scanned}, 保护 ${report.protected}, 归档 ${report.archived}, 清理 ${report.purged}, 回收 ${(report.spaceReclaimed / 1024 / 1024).toFixed(2)} MB`);

    } catch (error) {
      const errorMsg = `清理任务执行失败: ${error}`;
      report.errors.push(errorMsg);
      logger.error(`[Cleanup] ${errorMsg}`);
    }

    return report;
  }

  /**
   * 处理回收箱过期项目
   */
  private async processExpiredTrashProjects(): Promise<{ processed: number; errors: string[] }> {
    const now = new Date();
    const threshold = new Date(now.getTime() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // 查找过期项目
    const expiredProjects = await prisma.project.findMany({
      where: {
        isDeleted: true,
        deletedAt: { lte: threshold }
      },
      select: { id: true, title: true, userId: true }
    });

    const results = {
      processed: 0,
      errors: [] as string[]
    };

    for (const project of expiredProjects) {
      try {
        await this.permanentDeleteProject(project.id, project.title);
        results.processed++;

        // 发送已过期通知给用户
        if (project.userId) {
          await prisma.userMessage.create({
            data: {
              userId: project.userId,
              type: 'SYSTEM',
              title: '项目已永久删除',
              content: `《${project.title}》已超过 30 天保留期，已被永久删除。`,
              bizType: 'trash_expired',
              bizId: project.id,
              isImportant: true
            }
          });
        }
      } catch (err: any) {
        results.errors.push(`${project.id}: ${err.message}`);
        logger.error(`[Cleanup] 清理过期项目 ${project.id} 失败:`, err);
      }
    }

    return results;
  }

  /**
   * 彻底删除项目（内部方法）
   */
  private async permanentDeleteProject(projectId: string, title: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. 将资源标记为孤立（准备清理）
      await tx.assetRegistry.updateMany({
        where: { projectId, status: 'TRASHED' },
        data: {
          status: 'ARCHIVED',
          projectId: null,
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
    });
    // 6. 记录操作日志
    AuditService.log({
      userId: undefined,
      type: 'PROJECT_AUTO_DELETE',
      content: projectId,
      reason: `title: ${title}, reason: expired`,
      severity: 'high'
    });
  }

  /**
   * 发送过期提醒
   */
  private async sendExpiryReminders(): Promise<{ sent: number }> {
    const now = new Date();
    // 25天前删除的 = 5天后过期
    const threshold25Days = new Date(now.getTime() - (TRASH_RETENTION_DAYS - EXPIRY_REMINDER_DAYS) * 24 * 60 * 60 * 1000);
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

      // 检查是否已发送过提醒（避免重复）
      const existingReminder = await prisma.userMessage.findFirst({
        where: {
          userId: project.userId,
          bizType: 'trash_expiry_reminder',
          bizId: project.id,
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // 24小时内
        }
      });

      if (existingReminder) continue;

      try {
        const expiresAt = new Date(project.deletedAt!.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const remainingDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        await prisma.userMessage.create({
          data: {
            userId: project.userId,
            type: 'SYSTEM',
            title: '项目即将过期',
            content: `《${project.title}》将在 ${remainingDays} 天后永久删除，如需保留请及时从回收箱恢复。`,
            bizType: 'trash_expiry_reminder',
            bizId: project.id,
            isImportant: true,
            expiresAt: expiresAt
          }
        });
        sent++;
      } catch (err) {
        logger.error(`[Cleanup] 发送过期提醒失败: ${project.id}`, err);
      }
    }

    return { sent };
  }

  /**
   * 查找待清理候选资源
   */
  private async findCleanupCandidates() {
    const now = new Date();
    const orphanedThreshold = new Date(now.getTime() - CLEANUP_POLICIES.ORPHANED_ASSETS.maxAge * 24 * 60 * 60 * 1000);
    const archivedThreshold = new Date(now.getTime() - CLEANUP_POLICIES.ARCHIVED_ASSETS.maxAge * 24 * 60 * 60 * 1000);
    const deletedThreshold = new Date(now.getTime() - CLEANUP_POLICIES.DELETED_ASSETS.maxAge * 24 * 60 * 60 * 1000);
    const trashedThreshold = new Date(now.getTime() - CLEANUP_POLICIES.TRASHED_ASSETS.maxAge * 24 * 60 * 60 * 1000);

    return prisma.assetRegistry.findMany({
      where: {
        OR: [
          // 孤立资源：无任何关联且创建超过 7 天
          {
            projectId: null,
            sessionId: null,
            templateId: null,
            favoriteId: null,
            isReferenced: false,
            isOfficial: false,
            createdAt: { lt: orphanedThreshold }
          },
          // 已归档超过 30 天
          {
            status: 'ARCHIVED',
            deletedAt: { lt: archivedThreshold }
          },
          // 已标记删除超过 7 天
          {
            status: 'DELETED',
            deletedAt: { lt: deletedThreshold }
          },
          // TRASHED 状态超过 7 天（项目已被删除，资源等待清理）
          {
            status: 'TRASHED',
            projectId: null, // 项目已删除，关联已移除
            deletedAt: { lt: trashedThreshold }
          }
        ]
      }
    });
  }

  /**
   * 标记资源为归档
   */
  private async markAsArchived(assetId: string) {
    await prisma.assetRegistry.update({
      where: { id: assetId },
      data: {
        status: 'ARCHIVED',
        deletedAt: new Date(),
        deletedBy: 'system'
      }
    });
    logger.info(`[Cleanup] 资源 ${assetId} 已标记归档`);
  }

  /**
   * 物理删除资源
   */
  private async purgeAsset(asset: { id: string; url: string; filename: string }): Promise<void> {
    try {
      // 1. 删除文件
      const filePath = this.resolveFilePath(asset.url);
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`[Cleanup] 已删除文件: ${filePath}`);
      }

      // 2. 删除数据库记录
      await prisma.assetRegistry.delete({
        where: { id: asset.id }
      });

      logger.info(`[Cleanup] 资源 ${asset.id} 已物理删除`);
    } catch (error) {
      logger.error(`[Cleanup] 物理删除资源 ${asset.id} 失败:`, error);
      throw error;
    }
  }

  /**
   * 解析文件物理路径
   */
  private resolveFilePath(url: string): string | null {
    if (!url) return null;

    // URL 格式: /uploads/xxx 或 uploads/xxx
    let relativePath = url;
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }

    // 项目根目录
    const projectRoot = path.join(__dirname, '../../');
    return path.join(projectRoot, relativePath);
  }

  /**
   * 查找孤立资源（管理员查看）
   */
  async findOrphanedAssets() {
    const orphanedThreshold = new Date(Date.now() - CLEANUP_POLICIES.ORPHANED_ASSETS.maxAge * 24 * 60 * 60 * 1000);

    return prisma.assetRegistry.findMany({
      where: {
        projectId: null,
        sessionId: null,
        templateId: null,
        favoriteId: null,
        isReferenced: false,
        isOfficial: false,
        createdAt: { lt: orphanedThreshold }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  /**
   * 获取清理统计
   */
  async getCleanupStats() {
    const now = new Date();

    const [orphaned, archived, deleted, trashed] = await Promise.all([
      // 孤立资源
      prisma.assetRegistry.count({
        where: {
          projectId: null,
          sessionId: null,
          templateId: null,
          favoriteId: null,
          isReferenced: false,
          isOfficial: false
        }
      }),
      // 归档资源
      prisma.assetRegistry.count({
        where: { status: 'ARCHIVED' }
      }),
      // 待删除资源
      prisma.assetRegistry.count({
        where: { status: 'DELETED' }
      }),
      // 回收箱资源
      prisma.assetRegistry.count({
        where: { status: 'TRASHED' }
      })
    ]);

    // 回收箱统计
    const trashStats = await this.getTrashStats();

    return {
      orphaned,
      archived,
      deleted,
      trashed,
      trash: trashStats,
      policies: CLEANUP_POLICIES,
      trashRetentionDays: TRASH_RETENTION_DAYS
    };
  }

  /**
   * 获取回收箱统计
   */
  private async getTrashStats() {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - (TRASH_RETENTION_DAYS - EXPIRY_REMINDER_DAYS) * 24 * 60 * 60 * 1000);

    const [total, expiring, userDeleted, adminDeleted] = await Promise.all([
      // 总数
      prisma.project.count({
        where: { isDeleted: true, deletedAt: { not: null } }
      }),
      // 即将过期（剩余 <= 5 天）
      prisma.project.count({
        where: {
          isDeleted: true,
          deletedAt: {
            not: null,
            lte: fiveDaysAgo
          }
        }
      }),
      // 用户删除
      prisma.project.count({
        where: { isDeleted: true, deletedBy: 'user' }
      }),
      // 管理员删除
      prisma.project.count({
        where: { isDeleted: true, deletedBy: 'admin' }
      })
    ]);

    return { total, expiring, userDeleted, adminDeleted };
  }
}

// ============================================================
// 导出单例
// ============================================================

export const resourceCleanupService = new ResourceCleanupService();
export default resourceCleanupService;