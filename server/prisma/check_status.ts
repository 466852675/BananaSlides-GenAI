// 查看当前数据库中各页面的图片状态
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findFirst({
        where: { displayId: 'PID-260128-9A8C19' },
        include: { items: { orderBy: { index: 'asc' } } }
    });

    if (!project) {
        console.error('项目不存在!');
        return;
    }

    console.log('项目:', project.title);
    console.log('总页数:', project.items.length);
    console.log('\n各页面图片状态:');
    console.log('='.repeat(80));

    for (const slide of project.items) {
        console.log(`P${String(slide.index + 1).padStart(2, '0')} | ${slide.pageType.padEnd(10)} | ${slide.title}`);
        console.log(`     预览: ${slide.previewUrl || '无'}`);
        console.log(`     状态: ${slide.status}`);
        console.log('-'.repeat(80));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
