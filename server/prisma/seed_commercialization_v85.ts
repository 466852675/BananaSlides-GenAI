
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- V8.5 商业化种子数据同步 (全量对齐版 - 15步生产路径) ---');

    // 1. 系统产品定义 (5 档位对齐)
    const products = [
        { code: "BS_FREE", name: "体验版 (免费)", price: 0, points: 200, roleToGrant: "USER" },
        { code: "BS_BASIC", name: "基础版", price: 39, points: 2000, roleToGrant: "BASIC_USER" },
        { code: "BS_PRO", name: "专业版", price: 99, points: 6000, roleToGrant: "PRO_USER" },
        { code: "BS_LIFETIME", name: "独享版 (永久)", price: 299, points: 30000, roleToGrant: "EXCLUSIVE_USER" },
        { code: "BS_ENT", name: "企业定制版", price: 999, points: 100000, roleToGrant: "ENTERPRISE_USER" }
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { code: p.code },
            update: p,
            create: p
        });
    }

    // 2. 积分规则定义 (全流程驱动排序 - 创作室 10 项 + 模版间 5 项)
    const rules = [
        // 创作室流水线 (sortOrder 0-9)
        { code: "theme_refine", name: "1. 主题创意润色", costPoints: 1, vipCostPoints: 1, module: "创作室", category: "文本生成", sortOrder: 0 },
        { code: "doc_parse", name: "2. 文档解析", costPoints: 3, vipCostPoints: 1, module: "创作室", category: "文档解析", sortOrder: 1 },
        { code: "outline_generation", name: "3. 大纲全量生成/重写", costPoints: 5, vipCostPoints: 2, module: "创作室", category: "文本生成", sortOrder: 2 },
        { code: "outline_page_regen", name: "4. 大纲单页重写", costPoints: 1, vipCostPoints: 1, module: "创作室", category: "文本生成", sortOrder: 3 },
        { code: "full_content_generation", name: "5. 正文全量生成/重写", costPoints: 10, vipCostPoints: 3, module: "创作室", category: "文本生成", sortOrder: 4 },
        { code: "slide_content", name: "6. 单页正文扩充", costPoints: 1, vipCostPoints: 1, module: "创作室", category: "文本生成", sortOrder: 5 },
        { code: "content_refine", name: "7. 正文二次修饰", costPoints: 1, vipCostPoints: 1, module: "创作室", category: "文本生成", sortOrder: 6 },
        { code: "style_apply", name: "8. 全局风格应用", costPoints: 1, vipCostPoints: 1, module: "创作室", category: "视觉模型", sortOrder: 7 },
        { code: "slide_image", name: "9. 旗舰 AI 生图 (创作室)", costPoints: 50, vipCostPoints: 15, module: "创作室", category: "AI 绘画", sortOrder: 8 },
        { code: "export_pptx", name: "10. 导出 PPTX", costPoints: 5, vipCostPoints: 2, module: "创作室", category: "导出下载", sortOrder: 9 },

        // 模版间流水线 (sortOrder 20-24)
        { code: "template_refine", name: "1. 模版需求润色", costPoints: 1, vipCostPoints: 1, module: "模版间", category: "文本生成", sortOrder: 20 },
        { code: "template_doc_parse", name: "2. 模版文档解析", costPoints: 3, vipCostPoints: 1, module: "模版间", category: "文档解析", sortOrder: 21 },
        { code: "vision_analyze", name: "3. AI 视觉分析", costPoints: 8, vipCostPoints: 3, module: "模版间", category: "视觉分析", sortOrder: 22 },
        { code: "style_image", name: "4. 模版图片生成 (模版间)", costPoints: 50, vipCostPoints: 15, module: "模版间", category: "AI 绘画", sortOrder: 23 },
        { code: "smart_refine", name: "5. AI 文本智能修饰", costPoints: 1, vipCostPoints: 1, module: "模版间", category: "文本生成", sortOrder: 24 }
    ];

    for (const r of rules) {
        await prisma.pointsRule.upsert({
            where: { code: r.code },
            update: {
                ...r,
                isActive: true
            },
            create: {
                ...r,
                isActive: true,
                description: r.name,
                calculationMethod: r.code.includes('image') ? "按张扣费" : r.code.includes('doc') ? "按项扣费" : r.code.includes('page') ? "按页扣费" : "按次扣费",
                deductionLogic: `${r.name}消耗 ${r.costPoints} 积分 (VIP ${r.vipCostPoints} 积分)`,
                effectiveAt: new Date()
            }
        });
    }

    console.log('V8.5 商业化种子数据全量对齐完成。');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
