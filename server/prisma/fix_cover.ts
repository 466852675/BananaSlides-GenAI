// 修复脚本：将最新生成的图片应用到 P01
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const projectId = 'PID-260128-7A22AD';

    const project = await prisma.project.findFirst({
        where: { displayId: projectId },
        include: { items: { orderBy: { index: 'asc' } } }
    });

    if (!project) {
        console.error('项目不存在!');
        return;
    }

    console.log('项目:', project.title);

    // 最新的封面图
    const latestCoverImage = '/uploads/generated/gen_ai_1769614877671_76a719ed3399acda16f38fa9b6a91ac6.png';

    // 更新 P01 封面
    const p01 = project.items.find(s => s.index === 0);
    if (p01) {
        await prisma.slide.update({
            where: { id: p01.id },
            data: {
                previewUrl: latestCoverImage,
                status: 'success',
                variants: JSON.stringify([{
                    id: `variant_${Date.now()}`,
                    previewUrl: latestCoverImage,
                    createdAt: new Date().toISOString()
                }])
            }
        });
        console.log('✅ P01 封面已更新');
    }

    // 检查其他失败的页面
    const failedSlides = project.items.filter(s => s.status === 'error');
    console.log(`\n⚠️ ${failedSlides.length} 个页面状态为 error，需要重新生成:`);
    for (const slide of failedSlides) {
        console.log(`   - P${slide.index + 1}: ${slide.title}`);

        // 将状态重置为 idle，以便前端可以重新生成
        await prisma.slide.update({
            where: { id: slide.id },
            data: { status: 'idle' }
        });
    }

    console.log('\n✅ 失败页面状态已重置为 idle，请在前端刷新后重新点击生成。');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
