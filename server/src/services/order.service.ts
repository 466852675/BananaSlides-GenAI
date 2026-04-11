// server/src/services/order.service.ts
// 订单服务：处理订单查询、更新和退款

import { OrderStatus, OrderStatusType } from '../types/user.types';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { notifyOrderPaid, notifyOrderFailed } from './order-notification.service';
import { notifyAdminNewOrder } from './admin-notification.service';

type TransactionClient = Prisma.TransactionClient;

export interface OrderListFilters {
    userId?: string;
    status?: OrderStatusType;
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
            include: { User: true },
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
            User: true,
            RefundRequest: { orderBy: { createdAt: 'desc' } }
        },
    });
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(id: string, status: OrderStatusType) {
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
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { User: { select: { id: true, points: true, vipLevel: true, vipExpiresAt: true, role: true } } }
    });
    if (!order || order.fulfillmentAt) return order;

    const product = order.productId ? await prisma.product.findUnique({ where: { id: order.productId } }) : null;
    const user = order.User;
    if (!user) return order;

    const pointsToAdd = product?.points ?? order.quantity;
    
    const isVipProduct = product?.type?.toUpperCase().includes('VIP') || 
                         product?.period === 'monthly' || 
                         product?.period === 'yearly';
    
    const beforeVipLevel = user.vipLevel;
    let afterVipLevel = user.vipLevel;
    let vipExpiresAt = user.vipExpiresAt;
    let roleToGrant = product?.roleToGrant;

    if (isVipProduct && product) {
        afterVipLevel = Math.max(user.vipLevel, 1);
        
        const now = new Date();
        if (product.period === 'monthly') {
            const currentExpiry = user.vipExpiresAt && user.vipExpiresAt > now ? user.vipExpiresAt : now;
            vipExpiresAt = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (product.period === 'yearly') {
            const currentExpiry = user.vipExpiresAt && user.vipExpiresAt > now ? user.vipExpiresAt : now;
            vipExpiresAt = new Date(currentExpiry.getTime() + 365 * 24 * 60 * 60 * 1000);
        }
        
        if (product.type?.toUpperCase().includes('PROFESSIONAL')) {
            afterVipLevel = 2;
        } else if (product.type?.toUpperCase().includes('PREMIUM')) {
            afterVipLevel = 3;
        }
    }

    const updatedOrder = await prisma.$transaction(async (tx: TransactionClient) => {
        const userUpdateData: any = {
            points: { increment: pointsToAdd },
        };

        if (isVipProduct) {
            userUpdateData.vipLevel = afterVipLevel;
            userUpdateData.vipExpiresAt = vipExpiresAt;
        }

        if (roleToGrant) {
            userUpdateData.role = roleToGrant;
        }

        await tx.user.update({
            where: { id: order.userId },
            data: userUpdateData,
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

        if (isVipProduct) {
            await tx.transaction.create({
                data: {
                    userId: order.userId,
                    type: 'vip_upgrade',
                    amount: afterVipLevel - beforeVipLevel,
                    balance: user.points + pointsToAdd,
                    orderId: orderId,
                    description: `VIP升级: ${order.productName} (等级 ${beforeVipLevel} → ${afterVipLevel})`,
                },
            });
        }

        return await tx.order.update({
            where: { id: orderId },
            data: { 
                fulfillmentAt: new Date(),
                beforeVipLevel,
                afterVipLevel,
            },
        });
    });

    notifyOrderPaid({
        orderId: order.id,
        userId: order.userId,
        orderNo: order.orderNo,
        productName: order.productName,
        points: pointsToAdd,
        amount: order.finalPrice,
    }).catch(err => console.error('[OrderNotify] 支付成功通知发送失败:', err));

    notifyAdminNewOrder({
        id: order.id,
        orderNo: order.orderNo,
        finalPrice: order.finalPrice,
        productName: order.productName,
        userId: order.userId,
        user: {
            nickname: (updatedOrder as any).user?.nickname,
            email: ''
        }
    }).catch(err => console.error('[OrderNotify] 管理员通知发送失败:', err));

    return updatedOrder;
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
export async function createOrder(userId: string, productId: string, paymentMethod?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('商品不存在');

    return await prisma.order.create({
        data: {
            orderNo: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
            userId,
            productId,
            productType: product.type,
            productName: product.name,
            originalPrice: product.originalPrice || product.price,
            finalPrice: product.price,
            status: OrderStatus.PENDING,
            quantity: product.points,
            paymentMethod: paymentMethod || null,
        }
    });
}

/**
 * 模拟支付 (用户端)
 */
export async function simulatePay(id: string, simulate: string = 'success', paymentMethod?: string) {
    if (simulate === 'fail') {
        return await prisma.order.update({
            where: { id },
            data: { 
                status: OrderStatus.FAILED,
                paymentMethod: paymentMethod || 'mock'
            }
        });
    }

    // 更新订单状态并设置支付方式
    const order = await prisma.order.update({
        where: { id },
        data: { 
            status: OrderStatus.PAID,
            paymentMethod: paymentMethod || 'mock',
            paymentNo: `MOCK_PAY_${Date.now()}`,
            paidAt: new Date()
        }
    });

    // 执行履约
    await fulfillOrder(id);
    
    return order;
}

/**
 * 取消订单 (用户端)
 * 
 * 规则：
 * - 仅 PENDING 状态的订单可取消
 * - 已支付/已退款/已取消的订单不可取消
 */
export async function cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; message: string; order?: any }> {
    const order = await prisma.order.findUnique({
        where: { id: orderId }
    });

    if (!order) {
        return { success: false, message: '订单不存在' };
    }

    if (order.userId !== userId) {
        return { success: false, message: '无权操作此订单' };
    }

    if (order.status !== OrderStatus.PENDING) {
        return { 
            success: false, 
            message: `订单状态为 ${order.status}，无法取消。仅待支付订单可取消。` 
        };
    }

    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
            status: OrderStatus.CANCELLED,
            updatedAt: new Date()
        }
    });

    return { 
        success: true, 
        message: '订单已取消',
        order: updatedOrder 
    };
}

/**
 * 批量取消超时订单 (系统定时任务)
 * 
 * 规则：
 * - PENDING 状态超过 30 分钟未支付的订单自动取消
 * 
 * @returns 取消的订单数量
 */
export async function cancelExpiredOrders(expireMinutes: number = 30): Promise<{ count: number; orderIds: string[] }> {
    const expireThreshold = new Date(Date.now() - expireMinutes * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
        where: {
            status: OrderStatus.PENDING,
            createdAt: { lt: expireThreshold }
        },
        select: { id: true }
    });

    if (expiredOrders.length === 0) {
        return { count: 0, orderIds: [] };
    }

    const orderIds = expiredOrders.map(o => o.id);

    const result = await prisma.order.updateMany({
        where: {
            id: { in: orderIds }
        },
        data: {
            status: OrderStatus.CANCELLED,
            updatedAt: new Date()
        }
    });

    console.log(`[OrderService] 自动取消 ${result.count} 个超时订单`);

    return { 
        count: result.count, 
        orderIds 
    };
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
