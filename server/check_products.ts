
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany();
    console.log(`TOTAL_PRODUCTS: ${products.length}`);
    products.forEach(p => {
        console.log(`TYPE: [${p.type}] | ACTIVE: ${p.isActive} | NAME: ${p.name}`);
    });
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
