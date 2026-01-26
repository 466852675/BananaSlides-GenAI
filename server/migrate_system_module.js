
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Update explicit '系统' to '系统操作'
        const result1 = await prisma.transaction.updateMany({
            where: { module: '系统' },
            data: { module: '系统操作' }
        });
        console.log(`Updated ${result1.count} records from '系统' to '系统操作'.`);

        // 2. Optional: Mark legacy admin adjustments as '系统操作' if they have no module
        // This matches the frontend logic: module is null AND (type is reward/adjust OR desc has '管理员')
        const result2 = await prisma.transaction.updateMany({
            where: {
                module: null,
                OR: [
                    { type: 'reward' },
                    { type: 'adjust' },
                    { description: { contains: '管理员' } }
                ]
            },
            data: { module: '系统操作' } // We leave category alone or update it? Frontend logic infers category too.
            // For safety, let's just update module name unification first as requested.
        });
        console.log(`Updated ${result2.count} legacy empty-module records to '系统操作'.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
