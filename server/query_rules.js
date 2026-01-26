
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rules = await prisma.pointsRule.findMany();
    console.log('RULES_DETAIL_START');
    rules.forEach(r => {
        console.log(`${r.code}: cost=${r.costPoints}, active=${r.isActive}`);
    });
    console.log('RULES_DETAIL_END');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
