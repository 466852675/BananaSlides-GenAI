// 图片恢复脚本：将 generated 目录中的图片关联到项目 PID-260128-9A8C19
// 使用方式：npx ts-node prisma/recover_images.ts

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const PROJECT_DISPLAY_ID = 'PID-260128-9A8C19';
    const GENERATED_DIR = path.join(process.cwd(), 'uploads', 'generated');

    console.log('[Recover] 查找项目:', PROJECT_DISPLAY_ID);

    // 1. 查找项目
    const project = await prisma.project.findFirst({
        where: { displayId: PROJECT_DISPLAY_ID },
        include: { items: { orderBy: { index: 'asc' } } }
    });

    if (!project) {
        console.error('[Recover] 项目不存在!');
        return;
    }

    console.log('[Recover] 找到项目:', project.title);
    console.log('[Recover] 当前 slides 数量:', project.items.length);

    // 2. 获取 generated 目录中今天的图片 (时间戳 1769552xxx 对应 2026-01-28)
    // 时间戳参考: 1769552xxx 约为 2026-01-28 06:xx:xx
    const TODAY_TIMESTAMP_START = 1769548000; // 2026-01-28 05:00:00 左右
    const allFiles = fs.readdirSync(GENERATED_DIR);

    // 筛选今天生成的图片
    const todaysImages = allFiles
        .filter(f => f.startsWith('gen_ai_') && f.endsWith('.png'))
        .map(f => {
            const match = f.match(/gen_ai_(\d+)_/);
            const timestamp = match ? parseInt(match[1]) : 0;
            return { filename: f, timestamp, url: `/uploads/generated/${f}` };
        })
        .filter(img => img.timestamp >= TODAY_TIMESTAMP_START * 1000) // 转换为毫秒
        .sort((a, b) => a.timestamp - b.timestamp);

    console.log('[Recover] 找到今天生成的图片:', todaysImages.length, '张');

    if (todaysImages.length === 0) {
        console.log('[Recover] 没有找到符合条件的图片');
        return;
    }

    // 3. 按顺序分配图片到 slides
    // 假设每页 1 张图片，按生成顺序对应 slide 顺序
    const slidesCount = project.items.length;
    const imagesPerSlide = Math.ceil(todaysImages.length / slidesCount);

    console.log('[Recover] 每页分配约', imagesPerSlide, '张图片');

    for (let i = 0; i < slidesCount; i++) {
        const slide = project.items[i];
        const startIdx = i * imagesPerSlide;
        const endIdx = Math.min(startIdx + imagesPerSlide, todaysImages.length);
        const slideImages = todaysImages.slice(startIdx, endIdx);

        if (slideImages.length === 0) {
            console.log(`[Recover] 第 ${i + 1} 页 (${slide.pageType}): 无可用图片`);
            continue;
        }

        const variants = slideImages.map(img => img.url);
        const previewUrl = variants[0];

        console.log(`[Recover] 第 ${i + 1} 页 (${slide.pageType}): 分配 ${variants.length} 张图片`);
        console.log(`  -> variants: ${variants.join(', ')}`);

        // 更新数据库
        await prisma.slide.update({
            where: { id: slide.id },
            data: {
                variants: JSON.stringify(variants),
                previewUrl: previewUrl,
                status: 'success'
            }
        });
    }

    console.log('[Recover] ✅ 图片恢复完成!');
    console.log('[Recover] 请刷新前端页面查看效果。');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
