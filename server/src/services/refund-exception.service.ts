import { RefundStatus } from '@prisma/client';
import { prisma } from '../db';
import { RefundNotificationService } from './refund-notification.service';

/**
 * 异常类型枚举
 */
export enum ExceptionType {
    NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    ACCOUNT_FROZEN = 'ACCOUNT_FROZEN',
    PAYMENT_CHANNEL_ERROR = 'PAYMENT_CHANNEL_ERROR',
    INVALID_ORDER = 'INVALID_ORDER',
    DUPLICATE_REFUND = 'DUPLICATE_REFUND',
    USER_NOT_FOUND = 'USER_NOT_FOUND',
    AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
    UNKNOWN = 'UNKNOWN'
}

/**
 * 异常信息接口
 */
export interface ExceptionInfo {
    type: ExceptionType;
    message: string;
    isRetryable: boolean;
    suggestedAction: 'retry' | 'manual' | 'reject';
}

/**
 * 重试配置
 */
const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY_MS: 5 * 60 * 1000,      // 5分钟
    MAX_DELAY_MS: 60 * 60 * 1000,       // 1小时
    BACKOFF_MULTIPLIER: 2,
};

/**
 * 异常类型映射表
 */
const EXCEPTION_MAP: Record<string, ExceptionInfo> = {
    // 网络相关
    'NETWORK_ERROR': {
        type: ExceptionType.NETWORK_TIMEOUT,
        message: '网络连接超时',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    'TIMEOUT': {
        type: ExceptionType.NETWORK_TIMEOUT,
        message: '请求超时',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    'ECONNREFUSED': {
        type: ExceptionType.NETWORK_TIMEOUT,
        message: '连接被拒绝',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    'ETIMEDOUT': {
        type: ExceptionType.NETWORK_TIMEOUT,
        message: '连接超时',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    
    // 余额相关
    'INSUFFICIENT_BALANCE': {
        type: ExceptionType.INSUFFICIENT_BALANCE,
        message: '商户余额不足',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    'NOTENOUGH': {
        type: ExceptionType.INSUFFICIENT_BALANCE,
        message: '余额不足',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    
    // 账户相关
    'ACCOUNT_FROZEN': {
        type: ExceptionType.ACCOUNT_FROZEN,
        message: '账户已冻结',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    'FREQUENCY_LIMITED': {
        type: ExceptionType.ACCOUNT_FROZEN,
        message: '账户操作受限',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    'NOAUTH': {
        type: ExceptionType.ACCOUNT_FROZEN,
        message: '无权限操作',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    
    // 支付渠道相关
    'PAYMENT_CHANNEL_ERROR': {
        type: ExceptionType.PAYMENT_CHANNEL_ERROR,
        message: '支付渠道异常',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    'SYSTEMERROR': {
        type: ExceptionType.PAYMENT_CHANNEL_ERROR,
        message: '支付系统错误',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    'SERVICE_UNAVAILABLE': {
        type: ExceptionType.PAYMENT_CHANNEL_ERROR,
        message: '服务不可用',
        isRetryable: true,
        suggestedAction: 'retry'
    },
    
    // 订单相关
    'INVALID_ORDER': {
        type: ExceptionType.INVALID_ORDER,
        message: '订单无效',
        isRetryable: false,
        suggestedAction: 'reject'
    },
    'ORDERNOTEXIST': {
        type: ExceptionType.INVALID_ORDER,
        message: '订单不存在',
        isRetryable: false,
        suggestedAction: 'reject'
    },
    'ORDER_CLOSED': {
        type: ExceptionType.INVALID_ORDER,
        message: '订单已关闭',
        isRetryable: false,
        suggestedAction: 'reject'
    },
    
    // 重复退款
    'DUPLICATE_REFUND': {
        type: ExceptionType.DUPLICATE_REFUND,
        message: '重复退款',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    'TRADE_STATE_ERROR': {
        type: ExceptionType.DUPLICATE_REFUND,
        message: '交易状态异常',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    
    // 用户相关
    'USER_NOT_FOUND': {
        type: ExceptionType.USER_NOT_FOUND,
        message: '用户不存在',
        isRetryable: false,
        suggestedAction: 'reject'
    },
    
    // 金额相关
    'AMOUNT_MISMATCH': {
        type: ExceptionType.AMOUNT_MISMATCH,
        message: '退款金额不匹配',
        isRetryable: false,
        suggestedAction: 'manual'
    },
    'INVALID_FEE': {
        type: ExceptionType.AMOUNT_MISMATCH,
        message: '金额无效',
        isRetryable: false,
        suggestedAction: 'manual'
    },
};

/**
 * 退款异常处理服务
 * 
 * 职责:
 * 1. 异常分类和识别
 * 2. 自动重试机制（指数退避）
 * 3. 人工介入流程
 * 4. 告警通知
 */
export class RefundExceptionService {

    /**
     * 分类异常
     */
    static classifyException(error: any): ExceptionInfo {
        if (!error) {
            return {
                type: ExceptionType.UNKNOWN,
                message: '未知错误',
                isRetryable: false,
                suggestedAction: 'manual'
            };
        }

        const errorCode = error.code || error.errCode || error.message?.toUpperCase() || '';
        const message = error.message || error.errMsg || '';

        // 查找匹配的异常类型
        for (const [key, info] of Object.entries(EXCEPTION_MAP)) {
            if (errorCode.includes(key) || message.toUpperCase().includes(key)) {
                return info;
            }
        }

        // 根据关键词推断
        if (message.includes('timeout') || message.includes('超时')) {
            return EXCEPTION_MAP['TIMEOUT'];
        }
        if (message.includes('余额') || message.includes('balance')) {
            return EXCEPTION_MAP['INSUFFICIENT_BALANCE'];
        }
        if (message.includes('冻结') || message.includes('frozen')) {
            return EXCEPTION_MAP['ACCOUNT_FROZEN'];
        }

        // 默认返回未知异常
        return {
            type: ExceptionType.UNKNOWN,
            message: message || '处理失败',
            isRetryable: false,
            suggestedAction: 'manual'
        };
    }

    /**
     * 判断异常是否可重试
     */
    static isRetryable(exceptionType: ExceptionType): boolean {
        const retryableTypes = [
            ExceptionType.NETWORK_TIMEOUT,
            ExceptionType.PAYMENT_CHANNEL_ERROR,
        ];
        return retryableTypes.includes(exceptionType);
    }

    /**
     * 计算重试延迟（指数退避）
     */
    static calculateRetryDelay(retryCount: number): number {
        const delay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);
        return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
    }

    /**
     * 获取当前重试次数
     */
    static async getRetryCount(refundId: string): Promise<number> {
        const logs = await prisma.refundRetryLog.findMany({
            where: { refundId },
            orderBy: { createdAt: 'desc' }
        });
        return logs.length;
    }

    /**
     * 检查是否可以重试
     */
    static async canRetry(refundId: string): Promise<{ canRetry: boolean; reason?: string }> {
        const retryCount = await this.getRetryCount(refundId);
        
        if (retryCount >= RETRY_CONFIG.MAX_RETRIES) {
            return {
                canRetry: false,
                reason: `已达到最大重试次数 (${RETRY_CONFIG.MAX_RETRIES})`
            };
        }

        // 检查退款状态
        const refund = await prisma.refundRequest.findUnique({
            where: { id: refundId },
            select: { status: true }
        });

        if (!refund) {
            return { canRetry: false, reason: '退款记录不存在' };
        }

        if (refund.status === RefundStatus.COMPLETED) {
            return { canRetry: false, reason: '退款已完成' };
        }

        if (refund.status === RefundStatus.REJECTED) {
            return { canRetry: false, reason: '退款已被拒绝' };
        }

        return { canRetry: true };
    }

    /**
     * 安排重试
     */
    static async scheduleRetry(refundId: string, exceptionInfo?: ExceptionInfo): Promise<{
        scheduled: boolean;
        nextRetryAt?: Date;
        message: string;
    }> {
        // 获取或分析异常信息
        const exception = exceptionInfo || { type: ExceptionType.UNKNOWN, message: '未知异常', isRetryable: false, suggestedAction: 'manual' as const };
        
        // 检查是否可重试
        const { canRetry, reason } = await this.canRetry(refundId);
        
        if (!canRetry) {
            // 不能重试，检查是否需要人工处理
            if (exception.suggestedAction === 'manual') {
                await this.markForManualHandling(refundId, exception.message);
                return {
                    scheduled: false,
                    message: `无法重试: ${reason}，已标记为人工处理`
                };
            }
            
            return {
                scheduled: false,
                message: `无法重试: ${reason}`
            };
        }

        // 计算延迟
        const retryCount = await this.getRetryCount(refundId);
        const delayMs = this.calculateRetryDelay(retryCount);
        const scheduledAt = new Date(Date.now() + delayMs);

        // 记录重试计划
        await prisma.refundRetryLog.create({
            data: {
                refundId,
                retryCount: retryCount + 1,
                error: exception.message,
                scheduledAt,
                executedAt: null
            }
        });

        console.log(`[RefundException] Scheduled retry #${retryCount + 1} for refund ${refundId} at ${scheduledAt.toISOString()}`);

        return {
            scheduled: true,
            nextRetryAt: scheduledAt,
            message: `已安排第 ${retryCount + 1} 次重试，将在 ${Math.round(delayMs / 60000)} 分钟后执行`
        };
    }

    /**
     * 标记为人工处理
     */
    static async markForManualHandling(refundId: string, reason: string): Promise<void> {
        await prisma.refundRequest.update({
            where: { id: refundId },
            data: {
                status: RefundStatus.MANUAL_REQUIRED,
                exceptionType: ExceptionType[reason as keyof typeof ExceptionType] || reason,
                failReason: reason,
                requireManualAt: new Date()
            }
        });

        console.log(`[RefundException] Marked refund ${refundId} for manual handling: ${reason}`);

        // 发送告警
        await this.sendAlert(refundId, ExceptionType.UNKNOWN, reason);
    }

    /**
     * 发送告警通知
     */
    static async sendAlert(
        refundId: string,
        exceptionType: ExceptionType,
        message: string
    ): Promise<void> {
        try {
            // 获取退款详情
            const refund = await prisma.refundRequest.findUnique({
                where: { id: refundId },
                include: {
                    user: { select: { nickname: true, email: true } },
                    order: { select: { orderNo: true, finalPrice: true } }
                }
            });

            if (!refund) {
                console.error(`[RefundException] Cannot send alert: refund ${refundId} not found`);
                return;
            }

            // 发送管理员通知
            await RefundNotificationService.sendRefundExceptionAlert({
                refundId,
                refundNo: refund.refundNo,
                orderNo: refund.order?.orderNo || '',
                amount: refund.amount,
                userName: refund.user?.nickname || '未知用户',
                exceptionType,
                exceptionMessage: message,
                createdAt: refund.createdAt
            });

            console.log(`[RefundException] Alert sent for refund ${refundId}`);
        } catch (error) {
            console.error('[RefundException] Failed to send alert:', error);
        }
    }

    /**
     * 处理退款失败
     */
    static async handleRefundFailure(
        refundId: string,
        error: any
    ): Promise<{
        action: 'retry' | 'manual' | 'reject';
        message: string;
    }> {
        const exceptionInfo = this.classifyException(error);
        
        console.log(`[RefundException] Handling failure for refund ${refundId}:`, {
            type: exceptionInfo.type,
            message: exceptionInfo.message,
            suggestedAction: exceptionInfo.suggestedAction
        });

        // 记录失败日志
        await prisma.refundRequest.update({
            where: { id: refundId },
            data: {
                failReason: exceptionInfo.message,
                exceptionType: exceptionInfo.type
            }
        });

        switch (exceptionInfo.suggestedAction) {
            case 'retry':
                if (this.isRetryable(exceptionInfo.type)) {
                    const result = await this.scheduleRetry(refundId, exceptionInfo);
                    if (result.scheduled) {
                        return {
                            action: 'retry',
                            message: result.message
                        };
                    }
                    // 重试失败，转为人工处理
                    await this.markForManualHandling(refundId, exceptionInfo.message);
                    return {
                        action: 'manual',
                        message: '重试安排失败，已转为人工处理'
                    };
                }
                break;

            case 'reject':
                await prisma.refundRequest.update({
                    where: { id: refundId },
                    data: {
                        status: RefundStatus.REJECTED,
                        failReason: exceptionInfo.message
                    }
                });
                return {
                    action: 'reject',
                    message: `退款已拒绝: ${exceptionInfo.message}`
                };

            case 'manual':
            default:
                await this.markForManualHandling(refundId, exceptionInfo.message);
                return {
                    action: 'manual',
                    message: '已标记为人工处理'
                };
        }

        // 默认人工处理
        await this.markForManualHandling(refundId, exceptionInfo.message);
        return {
            action: 'manual',
            message: '已标记为人工处理'
        };
    }

    /**
     * 获取待重试的退款列表
     */
    static async getPendingRetries(): Promise<Array<{
        refundId: string;
        refundNo: string;
        scheduledAt: Date;
        retryCount: number;
    }>> {
        const now = new Date();
        
        const pendingLogs = await prisma.refundRetryLog.findMany({
            where: {
                executedAt: null,
                scheduledAt: { lte: now }
            },
            orderBy: { scheduledAt: 'asc' }
        });

        const results = [];
        for (const log of pendingLogs) {
            const refund = await prisma.refundRequest.findUnique({
                where: { id: log.refundId },
                select: { refundNo: true, status: true }
            });
            
            if (refund && refund.status !== RefundStatus.COMPLETED) {
                results.push({
                    refundId: log.refundId,
                    refundNo: refund.refundNo,
                    scheduledAt: log.scheduledAt,
                    retryCount: log.retryCount
                });
            }
        }

        return results;
    }

    /**
     * 获取需要人工处理的退款列表
     */
    static async getManualRequiredRefunds(): Promise<Array<{
        id: string;
        refundNo: string;
        amount: number;
        exceptionType: string | null;
        failReason: string | null;
        requireManualAt: Date | null;
        createdAt: Date;
    }>> {
        return prisma.refundRequest.findMany({
            where: {
                status: RefundStatus.MANUAL_REQUIRED
            },
            select: {
                id: true,
                refundNo: true,
                amount: true,
                exceptionType: true,
                failReason: true,
                requireManualAt: true,
                createdAt: true
            },
            orderBy: { requireManualAt: 'desc' }
        });
    }
}
