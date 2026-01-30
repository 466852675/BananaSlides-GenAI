
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fulfillLatestOrder(email) {
    console.log(`--- 模拟订单支付回调: ${email} ---`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new Error('用户不存在');

        // 寻找该用户最近的一个 PENDING 订单
        const order = await prisma.order.findFirst({
            where: { userId: user.id, status: 'PENDING' },
            orderBy: { createdAt: 'desc' }
        });

        if (!order) {
            console.log('未发现待处理订单，将直接模拟一个专业版订单...');
            // 如果没有订单，直接修改用户状态以模拟结果
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    vipLevel: 2, // Professional
                    points: { increment: 3000 },
                    role: 'PROFESSIONAL'
                }
            });
            console.log('✅ 模拟权益发放成功 (Lv2 + 3000pt)');
            return;
        }

        console.log(`处理订单: ${order.orderNo} | 商品: ${order.productType}`);

        // 1. 更新订单状态
        await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID', paidAt: new Date(), paymentMethod: 'MOCK_ALIPAY' }
        });

        // 2. 根据产品类型发放权益
        let vipLevel = user.vipLevel;
        let pointsToAdd = 0;
        let newRole = user.role;

        if (order.productType.includes('VIP_MONTHLY') || order.productType.includes('VIP_YEARLY')) {
            if (order.productName.includes('基础')) { vipLevel = 1; pointsToAdd = 1000; }
            else if (order.productName.includes('专业')) { vipLevel = 2; pointsToAdd = 3000; newRole = 'PROFESSIONAL'; }
            else if (order.productName.includes('尊享')) { vipLevel = 3; pointsToAdd = 8000; newRole = 'PROFESSIONAL'; }
        } else {
            // 假设是加油包
            pointsToAdd = order.quantity || 1000;
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                vipLevel,
                points: { increment: pointsToAdd },
                role: newRole
            }
        });

        console.log(`✅ 订单 ${order.orderNo} 已履约。等级: ${vipLevel}, 积分发放: ${pointsToAdd}`);

    } catch (err) {
        console.error('❌ 履约失败:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

// 获取命令行参数中的 email
const targetEmail = process.argv[2] || 'audit_user@banana.test';
fulfillLatestOrder(targetEmail);
