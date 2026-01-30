
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Product Names ---');
    const products = await prisma.product.findMany({
        where: { type: { contains: 'vip' } },
        select: { name: true }
    });
    console.log(JSON.stringify(products, null, 2));

    console.log('\n--- Order Product Names (Last 10) ---');
    const orders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { productName: true, productType: true }
    });
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
