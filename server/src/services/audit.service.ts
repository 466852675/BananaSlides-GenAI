import { prisma } from '../db';

export interface AuditLogEntry {
  userId?: string;
  type: 'CONTENT_VIOLATION' | 'PROMPT_INJECTION' | 'RATE_LIMIT' | 'SUSPICIOUS_ACTIVITY';
  content?: string;
  reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
  ip?: string;
}

export class AuditService {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          type: entry.type,
          content: entry.content?.substring(0, 1000),
          reason: entry.reason,
          severity: entry.severity,
          metadata: JSON.stringify(entry.metadata || {}),
          ip: entry.ip,
          createdAt: new Date(),
        },
      });

      if (entry.severity === 'critical') {
        console.error(`[AUDIT] CRITICAL: ${entry.type} from user ${entry.userId}`);
      }
    } catch (error) {
      console.error('[Audit] Failed to log audit entry:', error);
    }
  }

  static async queryRecentViolations(
    hours: number = 24,
    severity?: AuditLogEntry['severity']
  ): Promise<any[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    return await prisma.auditLog.findMany({
      where: {
        type: 'CONTENT_VIOLATION',
        severity,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

export const auditService = new AuditService();
