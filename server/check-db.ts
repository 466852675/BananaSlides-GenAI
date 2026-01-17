import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        where: { name: 'Test Persistence' },
        include: { slides: true }
    });
    console.log(JSON.stringify(projects, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
