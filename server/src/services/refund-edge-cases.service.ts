import { RefundStatus, RefundStatusType } from '../types/user.types';
import { prisma } from '../db';
import { RefundExceptionService, ExceptionType } from './refund-exception.service';

/**
 * 边界Case类型
 */
export enum EdgeCaseType {
    CONCURRENT_APPLICATION = 'CONCURRENT_APPLICATION',
    LARGE_AMOUNT_SECOND_REVIEW = 'LARGE_AMOUNT_SECOND_REVIEW',
    USER_DEACTIVATED = 'USER_DEACTIVATED',
    PAYMENT_METHOD_OFFLINE = 'PAYMENT_METHOD_OFFLINE',
    IMMEDIATE_REPURCHASE = 'IMMEDIATE_REPURCHASE',
    HIGH_FREQUENCY_REFUND = 'HIGH_FREQUENCY_REFUND',
    SUSPICIOUS_ACCOUNT = 'SUSPICIOUS_ACCOUNT',
    ORDER_MISMATCH = 'ORDER_MISMATCH',
}

/**
 * 大额阈值（元）
 */
const LARGE_AMOUNT_THRESHOLD = 500;

/**
 * 高频阈值（最近30天内申请次数）
 */
const HIGH_FREQUENCY_THRESHOLD = 3;

/**
 * 复购检测时间窗口（小时）
 */
const REPURCHASE_WINDOW_HOURS = 24;

/**
 * 退款边界Case处理服务
 * 
 * 覆盖Case:
 * 1. 并发申请防护
 * 2. 大额退款二级审核
 * 3. 用户已注销处理
 * 4. 支付方式下线处理
 * 5. 立即复购检测
 */
export class RefundEdgeCasesService {

    /**
     * 检查所有边界Case
     */
    static async checkAllEdgeCases(params: {
        userId: string;
        orderId: string;
        amount: number;
    }): Promise<{
        passed: boolean;
        caseType?: EdgeCaseType;
        message: string;
        requireAction?: 'block' | 'second_review' | 'manual_review' | 'warn';
    }> {
        const checks = await Promise.all([
            this.checkConcurrentApplication(params.userId, params.orderId),
            this.checkLargeAmount(params.amount),
            this.checkUserStatus(params.userId),
            this.checkHighFrequency(params.userId),
            this.checkImmediateRepurchase(params.userId),
            this.checkOrderValidity(params.orderId),
        ]);

        for (const check of checks) {
            if (!check.passed) {
                return check;
            }
        }

        return { passed: true, message: '所有边界检查通过' };
    }

    /**
     * Case 1: 并发申请防护
     * 防止用户同时提交多个退款申请
     */
    static async checkConcurrentApplication(
        userId: string,
        orderId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'block' }> {
        const pendingRefund = await prisma.refundRequest.findFirst({
            where: {
                userId,
                status: { in: [RefundStatus.PENDING, RefundStatus.PENDING_SECOND, RefundStatus.PROCESSING] }
            }
        });

        if (pendingRefund && pendingRefund.orderId !== orderId) {
            return {
                passed: false,
                message: '您有另一笔退款申请正在处理中，请等待完成后再申请',
                requireAction: 'block'
            };
        }

        if (pendingRefund && pendingRefund.orderId === orderId) {
            return {
                passed: false,
                message: '该订单已有退款申请正在处理中，请勿重复提交',
                requireAction: 'block'
            };
        }

        return { passed: true, message: '无并发申请' };
    }

    /**
     * Case 2: 大额退款二级审核
     * 超过阈值的退款需要二级审核
     */
    static async checkLargeAmount(
        amount: number
    ): Promise<{ passed: boolean; message: string; requireAction?: 'second_review' }> {
        if (amount >= LARGE_AMOUNT_THRESHOLD) {
            return {
                passed: false,
                message: `退款金额超过 ¥${LARGE_AMOUNT_THRESHOLD}，需要二级审核`,
                requireAction: 'second_review'
            };
        }

        return { passed: true, message: '金额在自动审核范围内' };
    }

    /**
     * 检查是否需要二级审核
     */
    static async requiresSecondReview(refundId: string): Promise<boolean> {
        const refund = await prisma.refundRequest.findUnique({
            where: { id: refundId },
            select: { amount: true, status: true }
        });

        if (!refund) return false;

        return refund.amount >= LARGE_AMOUNT_THRESHOLD && 
               refund.status === RefundStatus.PENDING;
    }

    /**
     * Case 3: 用户已注销/禁用处理
     */
    static async checkUserStatus(
        userId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'manual_review' | 'block' }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { status: true, riskScore: true }
        });

        if (!user) {
            return {
                passed: false,
                message: '用户不存在',
                requireAction: 'block'
            };
        }

        if (user.status === 'DISABLED') {
            return {
                passed: false,
                message: '用户账号已被禁用，退款申请需要人工审核',
                requireAction: 'manual_review'
            };
        }

        // 高风险用户
        if (user.riskScore > 70) {
            return {
                passed: false,
                message: '账号存在异常，退款申请需要人工审核',
                requireAction: 'manual_review'
            };
        }

        return { passed: true, message: '用户状态正常' };
    }

    /**
     * Case 4: 支付方式下线处理
     */
    static async checkPaymentMethodStatus(
        orderId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'manual_review' }> {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { paymentMethod: true }
        });

        if (!order) {
            return {
                passed: false,
                message: '订单不存在',
                requireAction: 'manual_review'
            };
        }

        // 检查支付方式是否支持退款
        const supportedMethods = ['wechat', 'alipay'];
        if (!supportedMethods.includes(order.paymentMethod || '')) {
            return {
                passed: false,
                message: `支付方式 ${order.paymentMethod} 暂不支持自动退款，需要人工处理`,
                requireAction: 'manual_review'
            };
        }

        return { passed: true, message: '支付方式支持退款' };
    }

    /**
     * Case 5: 立即复购检测
     * 检测用户是否在退款后短时间内再次购买
     */
    static async checkImmediateRepurchase(
        userId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'warn' | 'manual_review' }> {
        // 获取用户最近的退款记录
        const recentRefund = await prisma.refundRequest.findFirst({
            where: {
                userId,
                status: RefundStatus.COMPLETED,
                completedAt: { not: null }
            },
            orderBy: { completedAt: 'desc' }
        });

        if (!recentRefund || !recentRefund.completedAt) {
            return { passed: true, message: '无近期退款记录' };
        }

        // 检查是否在复购窗口期内有新订单
        const windowStart = new Date(recentRefund.completedAt);
        const recentOrder = await prisma.order.findFirst({
            where: {
                userId,
                createdAt: { gte: windowStart },
                status: 'PAID'
            }
        });

        if (recentOrder) {
            const hoursSinceRefund = (Date.now() - windowStart.getTime()) / (1000 * 60 * 60);
            if (hoursSinceRefund <= REPURCHASE_WINDOW_HOURS) {
                return {
                    passed: false,
                    message: `检测到退款后${Math.round(hoursSinceRefund)}小时内有新订单，可能存在恶意退款行为`,
                    requireAction: 'manual_review'
                };
            }
        }

        return { passed: true, message: '无立即复购行为' };
    }

    /**
     * Case 6: 高频退款检测
     */
    static async checkHighFrequency(
        userId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'warn' | 'manual_review' }> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const refundCount = await prisma.refundRequest.count({
            where: {
                userId,
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        if (refundCount >= HIGH_FREQUENCY_THRESHOLD) {
            return {
                passed: false,
                message: `30天内已有 ${refundCount} 笔退款申请，超过阈值 ${HIGH_FREQUENCY_THRESHOLD}`,
                requireAction: 'manual_review'
            };
        }

        if (refundCount >= HIGH_FREQUENCY_THRESHOLD - 1) {
            return {
                passed: true,
                message: `警告：30天内已有 ${refundCount} 笔退款申请`,
                requireAction: 'warn'
            };
        }

        return { passed: true, message: '退款频率正常' };
    }

    /**
     * Case 7: 订单有效性检查
     */
    static async checkOrderValidity(
        orderId: string
    ): Promise<{ passed: boolean; message: string; requireAction?: 'block' }> {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { 
                status: true, 
                finalPrice: true,
                paidAt: true
            }
        });

        if (!order) {
            return {
                passed: false,
                message: '订单不存在',
                requireAction: 'block'
            };
        }

        if (order.status !== 'PAID') {
            return {
                passed: false,
                message: '订单未支付，无法退款',
                requireAction: 'block'
            };
        }

        if (!order.paidAt) {
            return {
                passed: false,
                message: '订单支付信息异常',
                requireAction: 'block'
            };
        }

        return { passed: true, message: '订单有效' };
    }

    /**
     * 处理边界Case
     */
    static async handleEdgeCase(
        refundId: string,
        caseType: EdgeCaseType,
        requireAction: 'block' | 'second_review' | 'manual_review' | 'warn'
    ): Promise<{
        handled: boolean;
        newStatus?: RefundStatusType;
        message: string;
    }> {
        switch (requireAction) {
            case 'block':
                return {
                    handled: true,
                    message: '退款申请已被阻止'
                };

            case 'second_review':
                await prisma.refundRequest.update({
                    where: { id: refundId },
                    data: { status: RefundStatus.PENDING_SECOND }
                });
                return {
                    handled: true,
                    newStatus: RefundStatus.PENDING_SECOND,
                    message: '已标记为二级审核'
                };

            case 'manual_review':
                await RefundExceptionService.markForManualHandling(
                    refundId, 
                    `边界Case: ${caseType}`
                );
                return {
                    handled: true,
                    newStatus: RefundStatus.MANUAL_REQUIRED,
                    message: '已标记为人工审核'
                };

            case 'warn':
                // 仅记录警告，不阻止流程
                console.log(`[RefundEdgeCases] Warning for refund ${refundId}: ${caseType}`);
                return {
                    handled: true,
                    message: '已通过（有警告）'
                };

            default:
                return {
                    handled: false,
                    message: '未知的处理动作'
                };
        }
    }

    /**
     * 获取用户的退款统计
     */
    static async getUserRefundStats(userId: string): Promise<{
        totalRequests: number;
        approvedCount: number;
        rejectedCount: number;
        successRate: number;
        recent30Days: number;
    }> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [total, approved, rejected, recent] = await Promise.all([
            prisma.refundRequest.count({ where: { userId } }),
            prisma.refundRequest.count({ where: { userId, status: RefundStatus.COMPLETED } }),
            prisma.refundRequest.count({ where: { userId, status: RefundStatus.REJECTED } }),
            prisma.refundRequest.count({ 
                where: { 
                    userId, 
                    createdAt: { gte: thirtyDaysAgo }
                } 
            })
        ]);

        const successRate = total > 0 ? (approved / total) * 100 : 0;

        return {
            totalRequests: total,
            approvedCount: approved,
            rejectedCount: rejected,
            successRate: Math.round(successRate * 100) / 100,
            recent30Days: recent
        };
    }
}
