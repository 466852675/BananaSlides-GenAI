// 图片修正脚本：交换错位的图片
// P03 ↔ P04 互换，P07 ↔ P08 互换

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const PROJECT_DISPLAY_ID = 'PID-260128-9A8C19';

    console.log('[修正] 查找项目:', PROJECT_DISPLAY_ID);

    const project = await prisma.project.findFirst({
        where: { displayId: PROJECT_DISPLAY_ID },
        include: { items: { orderBy: { index: 'asc' } } }
    });

    if (!project) {
        console.error('[修正] 项目不存在!');
        return;
    }

    console.log('[修正] 找到项目:', project.title);
    console.log('[修正] 开始交换错位图片...');

    const slides = project.items;

    // 找到需要交换的 slides (index 是 0-based，所以 P03=index2, P04=index3, P07=index6, P08=index7)
    const p03 = slides.find(s => s.index === 2);
    const p04 = slides.find(s => s.index === 3);
    const p07 = slides.find(s => s.index === 6);
    const p08 = slides.find(s => s.index === 7);

    if (!p03 || !p04 || !p07 || !p08) {
        console.error('[修正] 找不到需要交换的页面!');
        return;
    }

    // 交换 P03 ↔ P04
    console.log(`[修正] 交换 P03 (${p03.title}) ↔ P04 (${p04.title})`);
    console.log(`  P03 当前: ${p03.previewUrl}`);
    console.log(`  P04 当前: ${p04.previewUrl}`);

    const p03Url = p03.previewUrl;
    const p03Variants = p03.variants;
    const p04Url = p04.previewUrl;
    const p04Variants = p04.variants;

    await prisma.slide.update({
        where: { id: p03.id },
        data: { previewUrl: p04Url, variants: p04Variants }
    });
    await prisma.slide.update({
        where: { id: p04.id },
        data: { previewUrl: p03Url, variants: p03Variants }
    });

    // 交换 P07 ↔ P08
    console.log(`[修正] 交换 P07 (${p07.title}) ↔ P08 (${p08.title})`);
    console.log(`  P07 当前: ${p07.previewUrl}`);
    console.log(`  P08 当前: ${p08.previewUrl}`);

    const p07Url = p07.previewUrl;
    const p07Variants = p07.variants;
    const p08Url = p08.previewUrl;
    const p08Variants = p08.variants;

    await prisma.slide.update({
        where: { id: p07.id },
        data: { previewUrl: p08Url, variants: p08Variants }
    });
    await prisma.slide.update({
        where: { id: p08.id },
        data: { previewUrl: p07Url, variants: p07Variants }
    });

    console.log('[修正] ✅ 图片交换完成!');
    console.log('[修正] 请刷新前端页面查看效果。');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
