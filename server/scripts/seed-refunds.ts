
import { PrismaClient, RefundStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('开始模拟退款数据...');

    // 1. 获取现有用户 (优先使用现有用户，确保数据在用户管理中可见)
    let users = await prisma.user.findMany({
        take: 10, // 取前10个作为种子用户
        where: {
            // 排除可能被软删除或禁用的用户（可选）
            status: 'ACTIVE'
        }
    });

    if (users.length === 0) {
        console.log('未找到现有活跃用户，创建一个演示用户...');
        const user = await prisma.user.create({
            data: {
                email: 'demo-user@example.com',
                username: 'DemoUser',
                nickname: '演示用户',
                passwordHash: 'placeholder', // 不重要，仅用于关联
                role: 'USER',
                status: 'ACTIVE',
                points: 100,
            },
        });
        users = [user];
    } else {
        console.log(`找到 ${users.length} 个现有用户，将随机分配退款单到这些用户名下。`);
    }

    // 2. 定义要创建的退款场景
    const scenarios = [
        {
            status: RefundStatus.PENDING,
            amount: 99.00,
            reason: '不需要了',
            productName: '1000积分包',
            productType: 'POINTS',
            desc: '误操作购买，请退款'
        },
        {
            status: RefundStatus.COMPLETED,
            amount: 299.00,
            reason: '重复购买',
            productName: '专业版会员(月)',
            productType: 'VIP',
            desc: '网络卡顿导致多付了一次'
        },
        {
            status: RefundStatus.REJECTED,
            amount: 50.00,
            reason: '觉得太贵',
            productName: '500积分包',
            productType: 'POINTS',
            desc: '性价比不高',
            remark: '虚拟商品一经售出概不退换' // 拒绝理由
        },
        {
            status: RefundStatus.PENDING,
            amount: 1999.00,
            reason: '功能不满足需求',
            productName: '企业版会员(年)',
            productType: 'VIP_ENTERPRISE',
            desc: '缺少团队协作功能',
            risk: true // 高风险标记（通过金额大体现）
        },
        {
            status: RefundStatus.PROCESSING,
            amount: 129.00,
            reason: '支付后未到账',
            productName: '高级模板包',
            productType: 'TEMPLATE',
            desc: '扣款成功但账户没显示'
        },
        {
            status: RefundStatus.MANUAL_REQUIRED,
            amount: 5000.00,
            reason: '恶意刷单嫌疑',
            productName: '至尊API接口包',
            productType: 'API',
            desc: '系统检测到异常'
        }
    ];

    for (const scenario of scenarios) {
        // 随机选择一个用户
        const randomUser = users[Math.floor(Math.random() * users.length)];

        // 模拟 VIP 等级变化
        let beforeVip = randomUser.vipLevel || 0;
        let afterVip = beforeVip;

        if (scenario.productType.includes('VIP') || scenario.productName.includes('会员')) {
            // 如果是买会员，假设是从低等级升级
            if (scenario.productType.includes('ENTERPRISE')) {
                // 企业版
                beforeVip = 0;
                afterVip = 4;
            } else if (scenario.productType.includes('VIP')) {
                // 普通会员
                beforeVip = 0;
                afterVip = 1; // 假设升到基础版/专业版
            }
        }

        // 创建对应的订单
        const orderNo = `TEST-ORD-${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const order = await prisma.order.create({
            data: {
                orderNo,
                userId: randomUser.id,
                productType: scenario.productType,
                productName: scenario.productName,
                originalPrice: scenario.amount,
                finalPrice: scenario.amount,
                status: OrderStatus.PAID,
                paidAt: new Date(),
                paymentMethod: Math.random() > 0.5 ? 'wechat' : 'alipay',
                beforeVipLevel: beforeVip,
                afterVipLevel: afterVip
            },
        });

        // 创建退款申请
        const refundNo = `RFD${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}${Math.floor(Math.random() * 10000)}MX`;

        const refund = await prisma.refundRequest.create({
            data: {
                refundNo,
                userId: randomUser.id,
                orderId: order.id,
                amount: scenario.amount,
                status: scenario.status,
                reason: scenario.reason,
                description: scenario.desc,
                remark: scenario.remark,
                processedAt: scenario.status === RefundStatus.COMPLETED || scenario.status === RefundStatus.REJECTED ? new Date() : null,
                completedAt: scenario.status === RefundStatus.COMPLETED ? new Date() : null,
            },
        });

        console.log(`生成退款单: ${refund.refundNo} [${scenario.status}] -> 用户: ${randomUser.nickname || randomUser.email}`);
    }

    console.log('模拟数据生成完毕！');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
