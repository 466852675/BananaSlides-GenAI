
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: {
                gte: today
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 20
    });

    console.log('TRANSACTIONS_START');
    console.log(JSON.stringify(transactions, null, 2));
    console.log('TRANSACTIONS_END');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
