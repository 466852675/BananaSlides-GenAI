const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProject() {
    try {
        const projectId = 'feee3699-12fc-4ee3-858b-6a538e6a6c52';

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { slides: true }
        });

        console.log('=== Project Data ===');
        console.log('ID:', project?.id);
        console.log('Title:', project?.title);
        console.log('Slides Count:', project?.slides.length || 0);
        console.log('Global Config:', project?.globalConfig ? 'Present' : 'Empty');
        console.log('Style Map:', project?.styleMap ? 'Present' : 'Empty');

        if (project?.slides && project.slides.length > 0) {
            console.log('\n=== First 3 Slides ===');
            project.slides.slice(0, 3).forEach((slide, idx) => {
                console.log(`\nSlide ${idx + 1}:`);
                console.log('  Title:', slide.title);
                console.log('  Content:', slide.content?.substring(0, 100));
                console.log('  Status:', slide.status);
            });
        } else {
            console.log('\n⚠️  NO SLIDES FOUND IN DATABASE!');
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        await prisma.$disconnect();
    }
}

checkProject().catch(console.error);
```
