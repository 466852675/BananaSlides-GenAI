
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ALL VIP Products ---');
    const products = await prisma.product.findMany({
        where: { type: { contains: 'VIP' } },
        select: { name: true, type: true }
    });
    console.log(JSON.stringify(products, null, 2));

    console.log('\n--- ALL VIP Orders ---');
    const orders = await prisma.order.findMany({
        where: { productType: 'VIP' },
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
