import { OrderStatus, RefundStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';
import { RefundProcessorService } from './refund-processor.service';
import { notifyAdminNewRefund } from './admin-notification.service';
import {
    sendRefundSubmittedMessage,
    sendRefundApprovedMessage,
    sendRefundRejectedMessage,
    sendRefundCompletedMessage,
    sendRefundFailedMessage,
} from './refund-notification.service';

export interface RefundApplyDTO {
    orderId: string;
    reason: string;
    description?: string;
}

export interface RefundAuditDTO {
    approved: boolean;
    remark?: string;
}

/**
 * 添加退款操作历史记录
 */
async function addRefundHistory(
    tx: Prisma.TransactionClient | any,
    refundId: string,
    action: 'SUBMIT' | 'AUTO_APPROVE' | 'APPROVE' | 'REJECT' | 'PROCESS' | 'COMPLETE' | 'FAIL',
    operator: string,
    note?: string
) {
    return await tx.refundHistory.create({
        data: {
            refundId,
            action,
            operator,
            note,
        },
    });
}

export interface RefundListFilters {
    userId?: string;
    status?: RefundStatus;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    paymentMethod?: string;
    hasNote?: boolean;
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
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

            // 记录用户提交申请日志
            await addRefundHistory(tx, createdRefund.id, 'SUBMIT', 'user', reason);

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

        // 通知管理员有新退款申请
        notifyAdminNewRefund({
            id: refund.id,
            refundNo: refund.refundNo,
            amount: refund.amount,
            reason: refund.reason,
            orderId: refund.orderId
        }).catch(err => console.error('[RefundNotify] 管理员通知发送失败:', err));

        // 通知用户退款申请已提交
        sendRefundSubmittedMessage({
            userId,
            refundId: refund.id,
            refundNo: refund.refundNo,
            orderNo: eligibility.order!.orderNo,
            amount: refund.amount,
            productName: eligibility.order!.productName,
            reason: refund.reason,
        }).catch(err => console.error('[RefundNotify] 用户提交通知发送失败:', err));

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

// ============================================================
// [智能决策座舱] 管理员退款详情聚合接口
// ============================================================

/**
 * 管理员退款详情聚合接口 - 智能决策座舱核心 API
 * 聚合返回：退款基础信息、用户画像、风险评估、消费历史、建议退款额
 */
export async function getAdminRefundDetailAggregated(refundId: string) {
    // 1. 获取退款基础信息
    const refund = await prisma.refundRequest.findUnique({
        where: { id: refundId },
        include: {
            order: {
                select: {
                    id: true,
                    orderNo: true,
                    productName: true,
                    productType: true,
                    finalPrice: true,
                    status: true,
                    paidAt: true,
                    createdAt: true,
                    quantity: true,
                },
            },
            user: {
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                    createdAt: true,
                    points: true,
                    pointsUsed: true,
                    vipLevel: true,
                    vipExpiresAt: true,
                    riskScore: true,
                },
            },
        },
    });

    if (!refund) {
        return null;
    }

    const userId = refund.userId;
    const orderId = refund.orderId;
    const orderPaidAt = refund.order.paidAt || refund.order.createdAt;

    // 2. 并行获取所有聚合数据
    const [
        userRefundStats,
        riskAssessment,
        consumptionHistory,
        projectsCreatedAfterOrder,
        last24hActivity,
    ] = await Promise.all([
        // 用户退款统计
        prisma.userRefundStats.findUnique({
            where: { userId },
        }),
        // 风险评估
        checkAutoApprovalEligibility(userId, refund.amount),
        // 订单支付后的消费历史
        prisma.transaction.findMany({
            where: {
                userId,
                type: 'consume',
                createdAt: { gte: orderPaidAt },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                amount: true,
                ruleCode: true,
                description: true,
                createdAt: true,
                projectId: true,
            },
        }),
        // 订单支付后创建的项目数
        prisma.project.count({
            where: {
                userId,
                createdAt: { gte: orderPaidAt },
            },
        }),
        // 退款申请前 24h 内的活动
        prisma.transaction.findMany({
            where: {
                userId,
                type: 'consume',
                createdAt: {
                    gte: new Date(refund.createdAt.getTime() - 24 * 60 * 60 * 1000),
                    lte: refund.createdAt,
                },
            },
            select: {
                id: true,
                amount: true,
                ruleCode: true,
                description: true,
                createdAt: true,
            },
        }),
    ]);

    // 3. 计算资产核销数据
    const totalConsumedPoints = consumptionHistory.reduce(
        (sum, tx) => sum + Math.abs(tx.amount),
        0
    );

    // 假设积分兑换率：10 积分 = ¥1 (可根据实际业务调整)
    const pointsToYuanRate = 0.1;
    const consumedValue = totalConsumedPoints * pointsToYuanRate;
    const suggestedRefundAmount = Math.max(0, refund.amount - consumedValue);

    // 4. 计算用户账户年龄
    const accountAgeDays = Math.floor(
        (Date.now() - refund.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // 5. 构建聚合响应
    return {
        // 基础退款信息
        refund: {
            id: refund.id,
            refundNo: refund.refundNo,
            amount: refund.amount,
            status: refund.status,
            reason: refund.reason,
            description: refund.description,
            remark: refund.remark,
            createdAt: refund.createdAt,
            processedAt: refund.processedAt,
            completedAt: refund.completedAt,
            processedBy: refund.processedBy,
        },

        // 订单信息
        order: refund.order,

        // 用户画像
        userProfile: {
            id: refund.user.id,
            email: refund.user.email,
            nickname: refund.user.nickname,
            accountAgeDays,
            currentPoints: refund.user.points,
            totalPointsUsed: refund.user.pointsUsed,
            vipLevel: refund.user.vipLevel,
            vipExpiresAt: refund.user.vipExpiresAt,
            riskScore: refund.user.riskScore,
        },

        // 退款历史统计
        refundHistory: {
            totalRequests: userRefundStats?.totalRequests || 0,
            approvedCount: userRefundStats?.approvedCount || 0,
            rejectedCount: userRefundStats?.rejectedCount || 0,
            userRiskScore: userRefundStats?.riskScore || 0,
            lastRequestAt: userRefundStats?.lastRequestAt,
        },

        // 风险雷达
        riskRadar: {
            canAutoApprove: riskAssessment.canAutoApprove,
            reason: riskAssessment.reason,
            riskFactors: riskAssessment.riskFactors,
            riskLevel: riskAssessment.riskFactors.length === 0
                ? 'LOW'
                : riskAssessment.riskFactors.length <= 2
                    ? 'MEDIUM'
                    : 'HIGH',
        },

        // 资产核销仪表盘
        equityAudit: {
            orderAmount: refund.order.finalPrice,
            // 积分授予量：基于订单数量计算（积分类产品数量即积分数）
            pointsGranted: refund.order.productType === 'points' ? refund.order.quantity : 0,
            totalConsumedPoints,
            consumedValue,
            suggestedRefundAmount,
            projectsCreatedAfterOrder,
        },

        // 行为特征溯源
        behaviorContext: {
            consumptionHistory: consumptionHistory.map(tx => ({
                id: tx.id,
                action: tx.ruleCode,
                description: tx.description,
                points: Math.abs(tx.amount),
                timestamp: tx.createdAt,
                projectId: tx.projectId,
            })),
            last24hActivityCount: last24hActivity.length,
            last24hConsumedPoints: last24hActivity.reduce(
                (sum, tx) => sum + Math.abs(tx.amount),
                0
            ),
            hasHighFrequencyActivity: last24hActivity.length >= 10,
        },

        // 智能建议
        aiSuggestion: generateAiSuggestion(
            riskAssessment,
            projectsCreatedAfterOrder,
            last24hActivity.length,
            consumedValue,
            refund.amount
        ),

        // 审核历史流
        auditHistory: await prisma.refundHistory.findMany({
            where: { refundId },
            orderBy: { createdAt: 'asc' },
        }),
    };
}

/**
 * 生成 AI 智能建议
 */
function generateAiSuggestion(
    riskAssessment: AutoApprovalResult,
    projectsCreated: number,
    last24hActivityCount: number,
    consumedValue: number,
    refundAmount: number
): { verdict: string; confidence: string; explanation: string } {
    const consumedRatio = refundAmount > 0 ? consumedValue / refundAmount : 0;

    // 高信任用户 + 未使用服务
    if (riskAssessment.canAutoApprove && projectsCreated === 0 && consumedRatio < 0.1) {
        return {
            verdict: '建议快速通过',
            confidence: 'HIGH',
            explanation: '用户信用良好，未创建项目，资源消耗极少。符合自动审批条件。',
        };
    }

    // 高信任用户 + 少量使用
    if (riskAssessment.canAutoApprove && consumedRatio < 0.3) {
        return {
            verdict: '建议通过（可考虑部分退款）',
            confidence: 'MEDIUM',
            explanation: `用户信用良好，但已消耗 ¥${consumedValue.toFixed(2)} 价值的资源。建议按比例退款。`,
        };
    }

    // 高频活动警告
    if (last24hActivityCount >= 10) {
        return {
            verdict: '需人工核实',
            confidence: 'LOW',
            explanation: `退款申请前 24 小时内有 ${last24hActivityCount} 次操作记录，存在"薅完就跑"嫌疑。建议核实具体消费内容。`,
        };
    }

    // 存在风险因素
    if (riskAssessment.riskFactors.length > 0) {
        return {
            verdict: '需人工审核',
            confidence: 'MEDIUM',
            explanation: `存在 ${riskAssessment.riskFactors.length} 项风险因素：${riskAssessment.riskFactors.join('、')}`,
        };
    }

    return {
        verdict: '建议人工综合判断',
        confidence: 'LOW',
        explanation: '情况较复杂，建议结合用户历史行为和客服沟通记录综合判断。',
    };
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
                { user: { nickname: { contains: keyword } } },
            ],
        });
    }

    if (startDate || endDate) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (startDate) {
            const date = new Date(startDate);
            date.setHours(0, 0, 0, 0); // 开始日期的 00:00:00
            dateFilter.gte = date;
        }
        if (endDate) {
            const date = new Date(endDate);
            date.setHours(23, 59, 59, 999); // 截止日期的 23:59:59
            dateFilter.lte = date;
        }
        andConditions.push({ createdAt: dateFilter });
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        const amountFilter: Prisma.FloatFilter = {};
        if (filters.minAmount !== undefined) amountFilter.gte = filters.minAmount;
        if (filters.maxAmount !== undefined) amountFilter.lte = filters.maxAmount;
        andConditions.push({ amount: amountFilter });
    }

    if (filters.paymentMethod) {
        andConditions.push({ order: { paymentMethod: filters.paymentMethod } });
    }

    if (filters.hasNote !== undefined) {
        if (filters.hasNote) {
            // 有备注：不为 null 且不为空字符串
            andConditions.push({
                AND: [
                    { remark: { not: null } },
                    { remark: { not: '' } }
                ]
            });
        } else {
            // 无备注：为 null 或为空字符串
            andConditions.push({
                OR: [
                    { remark: null },
                    { remark: '' }
                ]
            });
        }
    }

    if (filters.riskLevel) {
        if (filters.riskLevel === 'HIGH') {
            andConditions.push({ user: { riskScore: { gte: 70 } } });
        } else if (filters.riskLevel === 'MEDIUM') {
            andConditions.push({
                user: {
                    riskScore: {
                        gte: 30,
                        lt: 70
                    }
                }
            });
        } else if (filters.riskLevel === 'LOW') {
            andConditions.push({ user: { riskScore: { lt: 30 } } });
        }
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
                        paymentMethod: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        nickname: true,
                        riskScore: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.refundRequest.count({ where }),
    ]);

    // 扁平化映射并计算风险等级
    const flattenedItems = items.map(item => {
        const riskScore = item.user.riskScore || 0;
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        if (riskScore >= 70) riskLevel = 'HIGH';
        else if (riskScore >= 30) riskLevel = 'MEDIUM';

        return {
            ...item,
            productName: item.order.productName,
            orderNo: item.order.orderNo,
            userNickname: item.user.nickname,
            userEmail: item.user.email,
            userRiskScore: riskScore,
            riskLevel,
            paymentMethod: item.order.paymentMethod,
        };
    });

    return {
        items: flattenedItems,
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

                // 记录管理员审核通过日志
                await addRefundHistory(tx, refundId, 'APPROVE', adminId, remark);

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

                // 通知用户退款审核通过 + 退款已完成
                const notifyCtx = {
                    userId: refund.userId,
                    refundId: refund.id,
                    refundNo: refund.refundNo,
                    orderNo: refund.order?.orderNo || '',
                    amount: refund.amount,
                    productName: '',
                    transactionId: processResult.transactionId,
                };
                sendRefundApprovedMessage(notifyCtx).catch(err => console.error('[RefundNotify] 审核通过通知失败:', err));
                sendRefundCompletedMessage(notifyCtx).catch(err => console.error('[RefundNotify] 退款完成通知失败:', err));

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

                // 记录退款支付失败日志
                await prisma.refundHistory.create({
                    data: {
                        refundId,
                        action: 'FAIL',
                        operator: 'system',
                        note: `支付接口返回失败: ${processResult.message}`,
                    }
                });

                // 通知用户退款处理失败
                sendRefundFailedMessage({
                    userId: refund.userId,
                    refundId: refund.id,
                    refundNo: refund.refundNo,
                    orderNo: refund.order?.orderNo || '',
                    amount: refund.amount,
                    productName: '',
                    remark: processResult.message,
                }).catch(err => console.error('[RefundNotify] 退款失败通知失败:', err));

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

                // 记录管理员拒绝日志
                await addRefundHistory(tx, refundId, 'REJECT', adminId, remark);

                await tx.userRefundStats.update({
                    where: { userId: refund.userId },
                    data: {
                        rejectedCount: { increment: 1 },
                    },
                });
            });

            // 通知用户退款被拒绝
            sendRefundRejectedMessage({
                userId: refund.userId,
                refundId: refund.id,
                refundNo: refund.refundNo,
                orderNo: refund.order?.orderNo || '',
                amount: refund.amount,
                productName: '',
                remark,
            }).catch(err => console.error('[RefundNotify] 退款拒绝通知失败:', err));

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

            // 记录退款完成日志
            await addRefundHistory(tx, refundId, 'COMPLETE', 'system', `资金已退还至原支付账户 (流水号: ${transactionId || 'N/A'})`);

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
        failedCount,
        manualCount,
        totalAmount,
    ] = await Promise.all([
        prisma.refundRequest.count(),
        prisma.refundRequest.count({ where: { status: RefundStatus.PENDING } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.PROCESSING } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.COMPLETED } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.REJECTED } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.FAILED } }),
        prisma.refundRequest.count({ where: { status: RefundStatus.MANUAL_REQUIRED } }),
        prisma.refundRequest.aggregate({
            where: { status: RefundStatus.COMPLETED },
            _sum: { amount: true },
        }),
    ]);

    return {
        totalRefunds: totalRequests,
        pendingRefunds: pendingCount,
        processingRefunds: processingCount,
        completedRefunds: completedCount,
        rejectedRefunds: rejectedCount,
        failedRefunds: failedCount,
        manualRequiredRefunds: manualCount,
        totalAmount: totalAmount._sum.amount || 0,
        todayRefunds: 0,
    };
}
