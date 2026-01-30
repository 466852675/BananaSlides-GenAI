
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.findMany({
        orderBy: { createdAt: 'desc' }
    });
    console.log('=== Lead 表记录 ===');
    console.log('总数:', leads.length);
    leads.forEach((l, i) => {
        console.log(`[${i + 1}] ${l.name} | ${l.phone} | ${l.company || '-'} | ${l.status} | ${l.createdAt}`);
    });
    await prisma.$disconnect();
}
main();
