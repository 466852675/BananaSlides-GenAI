import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
    {
        name: "极简深蓝数字实验室",
        thumbnailUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=300&fit=crop",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        recommendCount: 128,
        favoriteCount: 56,
        usageCount: 342,
        config: JSON.stringify({
            styleName: "极简科技",
            colorPalette: "经典蓝白",
            requirements: "极简主义数字实验室、高级冷调、理性、高科技工业质感。",
            aspectRatio: "16:9",
            targetPageCount: 10,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 2, content: 5, end: 1 }
        }),
        styleMap: JSON.stringify({
            cover: null,
            directory: null,
            transition: null,
            content: null,
            end: null
        })
    },
    {
        name: "专业商务金融模版",
        thumbnailUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        recommendCount: 256,
        favoriteCount: 89,
        usageCount: 567,
        config: JSON.stringify({
            styleName: "商务严谨",
            colorPalette: "经典蓝白",
            requirements: "顶级智库风格、严谨对齐、灰阶层次空间、高对比度文档感。",
            aspectRatio: "16:9",
            targetPageCount: 15,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 3, content: 9, end: 1 }
        })
    },
    {
        name: "高级黑金时尚志",
        thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        recommendCount: 189,
        favoriteCount: 102,
        usageCount: 423,
        config: JSON.stringify({
            styleName: "时尚杂志",
            colorPalette: "黑金奢华",
            requirements: "VOGUE式排版、沉浸式大图、黄金分割比例、跨界时尚。",
            aspectRatio: "16:9",
            targetPageCount: 8,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 1, content: 4, end: 1 }
        })
    },
    {
        name: "活力扁平插画风",
        thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        recommendCount: 145,
        favoriteCount: 78,
        usageCount: 289,
        config: JSON.stringify({
            styleName: "扁平插画",
            colorPalette: "活力橙灰",
            requirements: "Google原生扁平风格、叙事插画、友好、多维空间堆叠、饱和度提升。",
            aspectRatio: "16:9",
            targetPageCount: 10,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 2, content: 5, end: 1 }
        })
    },
    {
        name: "羊皮纸文献",
        thumbnailUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        recommendCount: 98,
        favoriteCount: 45,
        usageCount: 156,
        config: JSON.stringify({
            styleName: "复古风",
            colorPalette: "莫兰迪色系",
            requirements: "19世纪文献感、纸张触感、古董排版、墨迹清晰。",
            aspectRatio: "16:9",
            targetPageCount: 8,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 2, content: 3, end: 1 }
        })
    }
];

async function main() {
    console.log('开始注入内置模版数据...');
    for (const t of templates) {
        const existing = await prisma.styleTemplate.findFirst({
            where: { name: t.name }
        });
        if (!existing) {
            await prisma.styleTemplate.create({
                data: {
                    ...t as any,
                    updatedAt: new Date()
                }
            });
            console.log(`已添加模版: ${t.name}`);
        } else {
            // 更新现有模板，添加缩略图、推荐状态和热度数据
            await prisma.styleTemplate.update({
                where: { id: existing.id },
                data: {
                    thumbnailUrl: t.thumbnailUrl,
                    isRecommended: t.isRecommended,
                    isOfficial: t.isOfficial,
                    recommendCount: t.recommendCount,
                    favoriteCount: t.favoriteCount,
                    usageCount: t.usageCount,
                    updatedAt: new Date()
                }
            });
            console.log(`已更新模版: ${t.name}`);
        }
    }
    console.log('注入完成。');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });