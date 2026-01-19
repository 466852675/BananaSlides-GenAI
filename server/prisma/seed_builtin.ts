
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
    {
        name: "极简深蓝数字实验室",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        config: JSON.stringify({
            styleName: "极简科技",
            colorPalette: "经典蓝白",
            requirements: "【视觉定义】: 极简主义数字实验室、高级冷调、理性、无缝衔接、高科技工业质感。\n【界面骨架】: 采用极细的 0.5px 发光青色(Cyan)引导线勾勒页面边界；背景必须是纯净的深邃黑，叠加极弱的 10% 透明度网格点阵(Dot Grid)。\n【核心材质】: 模块容器使用“毛玻璃”特效(Frosted Glass)，边缘带有微妙的内外发光。标题文字使用等宽字体视觉感，加粗显示。\n【视觉约束】: 禁止任何 3D 拟物化元素；禁止圆角半径超过 4px；禁止使用任何明度超过 50% 的暖色；禁止在大背景上使用实色块，必须保持空间的流动感。",
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
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        config: JSON.stringify({
            styleName: "商务严谨",
            colorPalette: "经典蓝白",
            requirements: "【视觉定义】: 顶级智库风格、严谨对齐、灰阶层次空间、高对比度文档感。\n【界面骨架】: 严格遵循国际化 12 列栅格系统排版；页边距保持在 80px 以上。背景采用纯白，底部可带有极淡的 #F7FAFC 灰色横向色块辅助分区。\n【核心材质】: 配图必须为真实的“全球视角”商业摄影（如：摩天大楼俯瞰、团队会议长焦、蓝天下的风力发电桩），并覆盖一层透明度 20% 的蓝色渐变遮罩。\n【视觉约束】: 严禁使用任何彩色渐变或手绘素材；文字对齐必须完美一致；每页文字量控制在 200 字以内，采用精致的符号化列表。",
            aspectRatio: "16:9",
            targetPageCount: 15,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 3, content: 9, end: 1 }
        })
    },
    {
        name: "高级黑金时尚志",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        config: JSON.stringify({
            styleName: "时尚杂志",
            colorPalette: "黑金奢华",
            requirements: "【视觉定义】: 《VOGUE》式排版、沉浸式大图、黄金分割比例、跨界时尚。\n【界面骨架】: 超大号衬线体标题(Serif Typeface)横向撑满页面或与图片重叠；文字采用垂直或倾斜排版作为装饰。\n【核心材质】: 使用哑光金属质感的黄金色(#D4AF37)作为引导条；背景使用 4K 高动态范围的黑白色调人像或建筑特写。\n【视觉约束】: 禁止每页使用超过 2 种字体；禁止使用标准的矩形色块（应采用不规则切割或溶解边缘）；禁止背景出现任何琐碎杂物。",
            aspectRatio: "16:9",
            targetPageCount: 8,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 1, content: 4, end: 1 }
        })
    },
    {
        name: "活力扁平插画风",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        config: JSON.stringify({
            styleName: "扁平插画",
            colorPalette: "活力橙灰",
            requirements: "【视觉定义】: Google 原生扁平风格、叙事插画、友好、多维空间堆叠、饱和度提升。\n【界面骨架】: 界面采用大圆角卡片(Corner Radius 24px)作为内容容器；阴影使用由浅入深的弥散阴影(Diffused Shadows)。\n【核心材质】: 页面主体为 2D 矢量风格的高度细节插画（严禁 3D）；线条平滑，色彩使用对比鲜明的补色逻辑。\n【视觉约束】: 禁止使用任何具有纹理的实拍照片；禁止使用细窄、难以识别的字体；背景色必须保持明亮且偏暖。",
            aspectRatio: "16:9",
            targetPageCount: 10,
            defaultVariantCount: 1,
            pageStructure: { cover: 1, directory: 1, transition: 2, content: 5, end: 1 }
        })
    },
    {
        name: "羊皮纸文献·历史的厚度",
        isOfficial: true,
        isRecommended: true,
        isCustom: false,
        config: JSON.stringify({
            styleName: "复古风",
            colorPalette: "莫兰迪色系",
            requirements: "【视觉定义】: 19 世纪文献感、纸张触感、古董排版、墨迹清晰。\n【界面骨架】: 背景必须叠加一层高分辨率的“羊皮纸”或“宣纸”微纹理；页面边缘带有轻微的做旧色散特效。\n【核心材质】: 采用宋体(Serif)或古典英文书法体；图片预处理为类似“达盖尔银版摄影”的褐色冷调，带有胶片颗粒感。",
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
            console.log(`模版已存在: ${t.name}`);
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
