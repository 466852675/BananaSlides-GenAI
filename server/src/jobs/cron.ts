/**
 * 定时任务调度器
 *
 * 管理所有后台定时任务：
 * - 资源清理（每日凌晨 3 点）
 * - 其他可能的定时任务
 */

import { resourceCleanupService } from '../services/resource-cleanup.service';
import { logger } from '../utils/logger';

// ============================================================
// 任务状态
// ============================================================

interface JobStatus {
  name: string;
  lastRun: Date | null;
  nextRun: Date | null;
  isRunning: boolean;
}

const jobStatuses: Map<string, JobStatus> = new Map();

// ============================================================
// 任务调度器
// ============================================================

/**
 * 启动所有定时任务
 */
export function startScheduledJobs() {
  logger.info('[Cron] 启动定时任务调度器...');

  // 启动资源清理任务
  scheduleResourceCleanup();

  logger.info('[Cron] 定时任务调度器已启动');
}

/**
 * 获取任务状态
 */
export function getJobStatuses(): JobStatus[] {
  return Array.from(jobStatuses.values());
}

/**
 * 手动触发资源清理（管理员使用）
 */
export async function triggerResourceCleanup() {
  const status = jobStatuses.get('resource-cleanup');
  if (status?.isRunning) {
    throw new Error('资源清理任务正在运行中');
  }

  return runResourceCleanup();
}

// ============================================================
// 资源清理任务
// ============================================================

function scheduleResourceCleanup() {
  const jobName = 'resource-cleanup';

  // 初始化状态
  jobStatuses.set(jobName, {
    name: jobName,
    lastRun: null,
    nextRun: null,
    isRunning: false
  });

  const scheduleNext = () => {
    const now = new Date();

    // 计算下次执行时间（凌晨 3 点）
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next.getTime() - now.getTime();

    // 更新下次执行时间
    const status = jobStatuses.get(jobName);
    if (status) {
      status.nextRun = next;
    }

    logger.info(`[Cron] 下次资源清理时间: ${next.toLocaleString('zh-CN')}`);

    setTimeout(async () => {
      await runResourceCleanup();
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

async function runResourceCleanup() {
  const jobName = 'resource-cleanup';
  const status = jobStatuses.get(jobName);

  if (status) {
    status.isRunning = true;
  }

  logger.info('[Cron] 开始执行资源清理任务...');

  try {
    const report = await resourceCleanupService.runDailyCleanup();

    logger.info(`[Cron] 资源清理完成:`, {
      扫描: report.scanned,
      保护: report.protected,
      归档: report.archived,
      清理: report.purged,
      回收空间: `${(report.spaceReclaimed / 1024 / 1024).toFixed(2)} MB`,
      错误: report.errors.length
    });

    if (report.errors.length > 0) {
      logger.error('[Cron] 清理过程中的错误:', report.errors);
    }

    if (status) {
      status.lastRun = new Date();
    }

    return report;
  } catch (error) {
    logger.error('[Cron] 资源清理任务失败:', error);
    throw error;
  } finally {
    if (status) {
      status.isRunning = false;
    }
  }
}

// ============================================================
// 导出
// ============================================================

export default {
  startScheduledJobs,
  getJobStatuses,
  triggerResourceCleanup
};