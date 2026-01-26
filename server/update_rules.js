
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating rules...');

    const updates = [
        prisma.pointsRule.update({
            where: { code: 'vision_analyze' },
            data: { module: '模版间', category: '视觉分析' }
        }),
        prisma.pointsRule.update({
            where: { code: 'smart_refine' },
            data: { module: '模版间', category: '文本生成' }
        })
    ];

    await prisma.$transaction(updates);
    console.log('Rules updated successfully.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
