
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 手动模拟 points.service.ts 中的 checkRateLimit 逻辑
async function checkRateLimitSim(userId, actionCode) {
    const LIMITS = {
        'slide_image': { count: 30, windowSeconds: 3600 },
        'default': { count: 100, windowSeconds: 3600 }
    };

    const limit = LIMITS[actionCode] || LIMITS.default;
    const now = new Date();
    const windowStart = new Date(now.getTime() - limit.windowSeconds * 1000);

    const count = await prisma.transaction.count({
        where: {
            userId,
            ruleCode: actionCode,
            type: 'consume',
            createdAt: { gte: windowStart }
        }
    });

    if (count >= limit.count) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { vipLevel: true } });
        const vipMultiplier = (user?.vipLevel || 0) >= 3 ? 3 : 1;

        if (count < limit.count * vipMultiplier) {
            return { allowed: true, count, limit: limit.count * vipMultiplier };
        }

        return {
            allowed: false,
            count,
            limit: limit.count * vipMultiplier,
            reason: `操作过于频繁`
        };
    }

    return { allowed: true, count, limit: limit.count };
}

async function runTest() {
    console.log('--- V8.5 速率限制特权核心逻辑验证 (Node-JS) ---');

    let freeUser = await prisma.user.findFirst({ where: { vipLevel: 0 } });
    let vipUser = await prisma.user.findFirst({ where: { vipLevel: 3 } });

    if (!freeUser || !vipUser) {
        console.log('请先确保数据库中有 Lv0 和 Lv3 用户。');
        return;
    }

    const action = 'slide_image';

    // 1. 验证普通用户 (触发拦截)
    await prisma.transaction.deleteMany({ where: { userId: freeUser.id, ruleCode: action } });
    const records = Array(30).fill(0).map((_, i) => ({
        userId: freeUser.id,
        type: 'consume',
        amount: -10,
        balance: 100,
        ruleCode: action,
        module: 'test',
        description: 'test rate limit'
    }));

    // 串行插入以确保 createdAt 分布（或直接用 createMany）
    await prisma.transaction.createMany({ data: records });

    const res1 = await checkRateLimitSim(freeUser.id, action);
    console.log(`普通用户 (${freeUser.nickname}) 30条记录结果: ${res1.allowed ? '✅ 允许 (错误)' : '❌ 拦截 (符合预期)'}`);
    console.log(`- 详情: 已用 ${res1.count}, 限制 ${res1.limit}`);

    // 2. 验证 VIP 用户 (应放行)
    await prisma.transaction.deleteMany({ where: { userId: vipUser.id, ruleCode: action } });
    await prisma.transaction.createMany({
        data: Array(30).fill(0).map(() => ({
            userId: vipUser.id,
            type: 'consume',
            amount: -10,
            balance: 100,
            ruleCode: action,
            module: 'test',
            description: 'test rate limit'
        }))
    });

    const res2 = await checkRateLimitSim(vipUser.id, action);
    console.log(`VIP 用户 (${vipUser.nickname}) 30条记录结果: ${res2.allowed ? '✅ 允许 (符合 3 倍特权预期)' : '❌ 拦截 (错误)'}`);
    console.log(`- 详情: 已用 ${res2.count}, 限制 ${res2.limit}`);

    console.log('\n--- 验证结束 ---');
}

runTest()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
