
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Orders with Product IDs ---');
    const orders = await prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
            productName: true,
            productId: true
        }
    });
    console.log(JSON.stringify(orders, null, 2));

    const nullCount = await prisma.order.count({ where: { productId: null } });
    const totalCount = await prisma.order.count();
    console.log(`\nOrders with NULL productId: ${nullCount} / ${totalCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
