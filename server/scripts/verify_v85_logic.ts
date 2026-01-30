
import { PrismaClient } from '@prisma/client';
import { checkRateLimit, PointsActionCode } from '../src/services/points.service';

const prisma = new PrismaClient();

async function runTest() {
    console.log('--- V8.5 速率限制特权验证测试 ---');

    // 1. 寻找或创建一个 Lv0 普通用户
    let freeUser = await prisma.user.findFirst({ where: { vipLevel: 0, status: 'ACTIVE' } });
    if (!freeUser) {
        freeUser = await prisma.user.create({
            data: { email: 'test_free@example.com', nickname: 'FreeUser', vipLevel: 0 }
        });
    }

    // 2. 寻找或创建一个 Lv3 尊享版用户
    let vipUser = await prisma.user.findFirst({ where: { vipLevel: 3, status: 'ACTIVE' } });
    if (!vipUser) {
        vipUser = await prisma.user.create({
            data: { email: 'test_vip@example.com', nickname: 'VIPUser', vipLevel: 3 }
        });
    }

    const action: PointsActionCode = 'slide_image'; // 限制为 30次/小时

    console.log(`\n测试用户 1: ${freeUser.nickname} (Lv${freeUser.vipLevel})`);

    // 模拟普通用户达到阈值 (31条记录)
    await prisma.transaction.deleteMany({ where: { userId: freeUser.id, ruleCode: action } });
    await prisma.transaction.createMany({
        data: Array(30).fill(0).map(() => ({
            userId: freeUser.id!,
            type: 'consume',
            amount: -10,
            balance: 100,
            ruleCode: action,
            createdAt: new Date()
        }))
    });

    const freeResult = await checkRateLimit(freeUser.id, action);
    console.log(`- 录入 30 条记录后结果: ${freeResult.allowed ? '✅ 允许' : '❌ 拦截'}`);
    console.log(`- 拦截原因: ${freeResult.reason || '无'}`);

    console.log(`\n测试用户 2: ${vipUser.nickname} (Lv${vipUser.vipLevel})`);

    // 模拟 VIP 用户相同记录情况 (应允许)
    await prisma.transaction.deleteMany({ where: { userId: vipUser.id, ruleCode: action } });
    await prisma.transaction.createMany({
        data: Array(30).fill(0).map(() => ({
            userId: vipUser.id!,
            type: 'consume',
            amount: -10,
            balance: 100,
            ruleCode: action,
            createdAt: new Date()
        }))
    });

    const vipResult = await checkRateLimit(vipUser.id, action);
    console.log(`- 录入 30 条记录后结果: ${vipResult.allowed ? '✅ 允许 (符合 3 倍特权预期)' : '❌ 拦截'}`);

    // 清理测试数据 (可选，这里仅清理本次测试产生的记录)
    // await prisma.transaction.deleteMany({ where: { userId: { in: [freeUser.id, vipUser.id] }, ruleCode: action } });

    console.log('\n--- 验证结束 ---');
}

runTest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
