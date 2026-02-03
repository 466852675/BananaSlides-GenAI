// server/src/services/points.service.ts
// 积分服务：积分扣除、查询和记录

import { prisma } from '../db';

// 积分操作类型
export type PointsActionCode =
    | 'outline_generation'
    | 'outline_page_regen'
    | 'slide_content'
    | 'slide_image'
    | 'doc_parse'
    | 'style_apply'
    | 'export_pptx'
    | 'vision_analyze'
    | 'smart_refine'
    | 'style_image'
    | 'full_content_generation'
    | 'theme_refine'
    | 'content_refine'
    | 'template_refine'
    | 'template_doc_parse';

export interface DeductResult {
    success: boolean;
    remainingPoints: number;
    deductedAmount: number;
    transactionId?: string;
    message?: string;
}

/**
 * 获取操作所需积分 (支持 VIP 价格)
 */
export async function getActionCost(actionCode: PointsActionCode, userId?: string): Promise<number> {
    const rule = await prisma.pointsRule.findUnique({
        where: { code: actionCode },
    });

    if (!rule || !rule.isActive) {
        console.warn(`[Points] 积分规则 "${actionCode}" 未找到或未启用`);
        return 0; // 规则不存在时免费
    }

    // 如果没有用户 ID，返回标准价格
    if (!userId) {
        return rule.costPoints;
    }

    // 检查用户 VIP 状态
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipLevel: true, vipExpiresAt: true }
    });

    if (user && user.vipLevel > 0) {
        // 检查 VIP 是否过期
        const now = new Date();
        const isVipValid = user.vipExpiresAt ? new Date(user.vipExpiresAt) > now : true; // 如果没有过期时间，假设永久有效 (或由业务逻辑控制)

        if (isVipValid && rule.vipCostPoints !== null && rule.vipCostPoints !== undefined) {
            // console.log(`[Points] VIP User ${userId} applies VIP cost: ${rule.vipCostPoints} (Standard: ${rule.costPoints})`);
            return rule.vipCostPoints;
        }
    }

    return rule.costPoints;
}

/**
 * [V8.5] 积分风控检测：检查用户是否触发频率限制
 */
export async function checkRateLimit(userId: string, actionCode: PointsActionCode): Promise<{
    allowed: boolean;
    reason?: string;
    resetInSeconds?: number;
}> {
    const LIMITS: Record<string, { count: number; windowSeconds: number }> = {
        'slide_image': { count: 30, windowSeconds: 3600 },
        'default': { count: 100, windowSeconds: 3600 }
    };

    const limit = LIMITS[actionCode] || LIMITS.default;
    const now = new Date();
    const windowStart = new Date(now.getTime() - limit.windowSeconds * 1000);

    const count = await prisma.transaction.count({
        where: {
            userId,
            ruleCode: actionCode,
            type: 'consume',
            createdAt: { gte: windowStart }
        }
    });

    if (count >= limit.count) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { vipLevel: true } });
        const vipMultiplier = (user?.vipLevel || 0) >= 3 ? 3 : 1;

        if (count < limit.count * vipMultiplier) {
            return { allowed: true };
        }

        return {
            allowed: false,
            reason: `操作过于频繁，请稍后再试 (当前限制: ${limit.count * vipMultiplier} 次/${limit.windowSeconds / 60}分钟)`,
            resetInSeconds: limit.windowSeconds
        };
    }

    return { allowed: true };
}


/**
 * 检查用户积分是否足够
 */
export async function checkPoints(userId: string, actionCode: PointsActionCode): Promise<{
    sufficient: boolean;
    required: number;
    available: number;
}> {
    const [user, cost] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
        getActionCost(actionCode, userId),
    ]);

    if (!user) {
        return { sufficient: false, required: cost, available: 0 };
    }

    return {
        sufficient: user.points >= cost,
        required: cost,
        available: user.points,
    };
}

/**
 * 扣除用户积分
 * @param userId 用户 ID
 * @param actionCode 操作码
 * @param projectId 关联的项目 ID（可选）
 * @param description 自定义描述（可选）
 */
/**
 * 扣除用户积分
 * @param userId 用户 ID
 * @param actionCode 操作码
 * @param projectId 关联的项目 ID（可选）
 * @param description 自定义描述（可选）
 */
export async function deductPoints(
    userId: string,
    actionCode: PointsActionCode,
    projectId?: string,
    description?: string,
    multiplier: number = 1,
    options?: {
        module?: string;
        category?: string;
        subcategory?: string;
        triggerTime?: Date;
        templateId?: string; // Add templateId to options
    }
): Promise<DeductResult> {
    // 获取规则
    const rule = await prisma.pointsRule.findUnique({
        where: { code: actionCode },
    });

    if (!rule || !rule.isActive) {
        return {
            success: true,
            remainingPoints: 0,
            deductedAmount: 0,
            message: '免费操作（规则未配置）',
        };
    }

    // 计算实际消耗 (传入 userId 以支持 VIP 价格)
    const costPerAction = await getActionCost(actionCode, userId);
    const totalCost = costPerAction * multiplier;

    // [V8.5] 风控检测：仅当涉及真实消耗且规则命中时执行
    if (totalCost > 0) {
        const rateLimit = await checkRateLimit(userId, actionCode);
        if (!rateLimit.allowed) {
            return {
                success: false,
                remainingPoints: 0,
                deductedAmount: 0,
                message: rateLimit.reason || '操作过于频繁，请稍后再试',
            };
        }
    }

    if (totalCost === 0) {
        return {
            success: true,
            remainingPoints: 0,
            deductedAmount: 0,
            message: '免费操作',
        };
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.$queryRaw<{ points: number }[]>`
                SELECT points FROM User WHERE id = ${userId} FOR UPDATE
            `;

            if (!user || user.length === 0) {
                throw new Error('用户不存在');
            }

            const currentPoints = user[0].points;

            if (currentPoints < totalCost) {
                return {
                    success: false,
                    remainingPoints: currentPoints,
                    deductedAmount: 0,
                    message: `积分不足 (需要 ${totalCost}, 当前 ${currentPoints})`,
                    transactionId: undefined,
                };
            }

            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    points: { decrement: totalCost },
                    pointsUsed: { increment: totalCost }
                }
            });

            const log = await tx.transaction.create({
                data: {
                    userId,
                    type: 'consume',
                    amount: -totalCost,
                    balance: updatedUser.points,
                    ruleCode: actionCode,
                    projectId,
                    description: description || rule.name,
                    module: options?.module || rule.module,
                    category: options?.category || rule.category,
                    subcategory: options?.subcategory,
                    triggerTime: options?.triggerTime,
                    templateId: options?.templateId
                }
            });

            return {
                success: true,
                updatedUser,
                log,
                deductedAmount: totalCost,
            };
        }, {
            isolationLevel: 'Serializable',
            maxWait: 5000,
            timeout: 10000,
        });

        if (!result.success) {
            return result as DeductResult;
        }

        return {
            success: true,
            remainingPoints: result.updatedUser!.points,
            deductedAmount: result.deductedAmount,
            transactionId: result.log!.id,
            message: '扣费成功'
        };
    } catch (error) {
        console.error('[Points] 扣费事务失败:', error);

        if (error instanceof Error && error.message.includes('deadlock')) {
            return {
                success: false,
                remainingPoints: 0,
                deductedAmount: 0,
                message: '系统繁忙，请稍后重试',
            };
        }

        throw error;
    }
}



/**
 * 标记交易为已完成（AI生成成功）
 */
export async function completeTransaction(transactionId: string) {
    if (!transactionId) return;
    try {
        await prisma.transaction.update({
            where: { id: transactionId },
            data: { completedAt: new Date() } as any
        });
    } catch (e) {
        console.error(`[Points] Failed to complete transaction ${transactionId}:`, e);
    }
}

/**
 * 增加用户积分（充值、奖励等）
 */
export async function addPoints(
    userId: string,
    amount: number,
    type: 'recharge' | 'reward' | 'adjust',
    description: string,
    operatorId?: string,
    orderId?: string
): Promise<{ success: boolean; newBalance: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
    });

    if (!user) {
        return { success: false, newBalance: 0 };
    }

    const newBalance = user.points + amount;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { points: newBalance },
        }),
        prisma.transaction.create({
            data: {
                userId,
                type,
                amount,
                balance: newBalance,
                description,
                module: '系统操作', // 默认为系统操作板块
                category: type === 'reward' ? '奖励' : (type === 'adjust' ? (amount > 0 ? '奖励' : '扣除') : '充值'),
                operatorId,
                orderId,
            },
        }),
    ]);

    console.log(`[Points] 用户 ${userId} 增加 ${amount} 积分 (${type})，新余额 ${newBalance}`);

    return { success: true, newBalance };
}

/**
 * 获取用户积分交易历史
 */
export async function getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
    search?: string,
    type?: string,
    module?: string,
    category?: string,
    startDate?: string,
    endDate?: string,
    dateField: 'createdAt' | 'triggerTime' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
) {
    const whereClause: any = { userId };

    if (search) {
        whereClause.description = { contains: search };
    }

    if (type) {
        if (type === 'reward') {
            // 筛选"奖励"：包含 reward (系统奖励) 和 正向的 adjust (管理员加分)
            whereClause.OR = [
                { type: 'reward' },
                { type: 'adjust', amount: { gt: 0 } }
            ];
        } else if (type === 'consume') {
            // 筛选"支出"：包含 consume (正常消费) 和 负向的 adjust (管理员扣分)
            whereClause.OR = [
                { type: 'consume' },
                { type: 'adjust', amount: { lt: 0 } }
            ];
        } else {
            whereClause.type = type;
        }
    }
    if (module) whereClause.module = module;
    if (category) whereClause.category = category;

    if (startDate || endDate) {
        // Use dynamic date field for filtering
        whereClause[dateField] = {};
        if (startDate) whereClause[dateField].gte = new Date(startDate);
        if (endDate) whereClause[dateField].lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            orderBy: { [dateField]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.transaction.count({ where: whereClause }),
    ]);

    // 后处理：如果 description 是 JSON，可以尝试解析（但通常前端解析更好，这里只负责搜索）
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

// ============================================================
// 积分规则管理 (Admin)
// ============================================================

/**
 * 获取积分规则列表
 */
export async function listPointsRules() {
    return prisma.pointsRule.findMany({
        orderBy: { sortOrder: 'asc' },
    });
}

/**
 * 创建积分规则
 */
export async function createPointsRule(data: {
    code: string;
    name: string;
    costPoints: number;
    description?: string;
    module?: string;
    category?: string;
    calculationMethod?: string;
    deductionLogic?: string;
    effectiveAt?: Date;
    createdById?: string;
}) {
    return prisma.pointsRule.create({ data });
}
/**
 * 更新积分规则
 */
export async function updatePointsRule(id: string, data: {
    name?: string;
    costPoints?: number;
    description?: string;
    isActive?: boolean;
    module?: string;
    category?: string;
    calculationMethod?: string;
    deductionLogic?: string;
    effectiveAt?: Date;
}) {
    return prisma.pointsRule.update({
        where: { id },
        data,
    });
}
/**
 * 删除积分规则
 */
export async function deletePointsRule(id: string) {
    return prisma.pointsRule.delete({ where: { id } });
}
