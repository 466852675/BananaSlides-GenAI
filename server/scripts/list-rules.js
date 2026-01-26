
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const rules = await prisma.pointsRule.findMany({
            orderBy: { code: 'asc' }
        });

        console.log('--- Current Points Rules ---');
        console.log(JSON.stringify(rules.map(r => ({
            code: r.code,
            name: r.name,
            cost: r.costPoints,
            isActive: r.isActive
        })), null, 2));
        console.log('----------------------------');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
