// 诊断脚本：检查数据库中的图片数据
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseProject(displayId: string) {
    console.log(`\n🔍 诊断项目: ${displayId}\n`);
    
    // 查找项目
    const project = await prisma.project.findFirst({
        where: { displayId },
        include: { items: true }
    });
    
    if (!project) {
        console.log(`❌ 未找到项目 ${displayId}`);
        return;
    }
    
    console.log(`✅ 找到项目: ${project.title}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Slides 数量: ${project.items.length}\n`);
    
    // 检查每个 slide 的图片数据
    project.items.forEach((slide, index) => {
        console.log(`--- Slide #${index + 1}: ${slide.title} ---`);
        console.log(`   ID: ${slide.id}`);
        console.log(`   PageType: ${slide.pageType}`);
        console.log(`   ContentType: ${slide.contentType}`);
        console.log(`   Preview URL: ${slide.previewUrl || '(空)'}`);
        
        try {
            const variants = JSON.parse(slide.variants);
            console.log(`   Variants (${variants.length}):`, variants);
        } catch (e) {
            console.log(`   Variants: 解析失败`);
        }
        console.log('');
    });
    
    await prisma.$disconnect();
}

// 运行诊断
const projectId = process.argv[2] || 'PID-260116-B330BA';
diagnoseProject(projectId);
