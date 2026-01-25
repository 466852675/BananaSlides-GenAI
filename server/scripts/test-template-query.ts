import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAdminQuery() {
    console.log('=== Testing Admin Query Logic ===\n');

    // Simulate admin query (where: {})
    const adminTemplates = await prisma.styleTemplate.findMany({
        where: {},
        orderBy: { createdAt: 'desc' }
    });

    // Simulate regular user query
    const testUserId = '4db9ceb5-7875-4258-bd86-060ba8091bd5'; // admin user ID
    const userTemplates = await prisma.styleTemplate.findMany({
        where: {
            OR: [
                { isOfficial: true },
                { userId: testUserId }
            ]
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`Admin query (where: {}): ${adminTemplates.length} templates`);
    console.log(`User query (OR logic): ${userTemplates.length} templates`);
    console.log('');

    console.log('Admin templates:');
    adminTemplates.forEach(t => {
        console.log(`  - ${t.name} (official: ${t.isOfficial})`);
    });

    await prisma.$disconnect();
}

testAdminQuery();
