const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findUnique({
        where: { id: 'feee3699-12fc-4ee3-858b-6a538e6a6c52' }
    });

    const slides = await prisma.slide.findMany({
        where: { projectId: 'feee3699-12fc-4ee3-858b-6a538e6a6c52' }
    });

    console.log('Project:', project ? 'Found' : 'Not Found');
    console.log('Slides:', slides.length);

    if (slides.length > 0) {
        console.log('\nFirst slide:');
        console.log('  Title:', slides[0].title);
        console.log('  Content:', slides[0].content.substring(0, 100));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
