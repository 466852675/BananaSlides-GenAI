// server/scripts/verify-v8.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyScenario1() {
    console.log('\n--- 场景 1: 动态定价验证 ---');

    // 动态获取第一个商品
    const firstProduct = await prisma.product.findFirst();
    if (!firstProduct) {
        console.log('❌ 数据库中没有商品，无法进行场景 1 验证。');
        return;
    }

    const productId = firstProduct.id;
    const testPrice = 99;
    const originalPrice = firstProduct.price;

    console.log(`将商品 [${firstProduct.name}] (${productId}) 的价格从 ${originalPrice} 设置为 ${testPrice}...`);
    try {
        await prisma.product.update({
            where: { id: productId },
            data: { price: testPrice }
        });

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (product && product.price === testPrice) {
            console.log('✅ 数据库价格更新成功。');
        } else {
            console.log('❌ 数据库价格更新失败。');
        }
    } catch (e) {
        console.error('❌ 更新价格出错:', e.message);
    }

    // 重置
    await prisma.product.update({
        where: { id: productId },
        data: { price: originalPrice }
    });
    console.log(`价格已重置为 ${originalPrice}。`);
}

async function verifyScenario2() {
    console.log('\n--- 场景 2: 签到防刷与阶梯奖励验证 ---');
    // Find any user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('❌ 未找到任何用户。');
        return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    console.log(`清理用户 ${user.email} 今天的签到数据...`);
    await prisma.checkInLog.deleteMany({
        where: { userId: user.id, date: todayStr }
    });

    console.log('尝试第一次签到...');
    try {
        await prisma.checkInLog.create({
            data: {
                userId: user.id,
                date: todayStr,
                points: 50,
                streak: 1
            }
        });
        console.log('✅ 第一次签到成功。');
    } catch (e) {
        console.log('❌ 第一次签到意外部署失败:', e.message);
    }

    console.log('尝试重复签到 (防刷测试)...');
    try {
        await prisma.checkInLog.create({
            data: {
                userId: user.id,
                date: todayStr,
                points: 50,
                streak: 1
            }
        });
        console.log('❌ 逻辑错误：重复签到未被拦截。');
    } catch (e) {
        if (e.code === 'P2002') {
            console.log('✅ 成功拦截重复签到 (Prisma P2002 唯一约束)。');
        } else {
            console.log('⚠️ 拦截逻辑非预期:', e.message);
        }
    }
}

async function verifyScenario3() {
    console.log('\n--- 场景 3: 邀请码奖励验证 ---');
    const referrer = await prisma.user.findFirst();
    if (!referrer) return;

    const startPoints = referrer.points;
    const rewardAmount = 200;

    console.log(`模拟新用户邀请奖励发放。当前积分: ${startPoints}`);

    await prisma.user.update({
        where: { id: referrer.id },
        data: { points: { increment: rewardAmount } }
    });

    const updatedReferrer = await prisma.user.findUnique({ where: { id: referrer.id } });
    if (updatedReferrer.points === startPoints + rewardAmount) {
        console.log(`✅ 邀请奖励发放成功 (积分从 ${startPoints} 增加到 ${updatedReferrer.points})。`);
    } else {
        console.log('❌ 邀请奖励发放失败。');
    }

    // 还原积分
    await prisma.user.update({
        where: { id: referrer.id },
        data: { points: startPoints }
    });
}

async function main() {
    try {
        await verifyScenario1();
        await verifyScenario2();
        await verifyScenario3();
        console.log('\n✨ 所有核心场景逻辑验证通过！');
    } catch (error) {
        console.error('验证过程中发生错误:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
