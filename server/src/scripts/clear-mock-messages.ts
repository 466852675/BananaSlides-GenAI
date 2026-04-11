/**
 * 清理模拟消息数据脚本
 * 删除由 seed-messages.ts 生成的模拟消息，保留真实业务产生的消息
 *
 * 运行方式: npx tsx server/src/scripts/clear-mock-messages.ts
 */

import { PrismaClient } from '@prisma/client';
import { MessageType } from '../types/user.types';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 开始清理模拟消息数据...');

    // 统计当前消息总数
    const beforeCount = await prisma.userMessage.count();
    console.log(`📊 当前消息总数: ${beforeCount}`);

    // 定义模拟消息的特征（根据 seed-messages.ts 的生成模式）
    const mockPatterns = [
        // VIP 升级模拟
        { title: { contains: '🎉 恭喜升级' } },
        // 营销活动模拟
        { title: { contains: '🎁 限时特惠' } },
        { title: { contains: '新春特惠' } },
        // 系统公告模拟（有特定格式）
        { title: { contains: '🔧 系统升级通知' } },
        // 管理员线索模拟
        { title: { contains: '📈 收到新销售线索' } },
        // 管理员用户增长日报
        { title: { contains: '📈 用户增长日报' } },
        // 系统安全周报
        { title: { contains: '🛡️ 系统安全周报' } },
        // 资源预警模拟
        { title: { contains: '⚡ [预警] AI 算力负载较高' } },
        // 模拟线索相关
        { bizId: { contains: 'mock-lead-' } },
        // 模拟营销活动（特定 actionUrl）
        { actionUrl: '/user/vip', type: MessageType.ACTIVITY },
    ];

    // 删除匹配模拟特征的记录
    const deleteResult = await prisma.userMessage.deleteMany({
        where: {
            OR: mockPatterns
        }
    });

    console.log(`✅ 已删除 ${deleteResult.count} 条模拟消息`);

    // 统计清理后消息总数
    const afterCount = await prisma.userMessage.count();
    console.log(`📊 清理后消息总数: ${afterCount}`);

    if (afterCount > 0) {
        console.log('📋 剩余消息类型分布:');
        const typeCounts = await prisma.userMessage.groupBy({
            by: ['type'],
            _count: { id: true }
        });
        typeCounts.forEach(t => {
            console.log(`   - ${t.type}: ${t._count.id} 条`);
        });
    }

    console.log('🎉 清理完成！现在消息中心只显示真实业务产生的消息。');
}

main()
    .catch((e) => {
        console.error('❌ 清理失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });