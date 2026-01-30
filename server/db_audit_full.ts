
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Orders Sample (First 50) ---');
    const orders = await prisma.order.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
            productName: true,
            productType: true,
            status: true
        }
    });

    // Group by productName to see unique names
    const names = orders.reduce((acc: any, o) => {
        acc[o.productName] = (acc[o.productName] || 0) + 1;
        return acc;
    }, {});

    console.log('Unique Order Names Found:');
    console.log(JSON.stringify(names, null, 2));

    console.log('\nDetailed Orders List:');
    console.log(JSON.stringify(orders, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
