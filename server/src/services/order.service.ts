// server/src/services/order.service.ts
// 订单服务：处理订单查询、更新和退款

import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../db';

type TransactionClient = Prisma.TransactionClient;

export interface OrderListFilters {
    userId?: string;
    status?: OrderStatus;
    type?: string;
    productName?: string;
    cycle?: string;
    keyword?: string;
    sortBy?: 'createdAt' | 'finalPrice';
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
}

export interface Pagination {
    page: number;
    limit: number;
}

/**
 * 获取订单列表 (管理后台使用)
 */
export async function listOrders(filters: OrderListFilters, pagination: Pagination) {
    const {
        userId, status, type, productName, cycle, keyword,
        sortBy = 'createdAt', sortOrder = 'desc',
        startDate, endDate,
        minAmount, maxAmount
    } = filters;
    const { page, limit } = pagination;

    const andConditions: any[] = [];

    if (userId) andConditions.push({ userId });
    if (status) andConditions.push({ status });

    if (cycle) {
        if (cycle === '年度') {
            andConditions.push({
                OR: [
                    { productName: { contains: '年度' } },
                    { productName: { contains: 'Annual' } },
                    { productName: { contains: 'Yearly' } }
                ]
            });
        } else if (cycle === '月度') {
            andConditions.push({
                OR: [
                    { productName: { contains: '月度' } },
                    { productName: { contains: 'Monthly' } }
                ]
            });
        }
    }

    if (productName) {
        andConditions.push({ productName: { contains: productName } });
    }

    if (type) {
        andConditions.push({ productType: type });
    }

    if (keyword) {
        andConditions.push({
            OR: [
                { orderNo: { contains: keyword } },
                { productName: { contains: keyword } },
                { user: { email: { contains: keyword } } }
            ]
        });
    }

    if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        andConditions.push({ createdAt: dateFilter });
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
        const amountFilter: any = {};
        if (minAmount !== undefined) amountFilter.gte = Number(minAmount);
        if (maxAmount !== undefined) amountFilter.lte = Number(maxAmount);
        andConditions.push({ finalPrice: amountFilter });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { user: true },
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
            user: true,
            refundRequests: { orderBy: { createdAt: 'desc' } }
        },
    });
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
    const order = await prisma.order.update({
        where: { id },
        data: { status },
    });

    if (status === OrderStatus.PAID) {
        await fulfillOrder(id);
    }

    return order;
}

/**
 * 订单履约
 */
export async function fulfillOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.fulfillmentAt) return order;

    const product = order.productId ? await prisma.product.findUnique({ where: { id: order.productId } }) : null;
    const pointsToAdd = product?.points ?? order.quantity;

    return await prisma.$transaction(async (tx: TransactionClient) => {
        await tx.user.update({
            where: { id: order.userId },
            data: { points: { increment: pointsToAdd } },
        });

        await tx.transaction.create({
            data: {
                userId: order.userId,
                type: 'recharge',
                amount: pointsToAdd,
                balance: 0,
                orderId: orderId,
                description: `订单充值: ${order.productName}`,
            },
        });

        return await tx.order.update({
            where: { id: orderId },
            data: { fulfillmentAt: new Date() },
        });
    });
}

/**
 * 获取我的订单 (用户端)
 */
export async function getMyOrders(userId: string, page: number, limit: number) {
    const where = { userId };
    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.order.count({ where }),
    ]);

    return {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
}

/**
 * 创建订单 (用户端)
 */
export async function createOrder(userId: string, productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('商品不存在');

    return await prisma.order.create({
        data: {
            orderNo: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
            userId,
            productId,
            productType: product.type,
            productName: product.name,
            originalPrice: product.price,
            finalPrice: product.price,
            status: OrderStatus.PENDING,
            quantity: 1,
        }
    });
}

/**
 * 模拟支付 (用户端)
 */
export async function simulatePay(id: string, simulate: string = 'success') {
    if (simulate === 'fail') {
        return await prisma.order.update({
            where: { id },
            data: { status: OrderStatus.FAILED }
        });
    }

    return await updateOrderStatus(id, OrderStatus.PAID);
}

/**
 * 订单退款
 */
export async function refundOrder(id: string, reason: string) {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== OrderStatus.PAID) throw new Error('订单状态不支持退款');

    return await prisma.order.update({
        where: { id },
        data: {
            status: OrderStatus.REFUNDED,
            refundReason: reason,
            refundedAt: new Date(),
        }
    });
}

/**
 * 获取订单统计
 */
export async function getOrderStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCount, todayCount, totalRevenue] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.order.aggregate({
            _sum: { finalPrice: true },
            where: { status: OrderStatus.PAID }
        })
    ]);

    return {
        totalCount,
        todayCount,
        totalRevenue: totalRevenue._sum.finalPrice || 0,
        todayRevenue: 0
    };
}
