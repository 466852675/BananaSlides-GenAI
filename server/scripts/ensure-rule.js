const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureSmartRefineRule() {
    const ruleCode = 'smart_refine';
    const ruleName = 'AI 智能修饰';
    const cost = 1;

    try {
        const existingRule = await prisma.pointsRule.findUnique({
            where: { code: ruleCode }
        });

        if (existingRule) {
            console.log(`✅ Rule '${ruleCode}' already exists.`);
            if (existingRule.costPoints !== cost) {
                console.log(`Updating cost from ${existingRule.costPoints} to ${cost}...`);
                await prisma.pointsRule.update({
                    where: { code: ruleCode },
                    data: { costPoints: cost }
                });
            }
        } else {
            console.log(`Creating rule '${ruleCode}'...`);
            await prisma.pointsRule.create({
                data: {
                    code: ruleCode,
                    name: ruleName,
                    costPoints: cost,
                    description: 'AI 文本润色与修饰',
                    isActive: true,
                    sortOrder: 10 // Adjust as needed
                }
            });
            console.log(`✅ Rule '${ruleCode}' created.`);
        }

        // List all rules to confirm
        const allRules = await prisma.pointsRule.findMany({ orderBy: { sortOrder: 'asc' } });
        console.log('\nCurrent Rules:');
        allRules.forEach(r => {
            console.log(`- [${r.code}] ${r.name}: ${r.costPoints} pts (Active: ${r.isActive})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

ensureSmartRefineRule();
