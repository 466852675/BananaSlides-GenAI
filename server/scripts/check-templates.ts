import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const total = await prisma.styleTemplate.count();
        const officials = await prisma.styleTemplate.count({ where: { isOfficial: true } });
        const nonOfficials = await prisma.styleTemplate.count({ where: { isOfficial: false } });
        const nullUserIds = await prisma.styleTemplate.count({ where: { userId: null } });

        console.log('=== Template Statistics ===');
        console.log(`Total templates: ${total}`);
        console.log(`Official templates: ${officials}`);
        console.log(`Non-official templates: ${nonOfficials}`);
        console.log(`Templates with null userId: ${nullUserIds}`);
        console.log('');

        if (nullUserIds > 0) {
            console.log('Warning: Found templates with null userId!');
            console.log('These will NOT be visible to anyone (including admins)');
            console.log('');

            const nullTemplates = await prisma.styleTemplate.findMany({
                where: { userId: null },
                select: { id: true, name: true, isOfficial: true }
            });

            console.log('Templates with null userId:');
            nullTemplates.forEach(t => {
                console.log(`  - ${t.name} (official: ${t.isOfficial})`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
