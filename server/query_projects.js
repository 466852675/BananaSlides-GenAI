
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            displayId: true,
            title: true,
            createdAt: true
        }
    });

    console.log('PROJECTS_START');
    console.log(JSON.stringify(projects, null, 2));
    console.log('PROJECTS_END');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
