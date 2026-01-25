// server/src/services/order.service.ts
// 订单服务：处理订单查询、更新和退款

import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrderListFilters {
    userId?: string;
    status?: OrderStatus;
    sortBy?: 'createdAt' | 'finalPrice';
    sortOrder?: 'asc' | 'desc';
}

export interface Pagination {
    page: number;
    limit: number;
}

/**
 * 获取订单列表
 */
export async function listOrders(filters: OrderListFilters, pagination: Pagination) {
    const { userId, status, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const { page, limit } = pagination;

    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        nickname: true,
                    },
                },
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.order.count({ where }),
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

/**
 * 获取订单详情
 */
export async function getOrderById(id: string) {
    return prisma.order.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    nickname: true,
                },
            },
        },
    });
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
    return prisma.order.update({
        where: { id },
        data: { status },
    });
}

/**
 * 订单退款
 */
export async function refundOrder(id: string, reason: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
        throw new Error('订单不存在');
    }

    if (order.status !== OrderStatus.PAID) {
        throw new Error('只能退款已支付的订单');
    }

    // 更新订单状态
    await prisma.order.update({
        where: { id },
        data: {
            status: OrderStatus.REFUNDED,
            refundReason: reason,
            refundedAt: new Date(),
        },
    });

    // 如果是积分充值订单，扣除积分
    if (order.productType === 'points') {
        const pointsToDeduct = order.quantity;
        const user = await prisma.user.findUnique({ where: { id: order.userId } });
        if (user) {
            await prisma.user.update({
                where: { id: order.userId },
                data: { points: Math.max(0, user.points - pointsToDeduct) },
            });

            await prisma.transaction.create({
                data: {
                    userId: order.userId,
                    type: 'refund',
                    amount: -pointsToDeduct, // 扣减积分
                    balance: Math.max(0, user.points - pointsToDeduct),
                    orderId: id,
                    description: `订单退款: ${reason}`,
                },
            });
        }
    }
}
