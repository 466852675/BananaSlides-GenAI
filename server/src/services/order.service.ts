// server/src/services/order.service.ts
// 订单服务：处理订单查询、更新和退款

import { OrderStatus } from '@prisma/client';
import { prisma } from '../db';

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
 * 获取订单列表
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

    // 1. 周期的智能识别 (支持中英同义词)
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
        } else if (cycle === '一次性' || cycle === '加油包') {
            // “一次性”即为非年度、非月度的所有订单
            andConditions.push({
                AND: [
                    { productName: { not: { contains: '年度' } } },
                    { productName: { not: { contains: '月度' } } },
                    { productName: { not: { contains: 'Annual' } } },
                    { productName: { not: { contains: 'Yearly' } } },
                    { productName: { not: { contains: 'Monthly' } } }
                ]
            });
        } else {
            andConditions.push({ productName: { contains: cycle } });
        }
    }

    // 2. 产品名的模糊匹配 (支持中英同义词映射)
    if (productName) {
        const nameMap: Record<string, string[]> = {
            '专业版': ['专业版', 'Pro'],
            '基础版': ['基础版', 'Basic'],
            '企业版': ['企业版', 'Enterprise'],
            '尊享版': ['尊享版', 'Premium', 'ProPlus'],
            '标准版': ['标准版', 'Standard']
        };

        const searchTerms = nameMap[productName] || [productName];

        andConditions.push({
            OR: searchTerms.map(term => ({
                productName: { contains: term }
            }))
        });
    }

    // 3. 按类型筛选 (模糊匹配 productType 或 productName)
    // 如果已经选择了具体的产品名，则不再叠加宽泛的类型 OR 逻辑，以防干扰包含匹配
    if (type && !productName) {
        if (type === 'POINTS') {
            andConditions.push({
                OR: [
                    { productType: 'POINTS' },
                    { productType: 'points' },
                    { productName: { contains: '积分' } },
                    { productName: { contains: '包' } },
                    { productName: { contains: '加油' } }
                ]
            });
        } else if (type === 'VIP') {
            andConditions.push({
                OR: [
                    { productType: 'VIP' },
                    { productType: 'vip' },
                    { productName: { contains: '会员' } },
                    { productName: { contains: 'Pro' } },
                    { productName: { contains: '月度' } },
                    { productName: { contains: '年度' } }
                ]
            });
        } else {
            andConditions.push({ productType: type });
        }
    }

    // 按关键词搜索 (订单号、产品名、用户邮箱/昵称)
    if (keyword) {
        andConditions.push({
            OR: [
                { orderNo: { contains: keyword } },
                { productName: { contains: keyword } },
                { user: { email: { contains: keyword } } },
                { user: { nickname: { contains: keyword } } }
            ]
        });
    }

    // 4. 金额范围筛选 (finalPrice)
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
 * 当状态变更为 PAID 时，自动触发履约流程
 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
    const order = await prisma.order.update({
        where: { id },
        data: { status },
    });

    // 支付成功时自动触发履约
    if (status === OrderStatus.PAID) {
        await fulfillOrder(id);
    }

    return order;
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

/**
 * 订单履约引擎 - 支付成功后的原子化处理
 * 包含：加积分、提升角色、设置VIP有效期
 * 内置幂等保护：通过 fulfillmentAt 防止重复履约
 */
export async function fulfillOrder(orderId: string) {
    // 获取订单信息
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new Error('订单不存在');
    }

    // 幂等保护：如果已履约，直接返回
    if (order.fulfillmentAt) {
        console.log(`[OrderService] 订单 ${orderId} 已履约，跳过`);
        return order;
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
        where: { id: order.userId },
    });

    if (!user) {
        throw new Error('用户不存在');
    }

    // 如果有关联的商品ID，获取商品定义
    let product = null;
    if (order.productId) {
        product = await prisma.product.findUnique({
            where: { id: order.productId },
        });
    }

    // 计算要增加的积分 (优先使用商品定义，否则使用订单数量)
    const pointsToAdd = product?.points ?? order.quantity;

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
        const newBalance = user.points + pointsToAdd;

        // 1. 增加积分
        await tx.user.update({
            where: { id: user.id },
            data: { points: newBalance },
        });

        // 2. 创建积分流水
        await tx.transaction.create({
            data: {
                userId: user.id,
                type: 'recharge',
                amount: pointsToAdd,
                balance: newBalance,
                orderId: orderId,
                description: `购买商品: ${order.productName}`,
            },
        });

        // 3. 如果商品定义了角色授权，更新用户角色及 VIP 等级 (V8.5 对齐)
        if (product?.roleToGrant) {
            const roleToGrantStr = product.roleToGrant.toUpperCase();
            let newVipLevel = user.vipLevel;

            // 完整映射关系
            const roleMap: Record<string, number> = {
                'USER': 0,
                'BASIC': 1,
                'PROFESSIONAL': 2,
                'PREMIUM': 3,
                'ENTERPRISE': 4
            };

            if (roleMap[roleToGrantStr] !== undefined) {
                newVipLevel = Math.max(newVipLevel, roleMap[roleToGrantStr]);
            }

            // 额外兼容性修正 (处理旧代码中的 VIP 字样)
            if (roleToGrantStr === 'VIP') newVipLevel = Math.max(newVipLevel, 1);

            await tx.user.update({
                where: { id: user.id },
                data: {
                    role: product.roleToGrant as any,
                    vipLevel: newVipLevel
                },
            });
            console.log(`[OrderService] 用户 ${user.id} 角色同步为 ${product.roleToGrant}, VIP等级: ${newVipLevel}`);
        }

        // 4. 如果是VIP商品，设置有效期 (+31天)
        if (order.productType === 'vip' || product?.type === 'VIP_MONTHLY') {
            const currentExpiry = user.vipExpiresAt ? new Date(user.vipExpiresAt) : new Date();
            const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
            newExpiry.setDate(newExpiry.getDate() + 31);

            await tx.user.update({
                where: { id: user.id },
                data: { vipExpiresAt: newExpiry },
            });
            console.log(`[OrderService] 用户 ${user.id} VIP有效期更新至 ${newExpiry.toISOString()}`);
        }

        // 5. 标记订单已履约
        await tx.order.update({
            where: { id: orderId },
            data: { fulfillmentAt: new Date() },
        });
    });

    console.log(`[OrderService] 订单 ${orderId} 履约完成: +${pointsToAdd} 积分`);

    return prisma.order.findUnique({ where: { id: orderId } });
}

/**
 * 生成订单号
 */
function generateOrderNo(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${dateStr}${random}`;
}

/**
 * 创建订单 (用户购买商品)
 * @param userId 用户 ID
 * @param productId 商品 ID
 */
export async function createOrder(userId: string, productId: string) {
    // 1. 获取商品信息
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        throw new Error('商品不存在');
    }

    if (!product.isActive) {
        throw new Error('商品已下架');
    }

    // 2. 创建订单
    const order = await prisma.order.create({
        data: {
            orderNo: generateOrderNo(),
            userId,
            productId: product.id,
            productName: product.name,
            productType: product.type.toLowerCase(), // VIP_MONTHLY -> vip_monthly
            quantity: product.points,
            originalPrice: product.originalPrice ?? product.price,
            finalPrice: product.price,
            status: OrderStatus.PENDING,
        },
    });

    console.log(`[OrderService] 订单创建成功: ${order.orderNo}`);

    return {
        orderId: order.id,
        orderNo: order.orderNo,
        status: order.status,
        productName: order.productName,
        finalPrice: order.finalPrice,
        points: order.quantity,
    };
}

/**
 * 模拟支付 (开发环境)
 * @param orderId 订单 ID
 * @param simulate 模拟结果: 'success' | 'fail'
 */
export async function simulatePay(orderId: string, simulate: 'success' | 'fail' = 'success') {
    // 1. 获取订单
    const order = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new Error('订单不存在');
    }

    if (order.status !== OrderStatus.PENDING) {
        throw new Error('订单状态不允许支付');
    }

    // 2. 模拟支付结果
    if (simulate === 'fail') {
        await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED },
        });
        return {
            success: false,
            message: '支付失败（模拟）',
        };
    }

    // 3. 更新订单状态为已支付
    await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
    });

    // 4. 触发履约流程
    await fulfillOrder(orderId);

    // 5. 获取用户最新积分
    const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { points: true },
    });

    console.log(`[OrderService] 订单 ${order.orderNo} 支付成功（模拟）`);

    return {
        success: true,
        message: '支付成功',
        newBalance: user?.points || 0,
    };
}

/**
 * 获取用户订单列表
 */
export async function getMyOrders(userId: string, page: number = 1, limit: number = 10) {
    const [items, total] = await Promise.all([
        prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.order.count({ where: { userId } }),
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

