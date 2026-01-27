// server/scripts/seed-products.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Products...');

    const products = [
        {
            id: 'PRO_MONTHLY',
            name: '专业版 (月付)',
            type: 'VIP_MONTHLY',
            price: 49,
            originalPrice: 69,
            points: 600,
            features: JSON.stringify(["赠送 600 积分/月", "优先使用旗舰级 AI 模型", "更精准的逻辑生成与美化", "支持全量格式高清导出", "1对1 专家技术支持"]),
            tags: JSON.stringify(["旗舰模型", "热销"]),
            isActive: true,
            sortOrder: 1
        },
        {
            id: 'PRO_YEARLY',
            name: '专业版 (年付)',
            type: 'VIP_MONTHLY',
            price: 399,
            originalPrice: 588,
            points: 7200,
            features: JSON.stringify(["赠送 600 积分/月", "优先使用旗舰级 AI 模型", "更精准的逻辑生成与美化", "支持全量格式高清导出", "1对1 专家技术支持"]),
            tags: JSON.stringify(["省 25%", "超值"]),
            isActive: true,
            sortOrder: 2
        },
        {
            id: 'POINTS_PACK_600',
            name: '600 积分加油包',
            type: 'POINTS_PACK',
            price: 29,
            originalPrice: 39,
            points: 600,
            features: JSON.stringify(["即时到账", "永久有效", "支持所有生成功能"]),
            tags: JSON.stringify(["加餐推荐"]),
            isActive: true,
            sortOrder: 10
        }
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { id: p.id },
            update: p,
            create: p
        });
    }

    console.log('✅ Products seeded.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
