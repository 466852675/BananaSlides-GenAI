import { OrderStatus, RefundStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { RefundProcessorService } from './refund-processor.service';

export interface RefundApplyDTO {
    orderId: string;
    reason: string;
    description?: string;
}

export interface RefundAuditDTO {
    approved: boolean;
    remark?: string;
}

export interface RefundListFilters {
    userId?: string;
    status?: RefundStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
}

export interface Pagination {
    page: number;
    limit: number;
}

export interface RefundEligibilityResult {
    eligible: boolean;
    reason?: string;
    code: string;
    order?: {
        id: string;
        orderNo: string;
        productName: string;
        finalPrice: number;
        createdAt: Date;
        paidAt?: Date | null;
    };
}

export interface RefundDetail {
    id: string;
    refundNo: string;
    amount: number;
    status: RefundStatus;
    reason: string;
    description?: string | null;
    remark?: string | null;
    createdAt: Date;
    processedAt?: Date | null;
    completedAt?: Date | null;
    order: {
        id: string;
        orderNo: string;
        productName: string;
        finalPrice: number;
    };
}

export async function checkRefundEligibility(
    userId: string,
    orderId: string
): Promise<RefundEligibilityResult> {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                },
            },
        },
    });

    if (!order) {
        return {
            eligible: false,
            code: 'ORDER_NOT_FOUND',
            reason: '订单不存在',
        };
    }

    if (order.userId !== userId) {
        return {
            eligible: false,
            code: 'ORDER_NOT_BELONG_TO_USER',
            reason: '订单不属于当前用户',
        };
    }

    if (order.status !== OrderStatus.PAID) {
        return {
            eligible: false,
            code: 'ORDER_NOT_PAID',
            reason: '订单未支付或已处理',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    const now = new Date();
    const paidAt = order.paidAt || order.createdAt;
    const daysSincePaid = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSincePaid > 7) {
        return {
            eligible: false,
            code: 'REFUND_PERIOD_EXPIRED',
            reason: '已超过7天退款期限',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    const existingRefund = await prisma.refundRequest.findFirst({
        where: {
            orderId,
            status: {
                notIn: [RefundStatus.REJECTED, RefundStatus.FAILED],
            },
        },
    });

    if (existingRefund) {
        return {
            eligible: false,
            code: 'REFUND_ALREADY_REQUESTED',
            reason: '该订单已申请过退款',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    const projectCount = await prisma.project.count({
        where: {
            userId,
            createdAt: {
                gte: order.createdAt,
            },
        },
    });

    if (projectCount > 0) {
        return {
            eligible: false,
            code: 'SERVICE_ALREADY_USED',
            reason: '您已创建项目，不符合退款条件。退款仅适用于未使用服务的情况。',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    if (order.fulfillmentAt) {
        return {
            eligible: false,
            code: 'SERVICE_ALREADY_DELIVERED',
            reason: '服务已交付使用，不符合退款条件',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    const userStats = await prisma.userRefundStats.findUnique({
        where: { userId },
    });

    if (userStats && userStats.riskScore >= 80) {
        return {
            eligible: false,
            code: 'USER_REFUND_RISK_HIGH',
            reason: '账户退款风险较高，请联系客服处理',
            order: {
                id: order.id,
                orderNo: order.orderNo,
                productName: order.productName,
                finalPrice: order.finalPrice,
                createdAt: order.createdAt,
                paidAt: order.paidAt,
            },
        };
    }

    return {
        eligible: true,
        code: 'ELIGIBLE',
        reason: '符合退款条件',
        order: {
            id: order.id,
            orderNo: order.orderNo,
            productName: order.productName,
            finalPrice: order.finalPrice,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
        },
    };
}

export async function applyRefund(
    userId: string,
    dto: RefundApplyDTO
): Promise<{ success: boolean; code: string; message: string; refundId?: string; autoApproved?: boolean }> {
    const { orderId, reason, description } = dto;

    const eligibility = await checkRefundEligibility(userId, orderId);
    if (!eligibility.eligible) {
        return {
            success: false,
            code: eligibility.code,
            message: eligibility.reason || '不符合退款条件',
        };
    }

    const refundNo = generateRefundNo();
    const orderAmount = eligibility.order!.finalPrice;

    try {
        const refund = await prisma.$transaction(async (tx) => {
            await tx.userRefundStats.upsert({
                where: { userId },
                create: {
                    userId,
                    totalRequests: 1,
                    lastRequestAt: new Date(),
                },
                update: {
                    totalRequests: { increment: 1 },
                    lastRequestAt: new Date(),
                },
            });

            const createdRefund = await tx.refundRequest.create({
                data: {
                    refundNo,
                    userId,
                    orderId,
                    amount: orderAmount,
                    status: RefundStatus.PENDING,
                    reason,
                    description,
                },
            });

            return createdRefund;
        });

        let message = '退款申请已提交，请等待审核';
        let autoApproved = false;

        const autoApprovalCheck = await checkAutoApprovalEligibility(userId, orderAmount);

        if (autoApprovalCheck.canAutoApprove) {
            console.log('[RefundService] 用户符合自动审批条件，自动处理退款:', refund.refundNo);
            const autoAuditResult = await auditRefund(refund.id, 'SYSTEM_AUTO', { approved: true, remark: '系统自动审批（低风险用户）' });

            if (autoAuditResult.success) {
                message = '退款申请已提交并自动通过，退款将在1-3个工作日内到账';
                autoApproved = true;
            } else {
                console.error('[RefundService] 自动审批失败:', autoAuditResult.message);
                message = '退款申请已提交，自动处理失败，已转人工审核';
            }
        }

        return {
            success: true,
            code: 'SUCCESS',
            message,
            refundId: refund.id,
            autoApproved,
        };
    } catch (error) {
        console.error('[RefundService] 创建退款申请失败:', error);
        return {
            success: false,
            code: 'SYSTEM_ERROR',
            message: '系统错误，请稍后重试',
        };
    }
}

export async function getRefundById(refundId: string, userId?: string) {
    const where: Prisma.RefundRequestWhereUniqueInput = { id: refundId };

    const refund = await prisma.refundRequest.findUnique({
        where,
        include: {
            order: {
                select: {
                    id: true,
                    orderNo: true,
                    productName: true,
                    finalPrice: true,
                    status: true,
                    paidAt: true,
                },
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                },
            },
        },
    });

    if (!refund) {
        return null;
    }

    if (userId && refund.userId !== userId) {
        return null;
    }

    return refund;
}

export async function getMyRefunds(
    userId: string,
    pagination: Pagination
): Promise<{ items: RefundDetail[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page, limit } = pagination;

    const [items, total] = await Promise.all([
        prisma.refundRequest.findMany({
            where: { userId },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNo: true,
                        productName: true,
                        finalPrice: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.refundRequest.count({ where: { userId } }),
    ]);

    return {
        items: items.map(item => ({
            id: item.id,
            refundNo: item.refundNo,
            amount: item.amount,
            status: item.status,
            reason: item.reason,
            description: item.description,
            remark: item.remark,
            createdAt: item.createdAt,
            processedAt: item.processedAt,
            completedAt: item.completedAt,
            order: item.order,
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function listRefunds(
    filters: RefundListFilters,
    pagination: Pagination
) {
    const { userId, status, keyword, startDate, endDate } = filters;
    const { page, limit } = pagination;

    const andConditions: Prisma.RefundRequestWhereInput[] = [];

    if (userId) {
        andConditions.push({ userId });
    }

    if (status) {
        andConditions.push({ status });
    }

    if (keyword) {
        andConditions.push({
            OR: [
                { refundNo: { contains: keyword } },
                { reason: { contains: keyword } },
                { order: { orderNo: { contains: keyword } } },
                { user: { email: { contains: keyword } } },
            ],
        });
    }

    if (startDate || endDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        andConditions.push({ createdAt: dateFilter });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await Promise.all([
        prisma.refundRequest.findMany({
            where,
            include: {
                order: {
                    select: {
                        id: true,
                        orderNo: true,
                        productName: true,
                        finalPrice: true,
                        status: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        nickname: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.refundRequest.count({ where }),
    ]);

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

export interface AutoApprovalResult {
    canAutoApprove: boolean;
    reason?: string;
    riskFactors: string[];
}

export async function checkAutoApprovalEligibility(
    userId: string,
    orderAmount: number
): Promise<AutoApprovalResult> {
    const riskFactors: string[] = [];

    // 1. 获取用户退款统计
    const userStats = await prisma.userRefundStats.findUnique({
        where: { userId },
    });

    // 2. 获取用户信息
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            createdAt: true,
            riskScore: true,
        },
    });

    if (!user) {
        return {
            canAutoApprove: false,
            reason: '用户不存在',
            riskFactors: ['用户不存在'],
        };
    }

    // 3. 检查账户年龄（>30天）
    const accountAge = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAge < 30) {
        riskFactors.push(`账户年龄不足30天（${Math.floor(accountAge)}天）`);
    }

    // 4. 检查退款次数（<2次）
    const totalRefunds = userStats?.totalRequests || 0;
    if (totalRefunds >= 2) {
        riskFactors.push(`退款次数过多（${totalRefunds}次）`);
    }

    // 5. 检查退款成功率（>90%）
    const approvedCount = userStats?.approvedCount || 0;
    const rejectedCount = userStats?.rejectedCount || 0;
    const successRate = totalRefunds > 0 ? approvedCount / totalRefunds : 1;
    if (successRate < 0.9) {
        riskFactors.push(`退款成功率过低（${(successRate * 100).toFixed(1)}%）`);
    }

    // 6. 检查订单金额（<¥100）
    if (orderAmount >= 100) {
        riskFactors.push(`订单金额过高（¥${orderAmount.toFixed(2)}）`);
    }

    // 7. 检查用户风险评分（<50）
    if (user.riskScore >= 50) {
        riskFactors.push(`用户风险评分过高（${user.riskScore}）`);
    }

    // 低风险用户：无风险因素
    if (riskFactors.length === 0) {
        return {
            canAutoApprove: true,
            riskFactors: [],
        };
    }

    // 中等风险：有1个风险因素，仍可自动审批
    if (riskFactors.length === 1 && !riskFactors.some(r => r.includes('成功率') || r.includes('风险评分'))) {
        return {
            canAutoApprove: true,
            reason: '存在1个低风险因素，但仍在自动审批范围内',
            riskFactors,
        };
    }

    // 高风险：需要人工审核
    return {
        canAutoApprove: false,
        reason: `存在${riskFactors.length}个风险因素，需要人工审核`,
        riskFactors,
    };
}

export async function auditRefund(
    refundId: string,
    adminId: string,
    dto: RefundAuditDTO
): Promise<{ success: boolean; code: string; message: string }> {
    const { approved, remark } = dto;

    const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: {
            order: {
                select: {
                    id: true,
                    orderNo: true,
                    finalPrice: true,
                    paymentMethod: true,
                    paymentNo: true,
                },
            },
        },
    });

    if (!refund) {
        return {
            success: false,
            code: 'REFUND_NOT_FOUND',
            message: '退款申请不存在',
        };
    }

    if (refund.status !== RefundStatus.PENDING) {
        return {
            success: false,
            code: 'INVALID_STATUS',
            message: '退款申请状态不正确',
        };
    }

    try {
        if (approved) {
            // 审核通过，更新状态为处理中
            await prisma.$transaction(async (tx) => {
                await tx.refundRequest.update({
                    where: { id: refundId },
                    data: {
                        status: RefundStatus.PROCESSING,
                        processedAt: new Date(),
                        processedBy: adminId,
                        remark,
                    },
                });

                await tx.userRefundStats.update({
                    where: { userId: refund.userId },
                    data: {
                        approvedCount: { increment: 1 },
                    },
                });
            });

            // 异步调用支付平台处理退款
            const paymentMethod = (refund.order?.paymentMethod as 'wechat' | 'alipay') || 'wechat';
            const processResult = await RefundProcessorService.processRefund({
                refundId: refund.id,
                userId: refund.userId,
                orderId: refund.orderId,
                orderNo: refund.order?.orderNo || '',
                refundNo: refund.refundNo,
                amount: refund.amount,
                reason: refund.reason,
                paymentMethod: paymentMethod,
                paymentNo: refund.order?.paymentNo || undefined,
            });

            if (processResult.success) {
                // 退款处理成功，完成退款流程
                await completeRefund(refundId, processResult.transactionId);
                return {
                    success: true,
                    code: 'SUCCESS',
                    message: '退款已批准并处理完成',
                };
            } else {
                // 支付平台处理失败，标记为失败状态
                await prisma.refundRequest.update({
                    where: { id: refundId },
                    data: {
                        status: RefundStatus.FAILED,
                        remark: `${remark || ''} [支付失败: ${processResult.message}]`,
                    },
                });

                return {
                    success: false,
                    code: processResult.code,
                    message: `退款审核通过，但支付处理失败: ${processResult.message}`,
                };
            }
        } else {
            // 审核拒绝
            await prisma.$transaction(async (tx) => {
                await tx.refundRequest.update({
                    where: { id: refundId },
                    data: {
                        status: RefundStatus.REJECTED,
                        processedAt: new Date(),
                        processedBy: adminId,
                        remark,
                    },
                });

                await tx.userRefundStats.update({
                    where: { userId: refund.userId },
                    data: {
                        rejectedCount: { increment: 1 },
                    },
                });
            });

            return {
                success: true,
                code: 'SUCCESS',
                message: '退款已拒绝',
            };
        }
    } catch (error) {
        console.error('[RefundService] 审核退款失败:', error);
        return {
            success: false,
            code: 'SYSTEM_ERROR',
            message: '系统错误，请稍后重试',
        };
    }
}

export async function completeRefund(
    refundId: string,
    transactionId?: string
): Promise<{ success: boolean; code: string; message: string }> {
    try {
        await prisma.$transaction(async (tx) => {
            const refund = await tx.refundRequest.findUnique({
                where: { id: refundId },
            });

            if (!refund) {
                throw new Error('退款申请不存在');
            }

            if (refund.status !== RefundStatus.PROCESSING && refund.status !== RefundStatus.PENDING) {
                throw new Error('退款状态不正确');
            }

            await tx.refundRequest.update({
                where: { id: refundId },
                data: {
                    status: RefundStatus.COMPLETED,
                    completedAt: new Date(),
                    transactionId,
                },
            });

            await tx.order.update({
                where: { id: refund.orderId },
                data: {
                    status: OrderStatus.REFUNDED,
                    refundedAt: new Date(),
                },
            });

            await revokeUserBenefits(tx, refund.userId, refund.orderId, refund.id);
        });

        return {
            success: true,
            code: 'SUCCESS',
            message: '退款已完成',
        };
    } catch (error: any) {
        console.error('[RefundService] 完成退款失败:', error);
        return {
            success: false,
            code: 'SYSTEM_ERROR',
            message: error.message || '系统错误',
        };
    }
}

async function revokeUserBenefits(
    tx: Prisma.TransactionClient,
    userId: string,
    orderId: string,
    refundId: string
) {
    const order = await tx.order.findUnique({
        where: { id: orderId },
    });

    if (!order) return;

    if (order.productType === 'points') {
        const user = await tx.user.findUnique({
            where: { id: userId },
        });

        if (user) {
            const pointsToDeduct = order.quantity;
            const newPoints = Math.max(0, user.points - pointsToDeduct);

            await tx.user.update({
                where: { id: userId },
                data: { points: newPoints },
            });

            await tx.transaction.create({
                data: {
                    userId,
                    type: 'refund_revoke',
                    amount: -pointsToDeduct,
                    balance: newPoints,
                    orderId,
                    description: `退款撤销积分: ${order.productName}`,
                },
            });
        }
    }

    await tx.benefitRevokeLog.create({
        data: {
            userId,
            refundId,
            reason: `订单退款: ${order.productName}`,
        },
    });
}

function generateRefundNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RFD${dateStr}${random}`;
}

export async function getRefundStats() {
    const [
        totalRequests,
        pendingCount,
        processingCount,
        completedCount,
        rejectedCount,
        totalAmount,
    ] = await Promise.all([
        prisma.refundRequest.count(),
        prisma.refundRequest.count({ where: { status: RefundStatus.PENDING } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.PROCESSING } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.COMPLETED } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.REJECTED } }),
        prisma.refundRequest.aggregate({
            where: { status: RefundStatus.COMPLETED },
            _sum: { amount: true },
        }),
    ]);

    return {
        totalRequests,
        pendingCount,
        processingCount,
        completedCount,
        rejectedCount,
        totalRefundAmount: totalAmount._sum.amount || 0,
    };
}
