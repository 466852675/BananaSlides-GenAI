import { prisma } from '../db';
import { Request } from 'express';

export interface AuditLogEntry {
  userId?: string;
  type: string;
  content?: string;
  reason?: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  ip?: string;
}

export class AuditService {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const severity = entry.severity?.toLowerCase() as string;
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          type: entry.type,
          content: entry.content?.substring(0, 1000),
          reason: entry.reason,
          severity,
          metadata: JSON.stringify(entry.metadata || {}),
          ip: entry.ip,
          createdAt: new Date(),
        },
      });

      if (severity === 'critical') {
        console.error(`[AUDIT] CRITICAL: ${entry.type} from user ${entry.userId}`);
      }
    } catch (error) {
      console.error('[Audit] Failed to log audit entry:', error);
    }
  }

  /**
   * 查询审计日志（分页 + 多条件筛选）
   */
  static async queryLogs(params: {
    page?: number;
    limit?: number;
    type?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    keyword?: string;
  }): Promise<{ items: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 20, type, severity, startDate, endDate, keyword } = params;
    const where: any = {};

    if (type) {
      const types = type.split(',');
      if (types.length === 1) {
        where.type = { startsWith: types[0] };
      } else {
        where.type = {
          OR: types.map(t => ({ startsWith: t.trim() })),
        };
      }
    }

    if (severity) {
      where.severity = { in: [severity.toLowerCase(), severity.toUpperCase()] };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (keyword) {
      where.OR = [
        { content: { contains: keyword } },
        { reason: { contains: keyword } },
        { type: { contains: keyword } },
      ];
    }

    const [rawItems, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // 批量查询用户名：收集所有非空的 userId，一次性查 User 表
    const userIds = rawItems.map(i => i.userId).filter(Boolean) as string[];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, nickname: true, email: true },
        })
      : [];
    const userMap = new Map(users.map(u => [u.id, u.nickname || u.username || u.email]));

    const items = rawItems.map(item => ({
      ...item,
      userName: item.userId ? (userMap.get(item.userId) || item.userId.substring(0, 8)) : 'system',
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async queryRecentViolations(
    hours: number = 24,
    severity?: string
  ): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await prisma.auditLog.findMany({
      where: {
        type: 'CONTENT_VIOLATION',
        severity: severity?.toLowerCase(),
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export const auditService = new AuditService();

/**
 * Controller 层审计日志辅助函数
 * 自动从 req 对象获取 userId 和 IP
 */
export function auditLogger(
  req: Request,
  type: string,
  content: string,
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical' = 'info',
  metadata?: Record<string, any>
): void {
  AuditService.log({
    userId: (req as any).user?.id,
    type,
    content,
    severity,
    metadata,
    ip: req.ip || req.socket?.remoteAddress,
  });
}
