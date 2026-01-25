// server/src/services/points.service.ts
// 积分服务：积分扣除、查询和记录

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 积分操作类型
export type PointsActionCode =
    | 'outline_generation'
    | 'slide_content'
    | 'slide_image'
    | 'doc_parse'
    | 'style_apply'
    | 'export_pptx'
    | 'vision_analyze';

export interface DeductResult {
    success: boolean;
    remainingPoints: number;
    deductedAmount: number;
    message?: string;
}

/**
 * 获取操作所需积分
 */
export async function getActionCost(actionCode: PointsActionCode): Promise<number> {
    const rule = await prisma.pointsRule.findUnique({
        where: { code: actionCode },
    });

    if (!rule || !rule.isActive) {
        console.warn(`[Points] 积分规则 "${actionCode}" 未找到或未启用`);
        return 0; // 规则不存在时免费
    }

    return rule.costPoints;
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
        getActionCost(actionCode),
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
export async function deductPoints(
    userId: string,
    actionCode: PointsActionCode,
    projectId?: string,
    description?: string
): Promise<DeductResult> {
    // 获取规则
    const rule = await prisma.pointsRule.findUnique({
        where: { code: actionCode },
    });

    if (!rule || !rule.isActive) {
        // 规则不存在或未启用，免费放行
        return {
            success: true,
            remainingPoints: 0,
            deductedAmount: 0,
            message: '免费操作（规则未配置）',
        };
    }

    const cost = rule.costPoints;

    if (cost === 0) {
        return {
            success: true,
            remainingPoints: 0,
            deductedAmount: 0,
            message: '免费操作',
        };
    }

    // 获取用户
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
    });

    if (!user) {
        return {
            success: false,
            remainingPoints: 0,
            deductedAmount: 0,
            message: '用户不存在',
        };
    }

    if (user.points < cost) {
        return {
            success: false,
            remainingPoints: user.points,
            deductedAmount: 0,
            message: `积分不足，需要 ${cost} 积分，当前余额 ${user.points} 积分`,
        };
    }

    // 扣除积分并记录交易
    const newBalance = user.points - cost;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                points: newBalance,
                pointsUsed: { increment: cost },
            },
        }),
        prisma.transaction.create({
            data: {
                userId,
                type: 'consume',
                amount: -cost,
                balance: newBalance,
                ruleCode: actionCode,  // 字段名与 Prisma schema 一致
                projectId,
                description: description || rule.name,
            },
        }),
    ]);

    console.log(`[Points] 用户 ${userId} 消耗 ${cost} 积分 (${actionCode})，剩余 ${newBalance}`);

    return {
        success: true,
        remainingPoints: newBalance,
        deductedAmount: cost,
    };
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
    limit: number = 20
) {
    const [items, total] = await Promise.all([
        prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.transaction.count({ where: { userId } }),
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

