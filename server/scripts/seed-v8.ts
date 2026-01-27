
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting V8.0 Seeding...');

    // 1. Initialize Global Config
    console.log('🔧 Seeding Global Configs...');
    const configs = [
        { key: 'SYSTEM_STATUS', value: 'NORMAL', category: 'SYSTEM', desc: '系统运行状态: NORMAL/MAINTENANCE' },
        { key: 'REG_MODE', value: 'OPEN', category: 'SYSTEM', desc: '注册模式: OPEN/INVITE_ONLY/CLOSED' },
        { key: 'WARN_THRESHOLD', value: '50', category: 'UI', desc: '积分预警阈值' },
        { key: 'NEW_USER_POINTS', value: '30', category: 'GROWTH', desc: '新用户注册赠送积分' },
        { key: 'REFERRAL_POINTS', value: '200', category: 'GROWTH', desc: '邀请一位新用户奖励积分' },
        { key: 'BIND_PHONE_POINTS', value: '20', category: 'GROWTH', desc: '绑定手机号奖励' },
    ];

    for (const conf of configs) {
        await prisma.globalConfig.upsert({
            where: { key: conf.key },
            update: {}, // Don't overwrite if exists
            create: conf,
        });
    }

    // 2. Initialize Points Rules (V8.0 Full Set)
    console.log('📏 Seeding Points Rules...');
    const rules = [
        // AI Generation Cost (Positive = Deduct)
        {
            code: 'outline_generation',
            name: '生成大纲',
            costPoints: 5,
            module: '创作室',
            category: '文本生成',
            description: 'AI 智能生成 PPT 大纲结构',
            isEnabled: true
        },
        {
            code: 'slide_generation',
            name: '生成幻灯片',
            costPoints: 2,
            module: '创作室',
            category: '图片生成',
            description: 'AI 生成单页幻灯片 (含配图)',
            isEnabled: true
        },
        {
            code: 'smart_refine',
            name: 'AI 润色',
            costPoints: 1,
            module: '创作室',
            category: '文本优化',
            description: 'AI 优化单页文案或布局',
            isEnabled: true
        },
        {
            code: 'export_pptx',
            name: '导出 PPTX',
            costPoints: 10,
            module: '创作室',
            category: '导出',
            description: '下载源文件',
            isEnabled: true
        },

        // Growth Rewards (Negative = Grant, though logic usually handles magnitude. 
        // For rules, costPoints typically implies cost. For rewards, we might use negative or handle in service logic.
        // Let's stick to convention: costPoints > 0 is cost.
        // Special rules for GrowthService might just read the value as magnitude.)
        {
            code: 'daily_checkin',
            name: '每日签到',
            costPoints: 50, // Service interprets as reward
            module: '增长',
            category: '签到',
            description: '每日签到基础奖励',
            isEnabled: true
        },
        {
            code: 'checkin_bonus_3',
            name: '连签3天奖励',
            costPoints: 50, // Additional bonus
            module: '增长',
            category: '签到',
            description: '连续签到3天额外奖励',
            isEnabled: true
        },
        {
            code: 'checkin_bonus_7',
            name: '连签7天奖励',
            costPoints: 200, // Additional bonus
            module: '增长',
            category: '签到',
            description: '连续签到7天额外奖励',
            isEnabled: true
        },
        {
            code: 'referral_bonus',
            name: '邀请奖励',
            costPoints: 200,
            module: '增长',
            category: '拉新',
            description: '成功邀请新用户奖励',
            isEnabled: true
        },
    ];

    for (const rule of rules) {
        await prisma.pointsRule.upsert({
            where: { code: rule.code },
            update: {
                costPoints: rule.costPoints,
                description: rule.description,
                isEnabled: rule.isEnabled
            },
            create: rule,
        });
    }

    console.log('✅ V8.0 Seeding Completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
