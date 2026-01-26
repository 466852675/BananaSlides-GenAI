
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const trans = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30
    });

    console.log('TRANS_SIMPLE_START');
    trans.forEach(t => {
        console.log(`[${t.createdAt.toISOString()}] Code: ${t.ruleCode} | Amount: ${t.amount} | Project: ${t.projectId}`);
    });
    console.log('TRANS_SIMPLE_END');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
