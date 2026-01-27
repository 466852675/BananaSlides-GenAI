// 订单模拟数据种子脚本
// 运行方式: npx ts-node prisma/seed_orders.ts

import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('[SeedOrders] 开始创建模拟订单数据...');

    // 查找普通用户
    const testUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: '466852675@qq.com' },
                { username: 'user466' }
            ]
        }
    });

    if (!testUser) {
        console.error('[SeedOrders] ❌ 未找到测试用户 466852675@qq.com，请先运行 seed_users.ts');
        process.exit(1);
    }

    console.log(`[SeedOrders] 找到测试用户: ${testUser.username} (${testUser.id})`);

    // 清理该用户的旧订单（可选）
    await prisma.order.deleteMany({
        where: { userId: testUser.id }
    });
    console.log('[SeedOrders] 已清理旧订单数据');

    // 生成订单号
    const genOrderNo = () => `ORD${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 模拟订单数据
    const orders = [
        // 积分充值订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'POINTS',
            productName: '积分充值 - 100积分',
            productDesc: '基础积分包，适合轻度用户',
            quantity: 1,
            originalPrice: 10.00,
            discountPrice: null,
            finalPrice: 10.00,
            status: OrderStatus.PAID,
            paymentMethod: 'WECHAT',
            paymentNo: `WX${Date.now()}001`,
            paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        },
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'POINTS',
            productName: '积分充值 - 500积分',
            productDesc: '超值积分包，额外赠送50积分',
            quantity: 1,
            originalPrice: 50.00,
            discountPrice: 45.00,
            finalPrice: 45.00,
            status: OrderStatus.PAID,
            paymentMethod: 'ALIPAY',
            paymentNo: `ALI${Date.now()}002`,
            paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        },
        // VIP 会员订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'VIP',
            productName: 'Pro 会员 - 月度',
            productDesc: '解锁高级功能，每月500积分',
            quantity: 1,
            originalPrice: 29.00,
            discountPrice: null,
            finalPrice: 29.00,
            status: OrderStatus.PAID,
            paymentMethod: 'WECHAT',
            paymentNo: `WX${Date.now()}003`,
            paidAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14天前
        },
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'VIP',
            productName: 'Pro 会员 - 年度',
            productDesc: '年度会员，超值优惠，每月1000积分',
            quantity: 1,
            originalPrice: 299.00,
            discountPrice: 199.00,
            finalPrice: 199.00,
            status: OrderStatus.PENDING, // 待支付
            paymentMethod: null,
            paymentNo: null,
            paidAt: null,
        },
        // 功能包订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'FEATURE',
            productName: 'AI 高清图像生成包',
            productDesc: '100次 4K 高清图像生成额度',
            quantity: 1,
            originalPrice: 68.00,
            discountPrice: 58.00,
            finalPrice: 58.00,
            status: OrderStatus.PAID,
            paymentMethod: 'ALIPAY',
            paymentNo: `ALI${Date.now()}005`,
            paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        },
        // 已取消订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'POINTS',
            productName: '积分充值 - 1000积分',
            productDesc: '专业积分包',
            quantity: 1,
            originalPrice: 100.00,
            discountPrice: 88.00,
            finalPrice: 88.00,
            status: OrderStatus.CANCELLED, // 已取消
            paymentMethod: null,
            paymentNo: null,
            paidAt: null,
        },
        // 已退款订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'VIP',
            productName: 'Enterprise 企业版 - 月度',
            productDesc: '企业级功能，不限量使用',
            quantity: 1,
            originalPrice: 599.00,
            discountPrice: null,
            finalPrice: 599.00,
            status: OrderStatus.REFUNDED, // 已退款
            paymentMethod: 'WECHAT',
            paymentNo: `WX${Date.now()}007`,
            paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            refundReason: '功能不符合预期，申请退款',
            refundedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        },
        // 更多已支付订单
        {
            orderNo: genOrderNo(),
            userId: testUser.id,
            productType: 'POINTS',
            productName: '积分充值 - 200积分',
            productDesc: '标准积分包',
            quantity: 1,
            originalPrice: 20.00,
            discountPrice: null,
            finalPrice: 20.00,
            status: OrderStatus.PAID,
            paymentMethod: 'WECHAT',
            paymentNo: `WX${Date.now()}008`,
            paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
        },
    ];

    // 批量创建订单
    for (const order of orders) {
        await prisma.order.create({ data: order });
    }

    console.log(`[SeedOrders] ✅ 成功创建 ${orders.length} 条模拟订单`);

    // 显示统计
    const stats = await prisma.order.groupBy({
        by: ['status'],
        where: { userId: testUser.id },
        _count: true
    });
    console.log('[SeedOrders] 订单统计:', stats);
}

main()
    .catch((e) => {
        console.error('[SeedOrders] 错误:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
