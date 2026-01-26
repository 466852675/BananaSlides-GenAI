require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateData() {
    try {
        console.log('--- Starting corrected SQL migration ---');

        const updates = [
            // 创作室板块
            `UPDATE PointsRule SET module='创作室', category='文本生成', calculationMethod='按次扣费', deductionLogic='每成功生成一个完整的大纲消耗积 5 个积分' WHERE code='outline_generation'`,
            `UPDATE PointsRule SET module='创作室', category='文本生成', calculationMethod='按页扣费', deductionLogic='每重写一页大纲标题和简介消耗 1 个积分' WHERE code='outline_page_regen'`,
            `UPDATE PointsRule SET module='创作室', category='文本生成', calculationMethod='按页扣费', deductionLogic='根据大纲生成一页详细描述文案消耗 1 个积分' WHERE code='slide_content'`,
            `UPDATE PointsRule SET module='创作室', category='文本生成', calculationMethod='按次扣费', deductionLogic='AI 智能润色或续写内容消耗 1 个积分' WHERE code='smart_refine'`,
            `UPDATE PointsRule SET module='创作室', category='AI 绘画', calculationMethod='按张扣费', deductionLogic='生成一张高质量 16:9 背景图消耗 5 个积分' WHERE code='slide_image'`,
            `UPDATE PointsRule SET module='创作室', category='文档解析', calculationMethod='按次扣费', deductionLogic='上传并解析一个 PDF/Word 文档消耗 3 个积分' WHERE code='doc_parse'`,
            `UPDATE PointsRule SET module='创作室', category='导出下载', calculationMethod='按次扣费', deductionLogic='将 PPT 转换并导出为标准 PPTX 格式消耗 5 个积分' WHERE code='export_pptx'`,

            // 模板间板块
            `UPDATE PointsRule SET module='模板间', category='视觉模型', calculationMethod='按次扣费', deductionLogic='分析参考图视觉风格消耗 8 个积分' WHERE code='vision_analyze'`,
            `UPDATE PointsRule SET module='模板间', category='视觉模型', calculationMethod='按次扣费', deductionLogic='将选择的视觉配色样式应用到全站 PPT 消耗 1 个积分' WHERE code='style_apply'`
        ];

        for (const sql of updates) {
            await prisma.$executeRawUnsafe(sql);
            console.log(`Executed: ${sql.substring(0, 50)}...`);
        }

        console.log('--- Migration completed successfully ---');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrateData();
