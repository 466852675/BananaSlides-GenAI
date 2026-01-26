
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const lastTransaction = await prisma.transaction.findFirst({
            orderBy: { createdAt: 'desc' },
        });
        console.log('Latest Transaction:', JSON.stringify(lastTransaction, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
