
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orders = await prisma.order.findMany({
        take: 10,
        select: {
            id: true,
            orderNo: true,
            productName: true,
            productType: true
        }
    });
    console.log('--- SAMPLE ORDERS ---');
    console.log(JSON.stringify(orders, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
