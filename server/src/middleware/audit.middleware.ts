import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

/**
 * 操作日志中间件
 * 自动记录管理员的操作行为
 */

interface OperationLogData {
    module: string;
    action: string;
    targetType: string;
    targetId?: string;
    description: string;
    beforeValue?: any;
    afterValue?: any;
    changes?: string;
}

/**
 * 操作审计中间件工厂
 * 用于自动记录HTTP请求的操作日志
 */
export function operationAuditMiddleware(module: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // 只记录管理员操作
        if (!req.user || !['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
            return next();
        }

        // 记录原始send方法
        const originalSend = res.send.bind(res);
        const startTime = Date.now();

        // 捕获请求信息
        const requestInfo = {
            method: req.method,
            path: req.path,
            params: req.params,
            body: sanitizeBody(req.body),
            query: req.query
        };

        // 重写send方法以捕获响应
        res.send = function(body: any) {
            // 异步记录日志，不阻塞响应
            recordOperation(req, res, module, requestInfo, body, Date.now() - startTime)
                .catch(err => console.error('[OperationAudit] 记录失败:', err));

            return originalSend(body);
        };

        next();
    };
}

/**
 * 手动记录操作日志
 * 用于在业务逻辑中精确记录操作详情
 */
export async function logOperation(
    req: Request,
    data: OperationLogData,
    success: boolean = true,
    errorMessage?: string
): Promise<void> {
    if (!req.user) return;

    try {
        await prisma.operationLog.create({
            data: {
                operatorId: req.user.id,
                operatorRole: req.user.role,
                module: data.module,
                action: data.action,
                targetType: data.targetType,
                targetId: data.targetId || '',
                description: data.description,
                beforeValue: data.beforeValue ? JSON.stringify(data.beforeValue) : null,
                afterValue: data.afterValue ? JSON.stringify(data.afterValue) : null,
                changes: data.changes,
                ip: req.ip || '',
                userAgent: req.headers['user-agent'] || null,
                success,
                errorMessage
            }
        });
    } catch (error) {
        console.error('[OperationAudit] 记录操作日志失败:', error);
    }
}

/**
 * 内部函数：记录操作到数据库
 */
async function recordOperation(
    req: Request,
    res: Response,
    module: string,
    requestInfo: any,
    responseBody: any,
    duration: number
): Promise<void> {
    if (!req.user) return;

    const isSuccess = res.statusCode < 400;
    const action = detectAction(req);
    const targetInfo = extractTargetInfo(req);

    try {
        await prisma.operationLog.create({
            data: {
                operatorId: req.user.id,
                operatorRole: req.user.role,
                module,
                action,
                targetType: targetInfo.type,
                targetId: targetInfo.id || '',
                description: generateDescription(req, action, targetInfo),
                beforeValue: null, // 自动记录无法获取beforeValue
                afterValue: isSuccess ? JSON.stringify(sanitizeBody(req.body)) : null,
                changes: null,
                ip: req.ip || '',
                userAgent: req.headers['user-agent'] || null,
                success: isSuccess,
                errorMessage: isSuccess ? null : extractErrorMessage(responseBody)
            }
        });

        // 记录到控制台（开发调试）
        if (process.env.NODE_ENV === 'development') {
            console.log(`[OperationAudit] ${req.user.role} ${req.user.id} ${action} ${module}/${targetInfo.type} ${isSuccess ? '成功' : '失败'} ${duration}ms`);
        }
    } catch (error) {
        console.error('[OperationAudit] 保存操作日志失败:', error);
    }
}

/**
 * 检测操作类型
 */
function detectAction(req: Request): string {
    const method = req.method;
    const path = req.path;

    if (method === 'POST') return 'create';
    if (method === 'PUT' || method === 'PATCH') return 'update';
    if (method === 'DELETE') return 'delete';
    if (path.includes('/activate')) return 'activate';
    if (path.includes('/audit')) return 'audit';
    if (path.includes('/reset')) return 'reset';

    return 'unknown';
}

/**
 * 提取目标信息
 */
function extractTargetInfo(req: Request): { type: string; id?: string } {
    const path = req.path;
    const params = req.params;

    // 从路径中提取ID
    if (params.id) {
        // 从路径推断类型
        const pathParts = path.split('/').filter(p => p);
        const type = pathParts[0] || 'unknown';
        return { type, id: params.id };
    }

    // 根据路径判断类型
    if (path.includes('users')) return { type: 'user', id: params.id };
    if (path.includes('orders')) return { type: 'order', id: params.id };
    if (path.includes('points-rules')) return { type: 'points-rule', id: params.id };
    if (path.includes('products')) return { type: 'product', id: params.id };
    if (path.includes('ai-engine')) return { type: 'ai-engine-rule', id: params.id };
    if (path.includes('refunds')) return { type: 'refund', id: params.id };
    if (path.includes('roles')) return { type: 'role' };

    return { type: 'unknown' };
}

/**
 * 生成操作描述
 */
function generateDescription(req: Request, action: string, targetInfo: { type: string; id?: string }): string {
    const typeNames: Record<string, string> = {
        'user': '用户',
        'order': '订单',
        'points-rule': '积分规则',
        'product': '商品',
        'ai-engine-rule': 'AI引擎规则',
        'refund': '退款申请',
        'role': '角色权限'
    };

    const actionNames: Record<string, string> = {
        'create': '创建',
        'update': '更新',
        'delete': '删除',
        'activate': '激活',
        'audit': '审核',
        'reset': '重置'
    };

    const typeName = typeNames[targetInfo.type] || targetInfo.type;
    const actionName = actionNames[action] || action;

    return `${actionName}${typeName}${targetInfo.id ? ` (ID: ${targetInfo.id})` : ''}`;
}

/**
 * 清理请求体（移除敏感信息）
 */
function sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'passwordHash', 'apiKey', 'secret', 'token'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '******';
        }
    }

    return sanitized;
}

/**
 * 提取错误信息
 */
function extractErrorMessage(body: any): string {
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return body.substring(0, 500);
        }
    }

    if (body?.error?.message) return body.error.message;
    if (body?.message) return body.message;
    if (body?.error) return String(body.error).substring(0, 500);

    return '未知错误';
}
