// server/scripts/migrate-rules.ts
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function migrate() {
    try {
        console.log('--- Starting TS Migration ---');

        const rules = [
            { code: 'outline_generation', module: '创作室', category: '文本生成', method: '按次扣费', logic: '每成功生成一个完整的大纲消耗积 5 个积分' },
            { code: 'outline_page_regen', module: '创作室', category: '文本生成', method: '按页扣费', logic: '每重写一页大纲标题和简介消耗 1 个积分' },
            { code: 'slide_content', module: '创作室', category: '文本生成', method: '按页扣费', logic: '根据大纲生成一页详细描述文案消耗 1 个积分' },
            { code: 'smart_refine', module: '创作室', category: '文本生成', method: '按次扣费', logic: 'AI 智能润色或续写内容消耗 1 个积分' },
            { code: 'slide_image', module: '创作室', category: 'AI 绘画', method: '按张扣费', logic: '生成一张高质量 16:9 背景图消耗 5 个积分' },
            { code: 'doc_parse', module: '创作室', category: '文档解析', method: '按次扣费', logic: '上传并解析一个 PDF/Word 文档消耗 3 个积分' },
            { code: 'vision_analyze', module: '创作室', category: '视觉模型', method: '按次扣费', logic: '分析参考图视觉风格消耗 8 个积分' },
            { code: 'style_apply', module: '创作室', category: '视觉模型', method: '按次扣费', logic: '将选择的视觉配色样式应用到全站 PPT 消耗 1 个积分' },
            { code: 'export_pptx', module: '创作室', category: '导出下载', method: '按次扣费', logic: '将 PPT 转换并导出为标准 PPTX 格式消耗 5 个积分' }
        ];

        for (const r of rules) {
            await (prisma as any).pointsRule.update({
                where: { code: r.code },
                data: {
                    module: r.module,
                    category: r.category,
                    calculationMethod: r.method,
                    deductionLogic: r.logic
                }
            });
            console.log(`Updated: ${r.code}`);
        }

        console.log('--- TS Migration Finished ---');
    } catch (e: any) {
        console.error('Migration Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
