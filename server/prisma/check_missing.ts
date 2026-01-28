// 修复脚本：将最近生成的图片绑定到对应的 slides
// 由于网络断开导致前端没有收到更新

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 最近生成的图片（根据时间戳）
    const recentImages = [
        '/uploads/generated/gen_ai_1769614822230_2b1d9b16575727efc65187837d9540c2.png',
        '/uploads/generated/gen_ai_1769614823837_1eaae105f79db80dfb929fb206662653.png',
        '/uploads/generated/gen_ai_1769614826277_dcf8f18da57c618240b5b1e679c36c60.png',
        '/uploads/generated/gen_ai_1769614833165_500158b48e80eaa16e8e7004e91c9ae9.png',
        '/uploads/generated/gen_ai_1769614877671_76a719ed3399acda16f38fa9b6a91ac6.png',
    ];

    // 查找用户今天的项目（根据 displayId）
    // 先查看所有最近更新的项目
    const recentProjects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { items: { orderBy: { index: 'asc' } } }
    });

    console.log('最近的项目:');
    for (const project of recentProjects) {
        console.log(`\n📁 ${project.displayId}: ${project.title}`);
        console.log(`   更新时间: ${project.updatedAt}`);

        // 找出没有图片或状态为 error 的 slides
        const failedSlides = project.items.filter(s => !s.previewUrl || s.status === 'error');
        if (failedSlides.length > 0) {
            console.log(`   ⚠️ ${failedSlides.length} 个页面缺少图片:`);
            for (const slide of failedSlides) {
                console.log(`      - P${slide.index + 1}: ${slide.title} (状态: ${slide.status})`);
            }
        } else {
            console.log('   ✅ 所有页面都有图片');
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
