
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, ModelConnection, StoredResource, DocParserConfig, StyleConfig, OutlineItem, ImageResolution } from "../types";
import { resourceToBase64, readResourceBuffer } from "../utils/file";
import mammoth from 'mammoth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { AssetService } from './asset.service';
import { saveBase64Image } from '../utils/imageSaver';
import { injectionDetector, promptSanitizer } from '../utils/prompt-security';
import { contentFilter } from '../utils/content-filter';
import { AuditService } from './audit.service';

// --- Configuration Cache ---
const configCache = new Map<string, {
    config: ModelConnection;
    timestamp: number;
}>();
const CACHE_TTL = 60000; // 1分钟

// --- HTTP Agent for better connection handling ---
const httpsAgent = new https.Agent({
    keepAlive: false,
    timeout: 120000,  // 2 分钟连接超时
    maxSockets: 10,
    maxFreeSockets: 5
});

// 清除配置缓存（供管理后台调用）
export function invalidateConfigCache(): void {
    console.log('[AIService] 清除配置缓存');
    configCache.clear();
}

// --- Default Configuration ---
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const DEFAULT_GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

// --- Shared Prompt Templates (smartRefine / smartRefineStream 共享) ---
const PROMPT_TEMPLATES: Record<string, (input: string) => string> = {
    requirement_polish: (text) => `
Task: Generate a concise PPT presentation title based on user's input.
Input: "${text}"

[STRICT RULES]
1. Output ONLY a short title (maximum 20 Chinese characters).
2. NO punctuation marks at the end (no 。！？).
3. No Markdown formatting.
4. Language: Simplified Chinese (简体中文).
5. The title should be professional and suitable for a presentation.

Example:
Input: "我想做一个关于人工智能发展趋势的路演PPT"
Output: "人工智能发展趋势路演"

Input: "帮我做一个产品发布会的演示文稿"
Output: "产品发布会演示"

Input: "关于公司年度工作总结的汇报材料"
Output: "公司年度工作总结汇报"`,
    template_description: (text) => `
Task: 根据用户的描述，生成一份专业的模板风格需求设计方案。
用户输入: "${text}"

[输出要求]
1. 输出一段完整的模板风格描述（约100-150字）
2. 包含以下要素：
   - 设计风格定位（如：现代简约、商务专业、创意活泼等）
   - 配色方案建议（主色调、辅助色）
   - 视觉元素建议（图形、图标、排版风格）
   - 适用场景
3. 语言：简体中文
4. 不使用 Markdown 格式，输出纯文本

示例：
输入: "我想做一个科技公司的产品发布会PPT"
输出: "采用现代科技感设计风格，以深蓝色为主色调，搭配荧光蓝渐变作为强调色，营造专业前沿的视觉氛围。建议使用几何图形和流线型元素，配合无衬线字体呈现简洁大气的排版风格。整体设计注重信息的层次感，通过数据可视化图表增强说服力，适用于科技产品发布、商业路演等正式场合。"`,
    requirement: (text) => `
Role: Senior Visual Director & PPT Expert.
Task: Refine the user's input into a professional, structured "AI Visual Instruction" (Style Config) for a presentation generation system.
Input Text: "${text}"

[CRITICAL REQUIREMENT]
You MUST output the result in the following Standard Markdown Structure. Do NOT change the headings.

# [Role Name] AI 视觉指令

## 1. 核心定位
*   **角色设定**: (e.g. 未来主义架构师)
*   **应用场景**: (e.g. 技术发布会)
*   **视觉关键词**: (3-5 keywords)

## 2. 总体视觉规范
*   **设计美学**: (Detailed description of style, mood, lighting, materials)
*   **色彩方案 (Name)**:
    *   **背景色**: (Hex & Description)
    *   **核心骨架/主色**: (Hex)
    *   **战略目标/亮色**: (Hex)
    *   **文字色**: (Hex)
*   **字体建议**:
    *   **标题**:
    *   **正文**:
*   **核心元素**: (List of visual elements)

## 3. 页面类型详细指令
(Provide specific visual instructions for EACH page type below. Infer details if missing.)

### [封面页] (Cover Page)
*   **布局**:
*   **元素**:
*   **氛围**:

### [目录页] (Agenda Page)
*   **布局**:
*   **元素**:
*   **特点**:

### [章节过渡页] (Section Header)
*   **布局**:
*   **元素**:
*   **特点**:

### [内容页] (Content Page)
*   **布局**:
*   **图表**:
*   **特点**:

### [结束页] (Thank You)
*   **布局**:
*   **元素**:
*   **氛围**:

---
Constraint: Return ONLY the markdown content. Language: Simplified Chinese (简体中文).`,
    content: (text) => `Task: Refine the following presentation slide content. Make it concise, professional, impactful, and suitable for a slide (use bullet points or punchy text if applicable). Maintain the original meaning.\n\nInput Text: "${text}"\n\nRequirement: Return ONLY the refined text in Simplified Chinese (简体中文). Do not add explanations or conversational filler.`,
};

// --- AI Prompt Generation Helper Functions ---

/**
 * 根据页面类型生成专属指令
 */
type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';
type GlobalStyleMap = Record<PageType, string | null>;

/**
 * 视觉特征提取: 使用 Vision 模型分析风格图并返回关键词
 */

const analyzeStyleImage = async (
    imageResource: string,
    pageType: string,
    settings?: AppSettings,
    maxKeywordsLength: number = 300
): Promise<{ keywords: string, hexColors: string[] }> => {
    const config = await resolveActiveConfig(settings, 'vision');
    const base64 = await resourceToBase64(imageResource);

    // 全流派适用: 通用设计语言提取 Prompt + 精确色值提取
    const prompt = `
        Role: 顶级 PPT 视觉分析师 & 构图专家。
        Task: 解构这张 PPT ${pageType} 的"视觉元属性"，为图像生成模型重建其灵魂。

        重点提取以下抽象设计属性 (禁止描述具象物品，禁止提取文字内容):
        1. 【主色调 - 最重要】: 必须明确指出画面的主导颜色名称（如：荧光绿、赛博蓝、琥珀金、科技紫等），以及辅助色。这是风格复现的核心！
        2. 【构图骨架】: 描述画面的几何重心分配（如：偏左重心、居中对称、大块非对称切割）。
        3. 【空间层级】: 识别其视觉深度（如：多层 3D 堆叠、极简扁平层级、半透明重叠感）。
        4. 【背景肌理】: 描述背景是某种纹理（如：电路板肌理、流体渐变、深色纯色）以及背景颜色。
        5. 【发光效果】: 是否有霓虹光晕、扫描线、粒子效果等科技感元素。
        6. 【精确色值】: 提取 2-5 个十六进制色值（#RRGGBB 格式），按重要性排列。

        输出格式:
        - 单独一行以 "HEX:" 开头，后面空格分隔色值（如: HEX: #00BFA5 #FFFFFF #1A237E）
        - 随后紧跟风格描述文本
        - 语言: 简体中文。
        - 格式: 极简扫描指令，必须首先明确主色调。
        - 示例:
          HEX: #00BFA5 #FFFFFF
          主色调为荧光绿配深黑背景，构图为...，视觉采用电路板肌理，配合绿色霓虹光晕效果
        - 描述长度: ${maxKeywordsLength} 字以内。
    `;

    try {
        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const contents = [
                { inlineData: { mimeType: 'image/png', data: base64 } },
                { text: prompt }
            ];
            const response = await ai.models.generateContent({
                model: config.model,
                contents: { parts: contents } as any
            });
            const text = response.text?.trim() || "";
            return parseStructuredVisionOutput(text);
        } else {
            const messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${base64}` } }
                    ]
                }
            ];
            const text = await callOpenAICompatible(config, messages, 0.7, false, 'vision');
            return parseStructuredVisionOutput(text);
        }
    } catch (e) {
        console.warn(`[analyzeStyleImage] Style analysis or resource loading failed (Model: ${config?.model || 'unknown'}), falling back to basic metadata.`, e);
        return { keywords: "", hexColors: [] };
    }
};

/**
 * 解析 Vision 模型的结构化输出
 * 格式: "HEX: #00BFA5 #FFFFFF\n主色调为科技青绿..."
 */
const parseStructuredVisionOutput = (text: string): { keywords: string, hexColors: string[] } => {
    if (!text) return { keywords: "", hexColors: [] };

    // 提取 HEX: 行
    const hexLineMatch = text.match(/^HEX:\s*(.+)$/im);
    let hexColors: string[] = [];
    let keywords = text;

    if (hexLineMatch) {
        // 从 HEX: 行解析色值
        const hexStr = hexLineMatch[1];
        hexColors = extractHexFromText(hexStr);
        // 移除 HEX: 行，剩余部分作为 keywords
        keywords = text.replace(/^HEX:\s*.+$/im, '').trim();
    }

    return { keywords, hexColors };
};

/**
 * 智能匹配风格参考图
 */
const getStyleReference = (
    pageType: string,
    globalStyleMap?: GlobalStyleMap
): { file: string | null; matchType: 'exact' | 'fallback' | 'none' } => {
    if (!globalStyleMap) return { file: null, matchType: 'none' };

    // Level 1: 精确匹配当前页面类型
    const exactMatch = globalStyleMap[pageType as PageType];
    if (exactMatch) {
        return { file: exactMatch, matchType: 'exact' };
    }

    // Level 2: 降级到其他页面类型的风格参考图
    const otherTypes: PageType[] = ['cover', 'content', 'directory', 'transition', 'end'];
    for (const type of otherTypes) {
        if (type !== pageType && globalStyleMap[type]) {
            return { file: globalStyleMap[type], matchType: 'fallback' };
        }
    }

    return { file: null, matchType: 'none' };
};

/**
 * 场景判别器: 自动识别当前生成调用属于哪个输入场景
 */
function detectInputScenario(
    styleRef: string | null,
    requirements: string
): 'scenario1' | 'scenario2' | 'scenario3' | 'scenario4' {
    try {
        const hasRef = !!styleRef;
        const hasReq = !!(requirements && requirements.trim().length > 0);
        if (hasRef && hasReq) return 'scenario1';
        if (hasRef && !hasReq) return 'scenario2';
        if (!hasRef && hasReq) return 'scenario3';
        return 'scenario4';
    } catch (e) {
        console.warn('[detectInputScenario] Unexpected error, defaulting to scenario4:', e);
        return 'scenario4';
    }
}

/**
 * 从文本中提取所有 hex 色值 (#RRGGBB)，去重后返回
 */
const extractHexFromText = (text: string): string[] => {
    if (!text) return [];
    const hexes = [...text.matchAll(/#[0-9a-fA-F]{6}/g)].map(m => m[0].toUpperCase());
    return [...new Set(hexes)];
};

/**
 * 通过 text LLM 从 requirements 提取视觉风格关键词
 */
async function extractKeywordsViaTextLLM(
    requirements: string,
    settings?: AppSettings
): Promise<string> {
    try {
        const textConfig = await resolveActiveConfig(settings, 'text');
        const prompt = `从以下设计需求中提取3-5个视觉风格关键词（如：科技感、通透、轻盈、稳重、商务）。
输出纯文本，逗号分隔，禁止其他格式。

设计需求: ${requirements.substring(0, 300)}`;

        const messages = [{ role: "user", content: prompt }];
        const result = await callOpenAICompatible(textConfig, messages, 0.7, false, 'text');
        return result.trim();
    } catch (e) {
        console.warn('[extractKeywordsViaTextLLM] Failed:', e);
        return "";
    }
}

/**
 * 交叉补全引擎: 根据场景填补信息缺口
 */
async function complementScenarioInputs(
    scenario: 'scenario1' | 'scenario2' | 'scenario3' | 'scenario4',
    styleKeywords: string,
    hexColors: string[],
    effectiveRequirements: string,
    settings?: AppSettings
): Promise<{ injectedKeywords: string, injectedHexes: string[] }> {
    try {
        if (scenario === 'scenario2') {
            // 场景二: 有 Vision 风格描述，缺色值 → 补充 Vision 色值
            return { injectedKeywords: "", injectedHexes: hexColors };
        }
        if (scenario === 'scenario3') {
            // 场景三: 有 requirements 精确色值，缺自然语言描述 → 提取关键词 + 色值
            const injectedHexes = extractHexFromText(effectiveRequirements);
            const injectedKeywords = await extractKeywordsViaTextLLM(effectiveRequirements, settings);
            return { injectedKeywords, injectedHexes };
        }
        // 场景一: 双通道俱全，无需补全
        // 场景四: 无输入，无需补全
        return { injectedKeywords: "", injectedHexes: [] };
    } catch (e) {
        console.warn('[complementScenarioInputs] Error, returning empty:', e);
        return { injectedKeywords: "", injectedHexes: [] };
    }
}

/**
 * 智能 Prompt 过滤器: 从完整的 Markdown 需求中提取特定页面的指令
 */
const extractPageSpecificRequirements = (fullRequirements: string, pageType: string): { content: string, isFallback: boolean } => {
    if (!fullRequirements || !fullRequirements.trim()) return { content: "", isFallback: false };

    try {
        // 1. 提取全局规范 (Section 2)
        // 匹配多种格式的"总体视觉规范"标题
        const globalPatterns = [
            /##\s*\d+\.\s*总体视觉规范/i,              // ## 2. 总体视觉规范
            /##\s*第[一二三四五六七八九十]+[章节]\s*总体视觉规范/i,  // ## 第二章 总体视觉规范
            /##\s*[一二三四五六七八九十][、.．]\s*总体视觉规范/i,     // ## 二、总体视觉规范
            /##\s*总体视觉规范/i,                        // ## 总体视觉规范（无编号）
        ];
        let globalSpec = "";
        for (const pattern of globalPatterns) {
            const match = fullRequirements.match(pattern);
            if (match) {
                const rest = fullRequirements.slice(match.index! + match[0].length);
                const endMatch = rest.match(/(?=##\s)/);
                globalSpec = endMatch ? rest.slice(0, endMatch.index!).trim() : rest.trim();
                break;
            }
        }

        // 2. 提取页面专属指令 (Section 3 中的子项)
        // 映射 pageType 到 Markdown 标题关键词
        const typeMap: Record<string, string> = {
            'cover': '封面页',
            'directory': '目录页',
            'transition': '章节过渡页',
            'content': '内容页',
            'end': '结束页'
        };

        const targetKeyword = typeMap[pageType];
        let pageSpec = "";

        if (targetKeyword) {
            // 增强正则：支持多级标题 (## / ### / ####) + 多种关键词后缀 + 灵活结束边界
            const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const headingLevel = `#{2,4}`;
            const keywordVariants = [
                escapeRegex(targetKeyword),
                escapeRegex(targetKeyword) + '页',
                escapeRegex(targetKeyword) + '要求',
                escapeRegex(targetKeyword) + '指令',
            ];
            const pattern = `${headingLevel}\\s*\\[?(${keywordVariants.join('|')})\\]?[^\\n]*([\\s\\S]*?)(?=#{2,4}|$)`;
            const regex = new RegExp(pattern, 'i');
            const pageMatch = fullRequirements.match(regex);

            if (pageMatch) {
                pageSpec = pageMatch[2].trim();
            } else {
                console.warn(`[SmartPrompt] No specific instructions found for type: ${pageType} (${targetKeyword})`);
            }
        }

        // 3. 组合
        if (globalSpec || pageSpec) {
            console.log(`[SmartPrompt] Successfully filtered requirements for ${pageType}.`);
            return {
                content: `【全局视觉规范】\n${globalSpec}\n\n【本页专属指令 (${pageType})】\n${pageSpec}`,
                isFallback: false
            };
        }

        // Fallback
        console.warn(`[SmartPrompt] No structured sections found for any type, using full requirements as fallback.`);
        return { content: fullRequirements, isFallback: true };

    } catch (e) {
        console.warn("[SmartPrompt] Regex parsing failed, using full requirements.", e);
        return { content: fullRequirements, isFallback: true };
    }
};

/**
 * 提取用户在 Markdown 中明确指定的设计建议
 * 格式: **设计建议：** 建议使用环形生态图...
 */
const extractDesignSuggestion = (content: string): string => {
    if (!content) return "";
    try {
        // 支持单行和多行：从 "**设计建议：**" 标题到第一个空行、分割线或文件结尾
        const match = content.match(/\*\*设计建议：?\*\*\s*([\s\S]*?)(?=\n\n|\n---|\n$|$)/);
        return match ? match[1].trim() : "";
    } catch (e) {
        console.warn('[extractDesignSuggestion] Regex match failed:', e);
        return "";
    }
};

/**
 * 构建完整的图片生成Prompt (OpenAI兼容模式)
 */
const buildImageGenerationPrompt = (params: {
    pageType: string;
    title: string;
    content: string;
    dataBlock?: string;
    bodyBlock?: string;
    keyPointsBlock?: string;
    styleName: string;
    colorPalette: string;
    requirements: string | { content: string, isFallback: boolean };
    aspectRatio: string;
    styleMatchType: 'exact' | 'fallback' | 'none';
    allSlideTitles?: string[];
    styleKeywords?: string;
    designSuggestion?: string;
    injectedKeywords?: string;
    injectedHexes?: string[];
}): string => {
    const { pageType, title, content, dataBlock, bodyBlock, keyPointsBlock, styleName, colorPalette, requirements, aspectRatio, styleMatchType, allSlideTitles, styleKeywords, designSuggestion, injectedKeywords, injectedHexes } = params;

    let prompt = '';

    // ============================================================
    // 0. 智能过滤需求 (Smart Prompt Filter)
    // ============================================================
    // 当传入预解析结果时直接使用，兼容旧调用传入原始字符串
    const effectiveRequirements = typeof requirements === 'object'
        ? requirements
        : extractPageSpecificRequirements(requirements, pageType);

    // ============================================================
    // 第一部分: 视觉灵魂 & 风格定义 (HIGHEST PRIORITY)
    // 此区域仅为 AI 模型提供视觉风格参考，禁止渲染为画面文字
    // ============================================================
    prompt += `【1. 视觉灵魂 & 风格定义 (HIGHEST PRIORITY) — 仅供视觉参考，禁止渲染为画面文字】\n`;
    if (styleName) prompt += `✦ 风格: ${styleName}\n`;
    if (colorPalette) prompt += `✦ 配色: ${colorPalette}\n`;
    if (injectedHexes && injectedHexes.length > 0) {
        prompt += `✦ 精确色值参考: ${injectedHexes.join(', ')}\n`;
    }
    if (styleKeywords) {
        prompt += `✦ [最重要] 核心视觉指纹 (必须严格遵循): ${styleKeywords}\n`;
        prompt += `✦ [颜色约束] 上述指纹中的主色调是风格的灵魂，必须作为画面的主导颜色，不得更换为其他颜色！\n`;
        prompt += `✦ [背景统一 (禁止白头)]: 页面必须使用【全屏沉浸式背景】(Full-Screen Background)。严禁在顶部出现白色的标题栏或分割区域！标题文字直接悬浮在深色背景之上。确保画面上下浑然一体，没有割裂感。\n`;
    }
    if (injectedKeywords) {
        prompt += `✦ 提取的风格特征: ${injectedKeywords}\n`;
    }
    if (styleMatchType === 'exact') {
        prompt += `✦ 构图锁定: 必须严格复刻参考图的几何骨架、色彩权重和视觉平衡感。\n`;
    }
    if (designSuggestion) {
        prompt += `✦ [用户设计建议 (必须采纳)]: ${designSuggestion}\n`;
        prompt += `✦ [可视化强制]: 如果建议中包含了具体的图表形式（如环形图、蜂窝图），必须作为画面的核心视觉主体！\n`;
    }
    if (effectiveRequirements.content) {
        prompt += `✦ 详细设计规范:\n${effectiveRequirements.content}\n`;
    }
    prompt += `✦ 输出比例: ${aspectRatio} (仅控制画布)\n`;
    prompt += `✦ 基调: 专业商业演示, 4K 高画质, 文字清晰\n`;
    prompt += `✦ 文字结尾禁用中文标点(。！？)\n\n`;

    // ============================================================
    // 第二部分: 业务任务内容 (这是唯一可渲染的画面内容)
    // ============================================================
    prompt += `\n【2. 业务任务内容 (✅ 这是唯一可渲染的画面内容)】\n`;
    prompt += `✦ 约束: 此区域内的文字和图标可以出现在画面中。\n`;
    prompt += `✦ 约束: 此区域内禁止出现 #hex 格式的技术参数、字体名、比例数字等。\n`;
    prompt += `✦ 页面标题: "${title}"\n`;

    // 判断是否使用块参数
    const hasDataBlock = dataBlock && dataBlock.length > 0;
    const hasBodyBlock = bodyBlock && bodyBlock.length > 0;
    const hasKeyPointsBlock = keyPointsBlock && keyPointsBlock.length > 0;
    const useBlocks = hasDataBlock || hasBodyBlock || hasKeyPointsBlock;

    if (pageType === 'directory' && !useBlocks && (!content || content.length < 20) && allSlideTitles && allSlideTitles.length > 0) {
        prompt += `✦ 大纲参考: "${allSlideTitles.join('、')}"\n`;
    } else if (useBlocks) {
        // ============================================================
        // 块参数注入模式：dataBlock / bodyBlock / keyPointsBlock 分别注入
        // ============================================================

        // --- 数据源 ---
        if (hasDataBlock) {
            prompt += `✦ 数据源 (仅供构建图表/表格，禁止渲染为画面文字):\n"""\n${dataBlock}\n"""\n`;
        }

        // --- 正文 / 内容素材 ---
        if (hasBodyBlock) {
            const bodyType = detectContentType(bodyBlock);
            if (bodyType === 'table') {
                prompt += `✦ 数据源 (仅供构建图表/表格，禁止渲染为画面文字):\n"""\n${bodyBlock}\n"""\n`;
            } else if (bodyType === 'structured' || bodyType === 'list') {
                prompt += `✦ 内容素材 (从中提炼关键信息做可视化呈现，禁止将原文直接渲染为画面文字):\n"""\n${bodyBlock}\n"""\n`;
            } else {
                prompt += `✦ 正文 (渲染为画面文字): "${bodyBlock}"\n`;
            }
        }

        // --- 要点 ---
        if (hasKeyPointsBlock) {
            prompt += `✦ 要点 (提炼为视觉亮点展示，不要整段渲染):\n"""\n${keyPointsBlock}\n"""\n`;
        }

        // 防重复约束（有数据块或要点块时生效）
        if (hasDataBlock || hasKeyPointsBlock) {
            prompt += `\n✦ [重要排版约束] 同一数据在画面中最多出现两次：一次在表格/图表中展示完整明细，一次在结论/重点区域突出核心指标。禁止在第三个及以上位置重复描述同一组数据。\n`;
        }
    } else if (content) {
        // 检测内容类型，自适应分配字数上限和注入方式
        const contentType = detectContentType(content);
        let maxContentLen: number;
        let pageTypeOverrides: string[] = [];

        switch (contentType) {
            case 'table':
                // 数据表格：高字数上限 + 数据源注入（不渲染为文字）
                maxContentLen = 4000;
                if (pageType === 'content') {
                    pageTypeOverrides = [
                        `- 使用清晰的表格/图表结构呈现数据，列标题可高亮。`,
                        `- 表格数据仅用于构建图表和表格视觉元素，禁止将原始数据行渲染为画面文字。`,
                        `- 表格下方的"结论"、"小计"等结论文本，需提炼为要点展示，不要整段渲染。`,
                    ];
                }
                break;
            case 'structured':
            case 'list':
                // 结构化文档 / 列表：高字数上限 + 素材注入（提炼可视化）
                maxContentLen = 4000;
                if (pageType === 'content') {
                    pageTypeOverrides = [
                        `- 检测到内容为结构化素材，从中提炼关键信息做可视化呈现。`,
                        `- 将素材中的不同模块（标题+对应要点）分别呈现为独立的视觉区块。`,
                        `- 每个区块使用"图标+标题+短要点"结构，禁止堆叠原始文本。`,
                        `- 关键数字可在区块内突出显示，但同一数字只能突出一次。`,
                    ];
                }
                break;
            default:
                // 段落文本：直接渲染为文字
                maxContentLen = 1500;
                break;
        }

        let contentPreview = content;
        if (content.length > maxContentLen) {
            const t = content.substring(0, maxContentLen);
            const p = contentType === 'table' ? -1 : t.lastIndexOf('。');
            contentPreview = (p > maxContentLen * 0.5 ? t.substring(0, p + 1) : t) + '...';
        }

        // 按内容类型分流注入方式
        if (contentType === 'table') {
            prompt += `✦ 数据源 (仅供构建图表/表格，禁止渲染为画面文字):\n"""\n${contentPreview}\n"""\n`;
        } else if (contentType === 'structured' || contentType === 'list') {
            prompt += `✦ 内容素材 (从中提炼关键信息做可视化呈现，禁止将原文直接渲染为画面文字):\n"""\n${contentPreview}\n"""\n`;
        } else {
            prompt += `✦ 正文 (渲染为画面文字): "${contentPreview}"\n`;
        }

        // 防重复约束（非 prose 类型通用）
        if (contentType !== 'prose') {
            prompt += `\n✦ [重要排版约束] 同一数据在画面中最多出现两次：一次在表格/图表中展示完整明细，一次在结论/重点区域突出核心指标。禁止在第三个及以上位置重复描述同一组数据。例如：利润 1051.36 万在图表中展示、在结论区高亮即可，不需要额外以文字形式重复。\n`;
        }

        // 内容页排版指令：按内容类型自适应，有 designSuggestion 时被覆盖
        if (pageType === 'content' && pageTypeOverrides.length > 0 && !designSuggestion) {
            prompt += `\n排版要求:\n`;
            for (const line of pageTypeOverrides) {
                prompt += line + '\n';
            }
        } else if (pageType === 'content' && !designSuggestion) {
            // 默认内容页排版（仅适用于 prose 类型且无 designSuggestion）
            prompt += `\n排版要求:\n`;
            prompt += `- 每个核心板块展示"图标+标题+短句"，不能只有大字\n`;
            prompt += `- 增加微型标签、状态胶囊填补空隙，列表带序号\n`;
            prompt += `- 多个对象必须平行罗列(图标矩阵/关键词标签)\n`;
            prompt += `- 从内容提炼一句核心金句，放在页面留白处\n`;
        }
    }

    if (pageType === 'cover') {
        prompt += `\n封面要求:\n`;
        prompt += `- 主标题醒目居中或偏左，副标题在下方\n`;
        prompt += `- 底部显示日期或装饰性分割线，整体大气体面\n`;
    }

    return prompt;
};

// --- Helper Functions ---

/**
 * 内容类型检测：识别正文是数据表格、结构化文档、列表还是段落文本
 */
type ContentType = 'table' | 'structured' | 'list' | 'prose';

const detectContentType = (content: string): ContentType => {
    if (!content || content.length < 20) return 'prose';
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 3) return 'prose';

    // 1. 管道表格：Markdown | 语法（如 | 收入 | 7388.60 | 7198.71 |）
    const pipeTableLines = lines.filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));
    // 排除格式行（| :--- | :--- | :--- | 等纯格式行）
    const dataPipeLines = pipeTableLines.filter(l => !/^[\s|]*:-+[\s|:.-]*$/.test(l.trim()));
    if (dataPipeLines.length >= 3) return 'table';

    // 2. 对齐表格：多空格/制表符分隔，包含多个数字的行
    const alignedTableLineCount = lines.filter(l => {
        const tokens = l.trim().split(/\s{2,}|\t+/);
        const numbers = tokens.filter(t => /^-?\d[\d,.]*$/.test(t.replace(/,/g, '')));
        return tokens.length >= 3 && numbers.length >= 2;
    }).length;
    if (alignedTableLineCount >= lines.length * 0.5) return 'table';

    // 3. 结构化文档：**粗体标题** + - 列表项 混合（如 "**核心定位**：..." 和 "- **地市覆盖**：..."）
    const boldHeaderCount = lines.filter(l => /\*\*.+\*\*/.test(l)).length;
    const listLineCount = lines.filter(l => /^[\s]*[-*•·▶]\s/.test(l)).length;
    // 同时有粗体标题和列表项
    const hasStructure = boldHeaderCount >= 2 && listLineCount >= 2;
    // 或至少有粗体标题且（粗体+列表）合计占行数 50% 以上（且总行数 ≥ 5，避免短文本误判）
    const isMixed = boldHeaderCount >= 1 && lines.length >= 5 && (boldHeaderCount + listLineCount) >= lines.length * 0.5;
    if (hasStructure || isMixed) return 'structured';

    // 4. 纯列表：行首有 - * 1. 或数字编号
    if (listLineCount >= lines.length * 0.5) return 'list';

    // 5. 段落文本
    return 'prose';
};

/**
 * 将 cleanContent 拆解为数据块、正文块和要点块
 * 用于在 generateSlideVariant 中在 buildImageGenerationPrompt 之前拆解混合内容
 */
interface SplitContentResult {
    dataBlock: string;
    bodyBlock: string;
    keyPointsBlock: string;
}

const splitContent = (content: string): SplitContentResult => {
    if (!content) return { dataBlock: '', bodyBlock: '', keyPointsBlock: '' };

    const contentType = detectContentType(content);

    // 非表格内容：全部放入 bodyBlock
    if (contentType !== 'table') {
        return { dataBlock: '', bodyBlock: content, keyPointsBlock: '' };
    }

    // 表格内容：分离表格行 vs 表后文本
    const lines = content.split('\n');
    const dataLines: string[] = [];
    const afterTableLines: string[] = [];
    let tableEnded = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (tableEnded) {
            // 保留空行供后续结论区退出逻辑使用
            afterTableLines.push(line);
            continue;
        }

        // 检测是否为表格行
        const isPipe = trimmed.startsWith('|') && trimmed.endsWith('|');
        // 对齐表格：列数 ≥ 3 即可（contentType 已确认为 table，避免表头无数字时漏检）
        const isAligned = !isPipe && trimmed.split(/\s{2,}|\t+/).length >= 3;

        if (isPipe || isAligned) {
            dataLines.push(line);
        } else if (trimmed && dataLines.length > 0) {
            // 在表格区域之后遇到非空非表格行 → 表格结束
            tableEnded = true;
            afterTableLines.push(line);
        } else if (trimmed) {
            // 表格之前的文本（罕见情况）
            afterTableLines.push(line);
        }
        // 空行在表格区域内忽略
    }

    // 将表后文本分离为结论要点 + 正文
    // 遇到结论关键词行后进入结论区；结论区内遇到连续空行则退出（新段落分界）
    const conclusionKeywords = ['结论', '小结', '总结', 'key_takeaways'];
    const keyPointsLines: string[] = [];
    const bodyLines: string[] = [];
    let inConclusionSection = false;
    let consecutiveEmptyInConclusion = 0;

    for (const line of afterTableLines) {
        if (!inConclusionSection && conclusionKeywords.some(k => line.includes(k))) {
            inConclusionSection = true;
            consecutiveEmptyInConclusion = 0;
            keyPointsLines.push(line);
        } else if (inConclusionSection) {
            if (line.trim() === '') {
                consecutiveEmptyInConclusion++;
                keyPointsLines.push(line);
            } else if (consecutiveEmptyInConclusion >= 1) {
                // 结论区内空行后遇到非空行 → 结论区结束，归入正文
                inConclusionSection = false;
                consecutiveEmptyInConclusion = 0;
                bodyLines.push(line);
            } else {
                keyPointsLines.push(line);
            }
        } else {
            bodyLines.push(line);
        }
    }

    return {
        dataBlock: dataLines.join('\n').trim(),
        bodyBlock: bodyLines.join('\n').trim(),
        keyPointsBlock: keyPointsLines.join('\n').trim(),
    };
};

const cleanBaseUrlForGoogle = (url: string): string => {
    let cleaned = url.trim();
    if (!cleaned) return 'https://generativelanguage.googleapis.com';
    if (cleaned.endsWith('/')) cleaned = cleaned.slice(0, -1);
    if (!cleaned.includes('googleapis.com')) {
        if (cleaned.endsWith('/v1')) return cleaned.slice(0, -3);
        if (cleaned.endsWith('/openai')) return cleaned.slice(0, -7);
    }
    return cleaned;
};

const createGoogleClient = (config: ModelConnection) => {
    // 强制使用 SDK 兼容的 baseUrl 格式，或者如果检测到是中转代理且不完全符合 SDK 要求，则通过 fetch/axios 注入 baseUrl
    // 注意：@google/generative-ai SDK 在 constructor 中不直接支持 baseUrl 参数 (截至常用版本)
    // 需要通过全局或特定配置注入，或者如果 SDK 不支持，则在调用处使用 callOpenAICompatible 模式或自定义传输层。
    // 这里我们保持接口一致，但在实际调用处如果是 proxy 则回退到 OpenAICompatible 模式（如果在 shouldUseGeminiNative 中逻辑正确的话）

    return new GoogleGenAI({ apiKey: config.apiKey });
};

const getTaskConfig = (settings: AppSettings | undefined, task: 'text' | 'image' | 'vision'): ModelConnection => {
    // [V10.0] 优先从数据库中读取当前激活的系统规则
    // 注意：由于 getTaskConfig 是辅助函数，建议在业务层（AIService 导出方法）注入配置或在 Service 初始化时加载。
    // 为了最小化原有逻辑侵入，我们在 AIService 导出的方法中会优先拉取数据库配置。

    if (!settings) {
        return {
            apiKey: DEFAULT_GEMINI_KEY,
            baseUrl: DEFAULT_GEMINI_BASE_URL,
            model: task === 'vision' ? 'gemini-3-flash' : 'gemini-3-pro-preview'
        };
    }

    let connection: ModelConnection;

    // Priority 1: Use customCombo if it has configuration for this task AND provider is CustomCombo
    if (settings.ai.provider === 'CustomCombo' && settings.ai.customCombo && settings.ai.customCombo[task] && settings.ai.customCombo[task].model) {
        connection = { ...settings.ai.customCombo[task] };
        if (!connection.apiKey) connection.apiKey = settings.ai.apiKey;
        if (!connection.baseUrl) connection.baseUrl = settings.ai.baseUrl;
        if (!connection.apiKey) connection.apiKey = DEFAULT_GEMINI_KEY;
    } else {
        // Priority 2: Use general settings
        let apiKey = settings.ai.apiKey;
        const baseUrl = settings.ai.baseUrl || DEFAULT_GEMINI_BASE_URL;

        // 动态模型路由：优先尊重配置值，仅在缺失时提供自适应回退
        let model = settings.ai.models[task];
        if (!model) {
            if (task === 'vision') model = 'gemini-3-flash';
            else if (task === 'image') model = 'gemini-3-pro-image';
            else model = 'gemini-3-pro-preview';
        }

        if (settings.ai.provider === 'Gemini' && !apiKey) {
            apiKey = DEFAULT_GEMINI_KEY;
        }
        connection = { apiKey, baseUrl, model };
    }

    // Runtime Fix for Model Names
    if (connection.model?.includes('gemini-3-pro-image-2k-16x9') || connection.model?.includes('gemini-3-pro-image-preview')) {
        connection.model = 'gemini-3-pro-image';
    }

    return connection;
};

/**
 * [V10.0] 全局配置解析器：整合数据库活跃规则与旧版 settings
 */
async function resolveActiveConfig(settings?: AppSettings, task: 'text' | 'image' | 'vision' = 'text'): Promise<ModelConnection> {
    const cacheKey = `active_config_${task}`;
    const cached = configCache.get(cacheKey);
    
    // 检查缓存是否有效
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.config;
    }
    
    try {
        const { prisma } = await import('../db');
        const activeRule = await prisma.aiEngineRule.findFirst({
            where: { isActive: true }
        });

        if (activeRule) {
            let config: any;
            
            try {
                config = JSON.parse(activeRule.config);
            } catch (parseError) {
                console.error('[resolveActiveConfig] JSON解析失败:', {
                    ruleId: activeRule.id,
                    provider: activeRule.provider,
                    error: parseError,
                    configPreview: activeRule.config.substring(0, 200) + (activeRule.config.length > 200 ? '...' : '')
                });
                
                console.warn('[resolveActiveConfig] 配置JSON格式错误，使用默认配置回退');
                return getTaskConfig(settings, task);
            }
            
            console.log('[resolveActiveConfig] Active Rule:', {
                id: activeRule.id,
                provider: activeRule.provider,
                task,
                hasCombo: !!config.combo,
                comboKeys: config.combo ? Object.keys(config.combo) : []
            });

            // 1. Check for Custom Combo configuration for this specific task
            if (activeRule.provider === 'CustomCombo' && config.combo && config.combo[task] && config.combo[task].model) {
                const comboConfig = config.combo[task];
                console.log(`[resolveActiveConfig] Using CustomCombo for ${task}:`, comboConfig.model);
                const connection = {
                    apiKey: comboConfig.apiKey || config.apiKey,
                    baseUrl: comboConfig.baseUrl || config.baseUrl || settings?.ai.baseUrl || DEFAULT_GEMINI_BASE_URL,
                    model: comboConfig.model
                };
                // 缓存结果
                configCache.set(cacheKey, { config: connection, timestamp: Date.now() });
                return connection;
            }

            // 2. Fallback to Standard/Multi-Model configuration
            // 规则配置结构: { textModel, imageModel, visionModel, apiKey, baseUrl }
            const taskModelMap = {
                text: config.textModel || config.model,
                image: config.imageModel,
                vision: config.visionModel || 'gemini-1.5-flash'
            };

            console.log('[resolveActiveConfig] Using Standard Config for', task, taskModelMap[task]);

            const connection = {
                apiKey: config.apiKey,
                baseUrl: config.baseUrl || settings?.ai.baseUrl || DEFAULT_GEMINI_BASE_URL,
                model: taskModelMap[task]
            };
            // 缓存结果
            configCache.set(cacheKey, { config: connection, timestamp: Date.now() });
            return connection;
        }
    } catch (e) {
        console.warn('[AIService] Failed to load active rule from DB, falling back to legacy settings.', e);
    }

    return getTaskConfig(settings, task);
}

const shouldUseGeminiNative = (config: ModelConnection, settings?: AppSettings): boolean => {
    if (!config) {
        console.warn('shouldUseGeminiNative received null/undefined config');
        return false;
    }
    const url = (config.baseUrl && typeof config.baseUrl === 'string') ? config.baseUrl.toLowerCase().trim() : '';
    const model = (config.model && typeof config.model === 'string') ? config.model.toLowerCase() : '';

    // Priority 1: Official Google APIs use Gemini Native
    if (url.includes('googleapis.com') || url.includes('generativelanguage')) {
        console.log(`[shouldUseGeminiNative] Google API detected, using Gemini Native API`);
        return true;
    }

    // Priority 2: Trusted OpenAI Compatible patterns (v1, v3, or Volcengine/Ark)
    if (url.includes('/v1') || url.includes('/v3') || url.includes('volces.com')) {
        console.log(`[shouldUseGeminiNative] OpenAI/Volcengine compatible endpoint detected, using OpenAI API`);
        return false;
    }

    // Priority 3: Any other custom URL (Non-Google, Non-Empty) -> Assume OpenAI Compatible
    // This handles OneAPI, custom proxies, etc.
    if (url.length > 5 && !url.includes('google')) {
        console.log(`[shouldUseGeminiNative] Custom URL detected (${url}), assuming OpenAI Compatible API`);
        return false;
    }

    // Priority 4: If URL is default/empty, check model name
    if (model.includes('gemini') || model.includes('googlegemini')) {
        console.log(`[shouldUseGeminiNative] Gemini model detected (${config.model}) on default config, using Gemini Native API`);
        return true;
    }

    // Priority 5: Check global provider setting
    if (settings?.ai.provider === 'Gemini') {
        console.log(`[shouldUseGeminiNative] Global Provider is Gemini, using Gemini Native API`);
        return true;
    }

    console.log(`[shouldUseGeminiNative] Using OpenAI compatible API for ${url}`);
    return false;
};

const getClosestSupportedRatio = (inputRatio: string): string => {
    const SUPPORTED_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
    if (SUPPORTED_RATIOS.includes(inputRatio)) return inputRatio;
    const [w, h] = inputRatio.split(':').map(Number);
    if (!w || !h) return "16:9";
    const ratio = w / h;
    if (ratio >= 1.7) return "16:9";
    if (ratio >= 1.3) return "4:3";
    if (ratio >= 0.9) return "1:1";
    if (ratio >= 0.7) return "3:4";
    return "9:16";
};

// --- API Callers ---

const calculateFinalResolution = (qualitySetting: string | undefined, aspectRatio: string, isZhipu: boolean = false): string => {
    let tier = '4K'; // Default
    if (qualitySetting?.includes('1024') || qualitySetting?.includes('1280')) tier = '1K';
    else if (qualitySetting?.includes('2048') || qualitySetting?.includes('1920')) tier = '2K';
    else tier = '4K';

    const ratio = getClosestSupportedRatio(aspectRatio);

    const zhipuMap: Record<string, string> = {
        '16:9': '1728x960',
        '4:3': '1344x1024',
        '1:1': '1280x1280',
        '3:4': '1024x1344',
        '9:16': '960x1728'
    };

    if (isZhipu) {
        return zhipuMap[ratio] || '1280x1280';
    }

    const map: Record<string, Record<string, string>> = {
        '1K': {
            '16:9': '1280x736',
            '4:3': '1024x768',
            '1:1': '1024x1024',
            '3:4': '768x1024',
            '9:16': '736x1280'
        },
        '2K': {
            '16:9': '1920x1088',
            '4:3': '2048x1536',
            '1:1': '2048x2048',
            '3:4': '1536x2048',
            '9:16': '1088x1920'
        },
        '4K': {
            '16:9': '3840x2176',
            '4:3': '4096x3072',
            '1:1': '2176x2176',
            '3:4': '3072x4096',
            '9:16': '2176x3840'
        }
    };

    return map[tier][ratio] || map['2K']['16:9'];
};

// AI 服务超时配置（宽裕时长）
const AI_TIMEOUTS = {
    text: 60000,      // 文本生成 1分钟（增加超时时间）
    image: 180000,     // 图片生成 3分钟
    vision: 90000     // 视觉分析 1.5分钟
};

async function callOpenAICompatible(
    config: ModelConnection,
    messages: any[],
    temperature: number = 0.7,
    jsonMode: boolean = false,
    taskType: 'text' | 'image' | 'vision' = 'text'
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        // [Debug] Aggressive Sanitization
        const safeKey = config.apiKey.replace(/[^ -~]/g, "");
        headers['Authorization'] = `Bearer ${safeKey}`;
        // Extra detail to debug "Incorrect API key" under load
        console.log(`[OpenAI Compatible] Using API Key: ${safeKey.substring(0, 6)}... (Length: ${safeKey.length})`);
    }

    const body: any = {
        model: config.model,
        messages: messages,
        temperature: temperature,
        max_tokens: 4096
    };
    if (jsonMode) body.response_format = { type: "json_object" };

    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let url = baseUrl;
    if (!url.toLowerCase().endsWith('/chat/completions')) {
        url = `${baseUrl}/chat/completions`;
    }

    console.log(`[OpenAI Compatible] Calling: ${url}, Model: ${config.model}`);

    let retries = 5; // Increased to 5 for better resilience
    while (retries > 0) {
        try {
            console.log(`[OpenAI Compatible] Calling: ${url}, Model: ${config.model} (Attempts left: ${retries})`);
            // 根据任务类型设置宽裕的超时时间
            const timeout = AI_TIMEOUTS[taskType] || AI_TIMEOUTS.text;
            console.log(`[OpenAI Compatible] Timeout: ${timeout}ms (${taskType} task)`);
            const response = await axios.post(url, body, { headers, timeout, httpsAgent });
            const content = response.data.choices[0]?.message?.content || "";
            console.log(`[OpenAI Compatible] Response received, length: ${content.length}`);
            console.log(`[OpenAI Compatible] Response preview:`, content.substring(0, 200));
            return content;
        } catch (error: any) {
            const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const statusCode = error.response?.status;
            console.error(`[OpenAI Compatible] Attempt failed: ${errMsg} (Status: ${statusCode})`);

            // 检查是否为超时错误
            const isTimeout = error.code === 'ECONNABORTED' || errMsg.toLowerCase().includes('timeout');

            // ModelScope specific logic: Intermittent 401s are observed even with valid keys.
            // We retry 401 only if it's ModelScope.
            const isModelScope = url.includes('modelscope.cn');
            // 修复：排除超时错误中的 "exceeded" 误匹配
            const isQuotaExceeded = !isTimeout && (
                errMsg.toLowerCase().includes('quota') ||
                errMsg.toLowerCase().includes('rate limit') ||
                errMsg.includes('额度')
            );

            // ModelScope specific logic: Intermittent 401s are observed even with valid keys.
            const shouldRetry = !statusCode ||
                ([429, 500, 502, 503, 504].includes(statusCode) && !isQuotaExceeded) ||
                (isModelScope && statusCode === 401);

            if (shouldRetry && retries > 1) {
                retries--;
                // For 429 or ModelScope 401, wait longer
                const isHeavyError = statusCode === 429 || (isModelScope && statusCode === 401);
                const baseDelay = isHeavyError ? 3000 : 1000;
                // Add exponential factor to delay
                const multiplier = (5 - retries);
                const delay = (baseDelay * multiplier) + Math.random() * 3000;
                console.log(`[OpenAI Compatible] Retrying ${url} in ${delay.toFixed(0)} ms due to ${statusCode || 'Network Error'}... (Attempts left: ${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (error.response?.data) {
                console.error(`[OpenAI Compatible] Full error response:`, JSON.stringify(error.response.data, null, 2));
            }

            // Localize common quota errors for Better User Experience
            let finalMsg = errMsg;
            if (isQuotaExceeded) {
                finalMsg = `今日 AI 请求额度已耗尽 (ModelScope)。请尝试：1. 切换到“火山引擎 (Doubao)”等其他模型；2. 或明天再试。`;
            }

            throw new Error(`API Request Failed: ${finalMsg} (Status: ${statusCode})`);
        }
    }
    throw new Error("API Request Failed after retries");
}

async function callOpenAIImageGeneration(
    config: ModelConnection,
    prompt: string,
    aspectRatio: string = "16:9",
    resolution?: string,
    styleImageUrl?: string  // 新增：风格参考图 URL（用于火山引擎图生图）
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        // [Debug] Aggressive Sanitization: Keep ONLY visible ASCII (32-126)
        // This removes hidden control chars, non-breaking spaces, zero-width spaces, etc.
        const safeKey = config.apiKey.replace(/[^ -~]/g, "");

        if (config.apiKey !== safeKey) {
            console.warn(`[API Key Warning] Key contained invalid characters! Replacing with sanitized version.`);
        }

        // Debug: If sanitized key is still weirdly empty or short, warn
        if (safeKey.length < 10) {
            console.warn(`[API Key Warning] Sanitized key is suspiciously short: "${safeKey}"`);
        }

        headers['Authorization'] = `Bearer ${safeKey}`;
    }

    const sizeMap: Record<string, string> = {
        "16:9": "1792x1024",
        "4:3": "1024x768",
        "1:1": "1024x1024",
        "3:4": "768x1024",
        "9:16": "1024x1792"
    };

    // 智谱 AI (Zhipu BigModel) 特殊处理：支持 URL、GLM 模型名以及 CogView 系列
    const isZhipu = config.baseUrl.toLowerCase().includes('bigmodel.cn') ||
        config.model.toLowerCase().includes('glm') ||
        config.model.toLowerCase().includes('cogview') ||
        config.model.toLowerCase().includes('zhipu');
    // 火山引擎（即梦/Doubao-Image）特性检测
    const isVolcengine = config.baseUrl.toLowerCase().includes('volces.com') || config.baseUrl.toLowerCase().includes('volcengine');

    let size = resolution ? resolution : (sizeMap[aspectRatio] || "1792x1024");

    // 智谱模式下，显式调用 calculateFinalResolution 以获取官方推荐值
    if (isZhipu && !resolution) {
        size = calculateFinalResolution(config.model, aspectRatio, true);
    }

    if (isVolcengine) {
        const volcengineResolutionMap: Record<string, Record<string, string>> = {
            'min': {
                "16:9": "2560x1440",
                "4:3": "2240x1696",
                "1:1": "1920x1920",
                "3:4": "1696x2240",
                "9:16": "1440x2560"
            },
            '2K': {
                "16:9": "2560x1440",
                "4:3": "2240x1696",
                "1:1": "2048x2048",
                "3:4": "1696x2240",
                "9:16": "1440x2560"
            },
            '4K': {
                "16:9": "3840x2176",
                "4:3": "3072x2304",
                "1:1": "2560x2560",
                "3:4": "2304x3072",
                "9:16": "2176x3840"
            }
        };
        let userTier = 'min';
        if (resolution) {
            const [rw, rh] = resolution.split('x').map(Number);
            const requestedPixels = rw * rh;
            if (requestedPixels >= 8000000) userTier = '4K';
            else if (requestedPixels >= 4000000) userTier = '2K';
        }
        size = volcengineResolutionMap[userTier][aspectRatio] || size;
    }

    // 确保 W/H 是 32 的倍数 (仅智谱、火山引擎等有该要求的 provider)
    let [finalW, finalH] = size.split('x').map(Number);
    if (isZhipu || isVolcengine) {
        finalW = Math.round(finalW / 32) * 32;
        finalH = Math.round(finalH / 32) * 32;
    }
    size = `${finalW}x${finalH}`;

    console.log(`[OpenAI Image] Calling: ${config.baseUrl}/images/generations, Model: ${config.model}, Size: ${size}`);

    const body: any = {
        model: config.model,
        prompt: prompt,
        n: 1,
        size: size,
    };

    if (isZhipu) {
        body.quality = "hd"; // Zhipu CogView-3-plus 推荐使用 hd
        body.watermark_enabled = false; // 官方 V4 接口标准参数
        body.watermark = false;        // 部分中转或旧版参数
        body.has_watermark = false;    // 额外探测参数
        body.watermark_type = 0;       // 部分中转接口参数 (0 表示不开启水印)
    }

    if ((isVolcengine || config.baseUrl.includes('openai.com')) && !isZhipu) {
        body.response_format = "b64_json";
    }

    if (isVolcengine) {
        const promptHash = prompt.substring(0, 200).split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
        }, 0);
        const seed = Math.abs(promptHash) % 2147483647;
        body.seed = seed;
        if (styleImageUrl) {
            body.image = styleImageUrl;
            body.sequential_image_generation = "disabled";
        } else {
            body.sequential_image_generation = "disabled";
        }
        body.watermark = false;
        body.stream = false;
    }

    // 通用参考图生图支持：非火山引擎/智谱 provider 如有 styleImageUrl，也传入 image 参数
    // 注意：styleImageUrl 已经过 Vision 模型分析提取为文本描述注入 prompt，
    // 此处 image 参数仅为支持图生图能力（如火山/即梦/部分智谱），非必需。
    // 对于 OpenAI 兼容/DALL-E 格式/自定义中转等不支持 raw image 参数的 provider，应跳过。
    // 判断逻辑：基于静态兼容性列表，仅已知支持的 provider 传入 image 参数。
    if (styleImageUrl && !body.image) {
        const supportsRawImageParam = isVolcengine || isZhipu;
        if (supportsRawImageParam) {
            body.image = [styleImageUrl];
            console.log(`[OpenAI Image] Sending reference image to provider that supports image param`);
        } else {
            console.log(`[OpenAI Image] Provider does not support raw image param, skipping reference image (vision-extracted style will be used via prompt)`);
        }
    }

    // ModelScope (Tongyi) specific handling
    const isModelScope = config.baseUrl.includes('modelscope.cn');
    if (isModelScope) {
        // Error message explicitly requested 'true'
        headers['X-ModelScope-Async-Mode'] = 'true';
    }

    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let url = baseUrl;
    if (!url.toLowerCase().endsWith('/images/generations')) {
        url = `${baseUrl}/images/generations`;
    }

    let retries = 3;
    while (retries > 0) {
        try {
            console.log(`[OpenAI Image] Calling: ${url}, Model: ${config.model}, Size: ${size} (Attempts left: ${retries})`);
            // 不输出完整 Body（含超大 base64 图片），只输出关键字段
            console.log(`[OpenAI Image] Request: model=${body.model}, n=${body.n}, size=${body.size}, prompt_len=${body.prompt?.length || 0}, has_image=${!!body.image}`);
            const safeHeaders = { ...headers, Authorization: headers.Authorization ? `${(headers.Authorization as string).slice(0, 22)}...` : undefined };
            console.log(`[OpenAI Image] Headers:`, JSON.stringify(safeHeaders));

            // Standard Sync Call (or Async Initiation for ModelScope)
            const response = await axios.post(url, body, { headers, timeout: 600000 });

            if (response.data && !isModelScope) {
                console.log(`[OpenAI Image] Response Summary: Status ${response.status}, Data Keys: ${Object.keys(response.data).join(', ')}`);
                if (response.data.data && Array.isArray(response.data.data)) {
                    console.log(`[OpenAI Image] Data Items: ${response.data.data.length}`);
                }
            }

            // --- ModelScope Async Handling ---
            if (isModelScope && response.data && (response.data.task_id || response.data.output?.task_id)) {
                console.log(`[OpenAI Image] ModelScope Async Response:`, JSON.stringify(response.data));
                const taskId = response.data.task_id || response.data.output?.task_id;
                console.log(`[OpenAI Image] ModelScope Async Task Started: ${taskId}, polling...`);

                let polls = 0;
                // Poll every 2 seconds, timeout after ~5 minutes (150 polls)
                while (polls < 150) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    polls++;

                    // Construct Polling URL: .../v1/tasks/{id}
                    const pollUrl = `${baseUrl}/tasks/${taskId}`;
                    console.log(`[OpenAI Image] Polling URL: ${pollUrl}`);

                    try {
                        // FIX: ModelScope requires Task-Type header for polling
                        const taskResp = await axios.get(pollUrl, {
                            headers: {
                                'Authorization': headers['Authorization'],
                                'X-ModelScope-Task-Type': 'image_generation'
                            }
                        });

                        // Parse status: SUCCEED (ModelScope), SUCCEEDED (Standard), FAILED, RUNNING, PENDING
                        const taskData = taskResp.data.output || taskResp.data;
                        const taskStatus = taskData.task_status;

                        console.log(`[OpenAI Image] ModelScope Poll ${polls}: ${taskStatus}`);

                        if (taskStatus === 'SUCCEEDED' || taskStatus === 'SUCCEED') {
                            // Extract Image URL
                            // Variant 1: results structure: [{ url: "..." }]
                            // Variant 2: output_images: ["url..."] (from python example)
                            let imageUrl: string | undefined;

                            if (taskData.results && taskData.results[0]?.url) {
                                imageUrl = taskData.results[0].url;
                            } else if (taskData.output_images && Array.isArray(taskData.output_images) && taskData.output_images.length > 0) {
                                imageUrl = taskData.output_images[0];
                            }

                            if (imageUrl) {
                                console.log(`[OpenAI Image] ModelScope Success! Downloading: ${imageUrl}`);
                                const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                                const base64 = `data:image/png;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}`;
                                return await saveBase64Image(base64, 'gen_ai');
                            }
                            throw new Error(`ModelScope succeeded but no image URL found. Data: ${JSON.stringify(taskData)}`);
                        } else if (taskStatus === 'FAILED') {
                            throw new Error(`ModelScope Task Failed: ${JSON.stringify(taskData)}`);
                        }
                        // Continue polling if RUNNING or PENDING
                    } catch (pollErr: any) {
                        console.warn("[OpenAI Image] Polling error (retrying):", pollErr.message);
                        if (pollErr.response?.status === 500 || pollErr.response?.status === 404) {
                            console.warn("[OpenAI Image] Task not found or Server Error, likely invalid ID or Task Type.");
                        }
                    }
                }
                throw new Error("ModelScope AsyncTask Timed Out (5 mins)");
            }
            // -------------------------------

            // 增强型数据提取逻辑：部分中转或智谱新接口可能把数据放在 output 或其它字段
            const results = response.data?.data || response.data?.output || (response.data?.results && Array.isArray(response.data?.results) ? response.data.results : null);
            const firstResult = Array.isArray(results) ? results[0] : (results && typeof results === 'object' ? results : null);

            if (firstResult?.b64_json) {
                const base64 = `data:image/png;base64,${firstResult.b64_json}`;
                return await saveBase64Image(base64, 'gen_ai');
            } else if (firstResult?.url) {
                // If URL is returned, fetch and convert to base64 then save
                const imageResponse = await axios.get(firstResult.url, { responseType: 'arraybuffer' });
                const base64 = `data:image/png;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}`;
                return await saveBase64Image(base64, 'gen_ai');
            }

            // 最后的兜底：检查 response.data 本身是否就是 base64 或包含 URL
            if (response.data?.url) {
                const imageResponse = await axios.get(response.data.url, { responseType: 'arraybuffer' });
                const base64 = `data:image/png;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}`;
                return await saveBase64Image(base64, 'gen_ai');
            }

            throw new Error(`No image data returned from API. Raw Response: ${JSON.stringify(response.data).substring(0, 500)}`); // Should be caught by catch block
        } catch (error: any) {
            let errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const statusCode = error.response?.status;

            // Try to parse string response body for better error message (e.g. Proxy returning JSON inside text)
            if (typeof error.response?.data === 'string') {
                try {
                    // Look for JSON-like content
                    const jsonMatch = error.response.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.error?.message) {
                            errMsg = `Upstream: ${parsed.error.message}`;
                        } else if (parsed.message) {
                            errMsg = `Upstream: ${parsed.message}`;
                        } else if (parsed.errors?.message) {
                            errMsg = `Upstream: ${parsed.errors.message}`;
                        }
                    } else {
                        // Use raw string if short
                        if (error.response.data.length < 200) errMsg = error.response.data;
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }

            console.error(`[OpenAI Image] Attempt failed: ${errMsg} (Status: ${statusCode})`);

            // Only retry on specific status codes or network errors (including 429 Rate Limit)
            const shouldRetry = !statusCode || [429, 500, 502, 503, 504].includes(statusCode);

            if (shouldRetry && retries > 1) {
                retries--;
                const delay = statusCode === 429 ? 3000 : 2000;
                console.log(`[OpenAI Image] Retrying in ${delay / 1000} seconds due to ${statusCode || 'Network Error'}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            console.error(`[OpenAI Image] Full error response:`, JSON.stringify(error.response?.data || {}, null, 2));
            throw new Error(`Image Generation Failed: ${errMsg} (Status: ${statusCode})`);
        }
    }
    throw new Error("Image Generation Failed after retries");
}

// --- Exported Services ---

export const AIService = {

    async smartRefine(text: string, type: 'requirement' | 'content' | 'requirement_polish' | 'template_description', settings?: AppSettings, userId?: string): Promise<string> {
        if (process.env.MOCK_AI === '1') {
            const t = text === undefined || text === null ? '' : String(text);
            if (!t.trim()) return '';
            return t.trim();
        }

        const contentCheck = contentFilter.check(text);
        if (contentCheck.riskLevel === 'high') {
            await AuditService.log({
                type: 'CONTENT_VIOLATION',
                reason: contentCheck.reason || 'High risk content detected',
                severity: 'high',
                content: text.substring(0, 200),
                userId,
            });
            throw new Error(`内容审核失败: ${contentCheck.reason}`);
        }

        if (injectionDetector.isInjectionAttempt(text)) {
            const patterns = injectionDetector.detectPatterns(text);
            await AuditService.log({
                type: 'PROMPT_INJECTION',
                reason: `Detected injection patterns: ${patterns.join(', ')}`,
                severity: 'critical',
                content: text.substring(0, 200),
                userId,
            });
            throw new Error('检测到不安全的输入内容，请修改后重试');
        }

        const sanitized = promptSanitizer.sanitize(text);
        if (sanitized.wasSanitized) {
            console.log('[AI] User input sanitized:', sanitized.detectedPatterns);
        }
        const cleanText = sanitized.cleanedText;

        const config = await resolveActiveConfig(settings, 'text');
        const prompt = PROMPT_TEMPLATES[type]?.(cleanText) || PROMPT_TEMPLATES.content(cleanText);

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model,
                contents: prompt,
            });
            return response.text?.trim() || text;
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages, 0.7, false, 'text');
        }
    },

    async generateSnapshotSummary(diffContext: string, settings?: AppSettings): Promise<string> {
        if (process.env.MOCK_AI === '1') {
            const ctx = diffContext === undefined || diffContext === null ? '' : String(diffContext);
            if (!ctx.trim()) return '常规保存';
            return '常规保存';
        }
        const config = await resolveActiveConfig(settings, 'text');
        const prompt = `
            Task: Summarize the changes in a presentation project based on the provided diff context.
            Context: "${diffContext}"
            Requirement: 
            1. Language: Simplified Chinese (简体中文).
            2. Concise (under 20 words).
            3. Focus on what changed (e.g. "Updated title to 'AI Future' and added 2 slides", "Changed theme to Cyberpunk").
            4. If no meaningful change indicated in context, return "常规保存".
            5. Return ONLY the summary text, no conversational filler.
        `;

        console.log(`[AIService] Generating snapshot summary with model: ${config.model}`);

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model,
                contents: prompt,
            });
            return response.text?.trim() || "常规保存";
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages, 0.7, false, 'text');
        }
    },

    async extractTextFromFile(resourcePath: string, fileType: string, settings?: AppSettings): Promise<{ content: string, fallback?: boolean, provider?: string }> {
        const mineruKey = settings?.docParser?.apiKey;
        const extension = path.extname(resourcePath).toLowerCase();

        // 1. MinerU (Remote) - Universal Support
        if (mineruKey) {
            const isMinerUSupported = [
                '.pdf', '.docx', '.doc', '.pptx', '.ppt',
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
                '.html', '.htm'
            ].includes(extension) || fileType.includes('pdf') || fileType.includes('word') || fileType.includes('presentation');

            if (isMinerUSupported) {
                try {
                    const { MinerUService } = await import('./mineru.service');
                    const modelVersion = (extension === '.html' || extension === '.htm' || fileType.includes('html')) ? 'MinerU-HTML' : 'vlm';

                    console.log(`[AIService] Attempting MinerU Parsing (${modelVersion}) for ${extension || fileType}...`);
                    const markdown = await MinerUService.parseFile(resourcePath, {
                        apiKey: mineruKey,
                        baseUrl: settings?.docParser?.baseUrl || 'https://mineru.openxlab.org.cn',
                        provider: 'MinerU'
                    }, modelVersion);

                    console.log('[AIService] MinerU Success.');
                    return { content: markdown, provider: 'MinerU' };
                } catch (mineruError: any) {
                    console.warn(`[AIService] MinerU Failed: ${mineruError.message}`);
                    // Fall through to local parsing
                }
            }
        }

        // 2. Specific Local Fallbacks
        if (fileType === 'application/pdf' || extension === '.pdf') {

            // 2. Local Fallback (pdf-parse)
            try {
                console.log('[AIService] Attempting Local PDF Parsing (pdf-parse)...');
                // Deeply examine the module structure to handle various export patterns (CJS/ESM/Default)
                const pdfLib = require('pdf-parse');
                console.log('[AIService] pdf-parse module type:', typeof pdfLib);

                let pdf: any;
                if (typeof pdfLib === 'function') {
                    pdf = pdfLib;
                } else if (pdfLib && typeof pdfLib.default === 'function') {
                    pdf = pdfLib.default;
                } else if (pdfLib && typeof pdfLib.pdf === 'function') {
                    pdf = pdfLib.pdf;
                }

                if (typeof pdf !== 'function') {
                    console.error('[AIService] pdf-parse loading failed: resolve result is not a function. Structure keys:', Object.keys(pdfLib || {}));
                    throw new Error('pdf-parse is not a function after resolution');
                }

                const buffer = await readResourceBuffer(resourcePath);
                const data = await pdf(buffer);

                if (data && data.text && data.text.length > 50) {
                    console.log('[AIService] Local PDF Parse Success.');
                    return { content: data.text, provider: 'Local PDF' };
                } else {
                    console.warn('[AIService] Local PDF Parse Result too short or empty.');
                }
            } catch (localError: any) {
                console.warn(`[AIService] Local PDF Failed: ${localError.message}`);
            }

            console.warn('[AIService] All Text Parsing failed for PDF. Checking Vision capabilities...');
        }

        const config = await resolveActiveConfig(settings, 'vision');

        // Simple Text
        if (fileType === 'text/plain' || resourcePath.endsWith('.md') || resourcePath.endsWith('.txt')) {
            const buffer = await readResourceBuffer(resourcePath);
            return { content: buffer.toString('utf-8'), provider: 'Local' };
        }

        // Word
        if (resourcePath.endsWith('.docx') || fileType.includes('word')) {
            const buffer = await readResourceBuffer(resourcePath);
            const result = await mammoth.extractRawText({ buffer });
            if (result.value.trim()) return { content: result.value, provider: 'Local' };
        }

        // Determine whether this was a fallback from PDF
        const isFallback = (fileType === 'application/pdf');

        // 🚨 CRITICAL CHECK: Vision Model Compatibility for PDF
        // OpenAI/Volcengine (Doubao) Vision models DO NOT support application/pdf in image_url.
        // Only Gemini Native supports it via inlineData.
        const isGeminiNative = shouldUseGeminiNative(config, settings);

        if (isFallback && !isGeminiNative) {
            throw new Error("当前使用的模型（OpenAI/火山引擎）不支持直接分析 PDF 文件。请先将 PDF 转换为图片，或切换至 Google Gemini 模型，或配置 MinerU 解析服务。");
        }

        // AI Vision
        const base64 = await resourceToBase64(resourcePath);

        if (isGeminiNative) {
            const ai = createGoogleClient(config);
            const contents = [
                { inlineData: { mimeType: fileType, data: base64 } },
                { text: "Please analyze this file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format that can be used to generate a presentation outline. Language: Simplified Chinese (简体中文)." }
            ];
            const response = await ai.models.generateContent({
                model: config.model,
                contents: { parts: contents } as any
            });
            return {
                content: response.text?.trim() || "",
                fallback: isFallback,
                provider: 'Gemini Vision'
            };
        } else {
            // OpenAI Vision (Images Only)
            const messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please analyze this image/file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format. Language: Simplified Chinese." },
                        { type: "image_url", image_url: { url: `data:${fileType};base64,${base64}` } }
                    ]
                }
            ];
            const text = await callOpenAICompatible(config, messages, 0.7, false, 'text');
            return {
                content: text,
                fallback: isFallback,
                provider: 'OpenAI Vision'
            };
        }
    },

    async generateOutline(topic: string, configStyle: StyleConfig, settings: AppSettings): Promise<OutlineItem[]> {
        if (process.env.MOCK_AI === '1') {
            const safeTopic = topic === undefined || topic === null ? '' : String(topic);
            const { targetPageCount, pageStructure } = configStyle;
            const structure = { ...(pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }) };
            const fixedSum = (structure.cover || 0) + (structure.directory || 0) + (structure.transition || 0) + (structure.end || 0);
            structure.content = Math.max(1, (targetPageCount || 10) - fixedSum);

            const seq: Array<'cover' | 'directory' | 'transition' | 'content' | 'end'> = [];
            for (let i = 0; i < (structure.cover || 0); i++) seq.push('cover');
            for (let i = 0; i < (structure.directory || 0); i++) seq.push('directory');
            for (let i = 0; i < (structure.transition || 0); i++) seq.push('transition');
            for (let i = 0; i < (structure.content || 0); i++) seq.push('content');
            for (let i = 0; i < (structure.end || 0); i++) seq.push('end');

            const sliced = seq.slice(0, targetPageCount || seq.length);
            return sliced.map((pageType, index) => ({
                id: Math.random().toString(36).slice(2, 11),
                index: index + 1,
                title: pageType === 'cover' ? `封面：${safeTopic || '主题'}` :
                    pageType === 'directory' ? '目录' :
                        pageType === 'transition' ? '章节概览' :
                            pageType === 'end' ? '谢谢' :
                                `要点 ${index + 1}`,
                brief: pageType === 'content' ? `这是「${safeTopic || '主题'}」的关键要点示例，用于 E2E 测试。` : '',
                pageType,
                status: 'idle'
            }));
        }
        const config = await resolveActiveConfig(settings, 'text');

        const { targetPageCount, pageStructure } = configStyle;
        const structure = { ...(pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }) };

        // 自动校准正文页数,确保总数一致
        const fixedSum = (structure.cover || 0) + (structure.directory || 0) + (structure.transition || 0) + (structure.end || 0);
        structure.content = Math.max(1, targetPageCount - fixedSum);

        const prompt = `
            Task: 根据以下提供的内容，生成一份结构化的 PPT 演示大纲。大纲中的所有内容必须严格来源于下方提供的内容，不得引入外部知识或编造信息。
            以下提供的内容将作为"主题"或"源文档"：
            "${topic}"
            
            【严格限制】:
            1. 总页数必须正好为: ${targetPageCount} 页。
            2. 页面组成结构必须严格遵守以下配比:
               - 封面页 (cover): ${structure.cover} 页
               - 目录页 (directory): ${structure.directory} 页
               - 章节过渡页 (transition): ${structure.transition} 页
               - 内容正文页 (content): ${structure.content} 页
               - 结束页 (end): ${structure.end} 页
            
            【推荐页面顺序指南 (必须遵守)】:
            ${(() => {
                const seq: string[] = [];
                const targetSequence: string[] = [];
                for (let i = 0; i < (structure.cover || 0); i++) targetSequence.push('cover');
                for (let i = 0; i < (structure.directory || 0); i++) targetSequence.push('directory');

                const transitions = structure.transition || 0;
                const contents = structure.content || 0;
                if (transitions === 0) {
                    for (let i = 0; i < contents; i++) targetSequence.push('content');
                } else {
                    // Logic: N Transitions create N Chapters.
                    // Sequence: Transition -> Content(s) -> Transition -> Content(s) ...
                    const groupSize = Math.floor(contents / transitions);
                    const remainder = contents % transitions;
                    for (let i = 0; i < transitions; i++) {
                        targetSequence.push('transition');
                        const count = groupSize + (i < remainder ? 1 : 0);
                        for (let j = 0; j < count; j++) { targetSequence.push('content'); }
                    }
                }
                for (let i = 0; i < (structure.end || 0); i++) targetSequence.push('end');

                return targetSequence.map((t, i) => `第 ${i + 1} 页: ${t}`).join(', ');
            })()}

            【关键规则】:
            - 如果某个页面类型的数量为 0,则 **严禁** 生成该类型的页面。
            - 生成的页面总数必须与上述配比的总和(${structure.cover + structure.directory + structure.transition + structure.content + structure.end})以及设定的总页数(${targetPageCount})完全一致。
            
            【内容要求】:
            1. 逻辑清晰: 内容正文应围绕主题展开,如果有章节过渡页,请在章节开始前插入。
            2. 输出语言: 简体中文。

            【brief 字段 - 按页面类型严格遵循以下规范 (最重要)】:
            brief 字段的内容将直接作为该页面的展示文案，必须写"幻灯片上用户能看到的文字"，而非"对幻灯片的设计描述"。

            - cover (封面页): brief 必须写成"封面一句话定位语/副标题"，例如"全面解析九功平台与H3C灵犀在六大核心维度的差异化竞争力"。该内容将作为封面副标题展示，主标题已由 title 字段提供。严禁写"封面页""展示主题""展示演讲者"等描述性文字。日期和讲解人由系统自动添加，cover brief 中不得包含日期和人名。
            - directory (目录页): brief 必须写成带序号前缀的列表，用分隔符连接。例如"一、产品定位与架构 · 二、前端AI助手 · 三、后台管理"。每个章节名称前必须有"一、二、三"或"1、2、3"等序号前缀，让观众一目了然。严禁出现"本次演示分为X个部分""本章节包括"等描述前缀。
            - end (结束页): brief 必须写成简短的收尾语，仅保留对观众有意义的实质内容。例如"期待交流合作"。严禁包含"感谢观看""谢谢观看"等冗余客套（标题已表达谢意），严禁展示文件版本号、文档元数据等附件信息。
            - content (正文页): brief 写该页核心观点的概要提炼，作为后续生成正文的参考指引。
            - transition (过渡页): brief 写该章节的概述，简洁说明章节内容方向。

            3. 简洁有力: 每页的 brief 应当精炼直接,不宜过长。
            
            【输出格式】:
            返回一个 JSON 数组,数组长度必须为 ${targetPageCount}。
            每个对象包含以下字段:
            - title: 页面标题
            - brief: 页面的直接展示文案（将作为该页面的实际内容显示，而非设计描述）
            - pageType: 必须是 "cover" | "directory" | "transition" | "content" | "end" 中的一个。
            
            【brief 字段规范 (重要)】:
            brief 将直接作为该页面的展示文字，必须按页面类型写"观众在幻灯片上看到的文案"：
            - cover: 封面一句话定位语/副标题，主标题已由 title 提供。禁止"封面页展示主题"等描述。日期和讲解人系统自动添加，brief中不得包含。
            - directory: 带序号前缀的列表，如"一、A · 二、B · 三、C"。禁止"本次演示分为X个部分"。
            - end: 简短收尾语。禁止"感谢观看"(标题已含谢意)、禁止版本号/文件元数据。
            - content: 该页核心观点概要。
            - transition: 章节方向概述。
            
            注意: 严禁返回任何 Markdown 代码块标签,只返回原始 JSON。
        `;

        let jsonStr = "";
        try {
            if (shouldUseGeminiNative(config, settings)) {
                // Native JSON mode
                const ai = createGoogleClient(config);
                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                    // Note: Skipping complex schema config for brevity in this migration step, relying on prompt
                });
                jsonStr = response.text?.trim() || "[]";
            } else {
                const systemPrompt = `Role: PPT大纲规划师，擅长根据主题和风格要求，生成结构清晰、内容详尽的PPT大纲。
                Requirements:
                1. Structure: Generate an outline with approximately ${targetPageCount} main sections/slides.
                2. Content: Each section should have a clear 'title' and a concise 'brief' (summary).
                3. Language: Strictly Simplified Chinese (简体中文).
                4. Output Format: valid JSON array only. No Markdown.
                `;

                const userPrompt = `Task: 为主题 "${topic}" 生成一个PPT大纲。
                Style Requirements:
                - ${configStyle?.styleName ? `风格: ${configStyle.styleName}` : '风格: 默认专业风格'}

                【Output Format】:
                Return a JSON array, the length must be ${targetPageCount}.
                Each object must handle: title, brief, pageType ("cover"|"directory"|"transition"|"content"|"end").
                `;

                const messages = [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ];
                // Disable jsonMode (false) to avoid 401/400 errors with providers like ModelScope that may not support response_format
                jsonStr = await callOpenAICompatible(config, messages, 0.7, false);
            }
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

            console.log('[GenerateOutline] Raw AI Response:', jsonStr);

            let parsed: any;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (e: any) {
                // Fallback: Try to find a JSON array pattern in the string if strict parse fails
                const match = jsonStr.match(/\[.*\]/s);
                if (match) {
                    try {
                        parsed = JSON.parse(match[0]);
                    } catch (err: any) {
                        throw new Error(`Failed to parse extracted JSON array: ${err.message}`);
                    }
                } else {
                    throw new Error(`Invalid JSON format: ${e.message}`);
                }
            }

            // Robustness: If result is an object but not an array (e.g. { "outline": [...] }), try to extract the array
            if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
                console.warn('[GenerateOutline] Received Object instead of Array, attempting to extract array...');
                // 1. Check for common keys
                const candidateKeys = ['outline', 'pages', 'slides', 'chapters', 'items', 'list'];
                let foundKey = candidateKeys.find(key => Array.isArray((parsed as any)[key]));

                // 2. If not found, just take the first value that is an array
                if (!foundKey) {
                    foundKey = Object.keys(parsed).find(key => Array.isArray((parsed as any)[key]));
                }

                if (foundKey) {
                    console.log(`[GenerateOutline] Extracted array from key: '${foundKey}'`);
                    parsed = (parsed as any)[foundKey];
                }
            }

            if (!Array.isArray(parsed)) {
                throw new Error(`AI Response is not a valid array. Type: ${typeof parsed}`);
            }

            return parsed.map((item: any, index: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                index: index + 1,
                title: item.title,
                brief: item.brief,
                pageType: item.pageType || 'content',
                status: 'idle'
            }));
        } catch (e: any) {
            console.error("Outline Gen Error", e);
            throw new Error(`Failed to generate outline: ${e.message}`);
        }
    },

    async generateSingleOutlineItem(topic: string, index: number, total: number, settings?: AppSettings): Promise<{ title: string, brief: string }> {
        const config = await resolveActiveConfig(settings, 'text');
        const prompt = `
            Context: Generating a PowerPoint outline for topic "${topic}".
            Task: Create a single slide entry for Slide #${index} out of ${total}.
            Requirements:
            1. Language: Simplified Chinese (简体中文).
            2. Return a JSON object with keys: "title", "brief".
            3. Do NOT wrap in markdown code blocks.
        `;

        try {
            let jsonStr = "";
            if (shouldUseGeminiNative(config, settings)) {
                const ai = createGoogleClient(config);
                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                brief: { type: Type.STRING }
                            },
                            required: ["title", "brief"]
                        }
                    }
                });
                jsonStr = response.text?.trim() || "{}";
            } else {
                const messages = [
                    { role: "system", content: "You are a JSON generator. Return only valid JSON object." },
                    { role: "user", content: prompt }
                ];
                // Disable jsonMode to avoid 401/400 errors with ModelScope
                jsonStr = await callOpenAICompatible(config, messages, 0.7, false);
                jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            }
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Generate Single Item Error", error);
            throw error;
        }
    },

    async generateSlideDetail(
        title: string,
        brief: string,
        topicContext: string,
        index: number,
        total: number,
        pageType: string,
        settings?: AppSettings
    ): Promise<string> {
        if (process.env.MOCK_AI === '1') {
            const t = title === undefined || title === null ? '' : String(title);
            const b = brief === undefined || brief === null ? '' : String(brief);
            return `- ${t || '要点'}\n- ${b || '示例内容（用于 E2E 测试）'}\n\n---DESIGN_SUGGESTION_START---\n**设计建议：** 采用左右分栏布局：左侧标题与要点列表，右侧使用图标/流程箭头表达逻辑。`;
        }
        const config = await resolveActiveConfig(settings, 'text');
        const prompt = `Topic Context (Source Document Content): ${topicContext}
            Slide Title: ${title}
            Slide Intent: ${brief}
            
            Structural Context:
            - This is slide ${index} of ${total} in the entire presentation.
            - Page Type: ${pageType}
            
            Task: Write the full, detailed content for this slide strictly based on the source document content provided above in "Topic Context".
            
            [CRITICAL FIDELITY REQUIREMENT]:
            - You MUST derive ALL substantive content from the "Topic Context (Source Document Content)" section above.
            - DO NOT fabricate facts, data, statistics, case studies, or examples that do not exist in the source document.
            - If the source document covers a topic, summarize and present it faithfully. DO NOT add external knowledge.
            - You MAY rephrase, restructure, or polish the language for presentation clarity, but the core meaning MUST come from the source.
            - [FORBIDDEN] Generating entirely new sections or claims not supported by the source.
            
            [CRITICAL OUTPUT FORMAT RULE - STRICTLY ENFORCED]:
            - [FORBIDDEN] Do NOT include any meta-description, structural context, or self-referential text in the output.
            - [FORBIDDEN] Do NOT write phrases like "This is slide X of Y", "根据...分析，第X张幻灯片的内容如下", "以下是...的内容", "Page Type indicates", or any similar framing.
            - [FORBIDDEN] Do NOT describe what the slide "is" or "contains". Instead, directly output the slide's actual content.
            - The output must be ONLY the slide content that the audience can see and read. No explanations, no labels, no descriptions of the slide itself.
            
            Requirements:
            1. Language: Strictly Simplified Chinese (简体中文).
            2. Include bullet points, key arguments, or data placeholders.
            3. Use a professional tone.
            4. Content length: ${pageType === 'content' ? '150-250' : '50-100'} words.
            
            [CRITICAL VISUAL INSTRUCTION]:
            At the end of your response (after the content), you MUST append a specific design suggestion field:
            
            Format:
            **设计建议：** <Your suggestion here>
            
            Instructions for this field:
            - Act as a Senior Art Director.
            - FOCUS ONLY on Layout, Structure, Charts, Shapes, and Icons.
            - [STRICTLY FORBIDDEN]: Do NOT mention colors, palettes, art styles, or lighting.
            - [Layout]: Suggest the best layout (e.g., 'Left-Right Split', 'Timeline', '3-Column Card').
            - [Hierarchy]: Define visual weight (e.g., "Make the Central Concept 2x larger than supporting points", "Use size contrast to distinguish Main Title from Sub-points").
            - [Logic]: Define connection logic (e.g., "Use arrows to show flow A -> B", "Use concentric circles to show inclusion", "Use connecting lines to show network").
            - [Shapes]: Suggest visual metaphors (e.g., 'Funnel', 'Honeycomb', 'Pyramid').
            - SEPARATOR REQUIRED: You MUST put the separator "---DESIGN_SUGGESTION_START---" on a new line before the design suggestion.
            - Example: 
            
            (Content...)
            
            ---DESIGN_SUGGESTION_START---
            **设计建议：** 采用中心发散布局。核心概念'AI大脑'位于画面中央且尺寸最大（层级1）；四个子模块环绕周边（层级2），使用虚线箭头指向中心（逻辑：汇聚）。使用蜂窝状容器包裹每个模块。"`;

        try {
            if (shouldUseGeminiNative(config, settings)) {
                const ai = createGoogleClient(config);
                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: prompt,
                });
                return response.text?.trim() || "";
            } else {
                const messages = [{ role: "user", content: prompt }];
                return await callOpenAICompatible(config, messages, 0.7, false, 'text');
            }
        } catch (error) {
            console.error("Generate Detail Error", error);
            throw error;
        }
    },

    async generateSlideVariant(
        contentSource: string, // URL or Path
        styleFile: string | null,
        configStyle: StyleConfig,
        variantLabel: string,
        title: string,
        settings: AppSettings,
        contentType: 'text' | 'image',
        contentMimeType?: string,
        pageType?: string,
        fullContent?: string,
        globalStyleMap?: GlobalStyleMap,
        allSlideTitles?: string[],
        context?: { warning?: string }  // 新增: 用于传递降级信号
    ): Promise<string> {
        if (process.env.MOCK_AI === '1') {
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PtPhVwAAAABJRU5ErkJggg==';
        }
        const config = await resolveActiveConfig(settings, 'image');
        const targetRatio = configStyle.aspectRatio || "16:9";

        // 1. 智能拾取最佳风格参考图
        const effectivePageType = (pageType || 'content') as PageType;
        let { file: styleRef, matchType } = getStyleReference(effectivePageType, globalStyleMap);

        // 优先使用 globalStyleMap 中的匹配, 其次是旧参数 styleFile
        if (!styleRef && styleFile) {
            styleRef = styleFile;
            matchType = 'fallback';
        }

        // 2. Vision 预解析: 提取风格特征描述
        let styleKeywords = "";
        let hexColors: string[] = [];
        if (styleRef) {
            // 判断 provider 是否支持 raw image 参数，以决定 Vision 分析的字数上限
            const imgBaseUrl = config.baseUrl.toLowerCase();
            const imgModel = config.model.toLowerCase();
            const isVolcengine = imgBaseUrl.includes('volces.com') || imgBaseUrl.includes('volcengine');
            const isZhipu = imgBaseUrl.includes('bigmodel.cn') || imgModel.includes('glm') || imgModel.includes('cogview') || imgModel.includes('zhipu');
            const supportsRawImage = isVolcengine || isZhipu;
            const maxKeywordsLen = supportsRawImage ? 300 : 600;

            try {
                const analysis = await analyzeStyleImage(styleRef, effectivePageType, settings, maxKeywordsLen);
                styleKeywords = analysis.keywords;
                hexColors = analysis.hexColors;
                console.log(`[generateSlideVariant] Vision Analysis (${maxKeywordsLen} chars) for ${effectivePageType}: ${styleKeywords.substring(0, 50)}...`);
                if (hexColors.length > 0) {
                    console.log(`[generateSlideVariant] Extracted hex colors: ${hexColors.join(', ')}`);
                }
            } catch (err) {
                console.warn(`[generateSlideVariant] Vision analysis failed, continuing with prompt only.`, err);
            }
        }

        // 3. 构建智能 Prompt
        const rawContent = fullContent || (contentType === 'text' ? contentSource : "");
        let cleanContent = rawContent;
        let designSuggestion = "";

        // NEW LOGIC: Split by explicit separator
        const SEPARATOR = "---DESIGN_SUGGESTION_START---";
        if (rawContent.includes(SEPARATOR)) {
            const parts = rawContent.split(SEPARATOR);
            cleanContent = parts[0].trim();
            const suggestionPart = parts[1].trim();
            designSuggestion = suggestionPart.replace(/\*\*设计建议：?\*\*/, '').trim();
        } else {
            // Fallback: Regex extraction for backward compatibility
            designSuggestion = extractDesignSuggestion(rawContent);
            if (designSuggestion) {
                cleanContent = rawContent.replace(/\*\*设计建议：?\*\*(?:.|\r|\n)*$/, '').trim();
            }
        }

        // 3.2 场景判别 + 交叉补全
        const scenario = detectInputScenario(styleRef, configStyle.requirements);
        const effectiveReqResult = extractPageSpecificRequirements(configStyle.requirements, effectivePageType);
        const effectiveRequirements = effectiveReqResult.content;
        if (effectiveReqResult.isFallback && context) {
            context.warning = 'SMART_FILTER_FALLBACK';
        }

        // 交叉补全: 根据场景填补信息缺口
        const { injectedKeywords, injectedHexes } = await complementScenarioInputs(
            scenario, styleKeywords, hexColors, effectiveRequirements, settings
        );

        // splitContent: 将混合的 cleanContent 拆解为数据/正文/要点三个独立块
        const { dataBlock, bodyBlock, keyPointsBlock } = splitContent(cleanContent);

        const prompt = buildImageGenerationPrompt({
            pageType: effectivePageType,
            title: title || '',
            content: cleanContent,
            dataBlock,
            bodyBlock,
            keyPointsBlock,
            styleName: configStyle.styleName,
            colorPalette: configStyle.colorPalette,
            requirements: effectiveReqResult,  // 传入完整预解析结果对象，避免 buildImageGenerationPrompt 中二次解析
            aspectRatio: targetRatio,
            styleMatchType: matchType,
            allSlideTitles: allSlideTitles,
            styleKeywords: styleKeywords,
            designSuggestion: designSuggestion,
            injectedKeywords: injectedKeywords,
            injectedHexes: injectedHexes,
        });

        // 4. 执行模型请求
        try {
            if (shouldUseGeminiNative(config, settings)) {
                // --- Gemini 原生分支 ---
                const ai = createGoogleClient(config);
                const apiRatio = getClosestSupportedRatio(targetRatio);
                const parts: any[] = [];

                // 4.1 内容参考 (如有)
                if (contentType === 'image') {
                    const base64 = await resourceToBase64(contentSource);
                    const mime = contentMimeType || 'image/png';
                    parts.push({ inlineData: { mimeType: mime, data: base64 } });
                    parts.push({ text: "内容参考图：请基于此构图生成 PPT 页面。" });
                }

                // 4.2 风格参考图 (赋予 Gemini 直接观察能力)
                if (styleRef) {
                    const styleBase64 = await resourceToBase64(styleRef);
                    parts.push({ inlineData: { mimeType: 'image/png', data: styleBase64 } });
                    // CRITICAL: Explicit instruction to separate Style from Content
                    parts.push({ text: "【高优先级指令】：上图仅作为【视觉风格参考】（配色、构图、装饰元素）。请完全忽略参考图中的所有文字、数据和具体内容。严禁照抄参考图中的文字！" });
                }

                // 4.3 混合 Prompt (文字指令 + 视觉分析结果)
                parts.push({ text: prompt });

                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: { parts },
                    generationConfig: {
                        candidateCount: 1,
                        imageConfig: { aspectRatio: apiRatio as any }
                    }
                } as any);

                if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts?.[0]?.inlineData) {
                    const base64 = response.candidates[0].content.parts[0].inlineData.data;
                    return await AssetService.save(`data:image/png;base64,${base64}`, 'png');
                } else if (response.candidates && response.candidates.length > 0 && response.candidates[0].content?.parts?.[0]?.text) {
                    // Some models return image as a link in text for some reason
                    throw new Error("Gemini returned text instead of image");
                }
                throw new Error("No image data in Gemini Native response");

            } else {
                // OpenAI Compatible / 火山引擎等
                const qualitySetting = settings?.imageGeneration?.resolution; // e.g., '3840x2160' acting as "4K Flag"
                const finalResolution = calculateFinalResolution(qualitySetting, targetRatio);

                console.log(`[generateSlideVariant] Resolution Calc: Quality=${qualitySetting}, Ratio=${targetRatio} -> ${finalResolution}`);

                // 准备风格参考图 URL（用于火山引擎图生图）
                // 🚨 关键逻辑修正：仅当参考图类型【精确匹配】当前页面类型时，才启用图生图模式！
                // 🚨 进一步优化：对于【Content 内容页】，为了避免布局千篇一律（同质化），强制【禁用图生图】，改用【文生图 + 强风格 Prompt】。
                // 这样可以保证风格一致（通过 Vision 提取的关键词），但布局会根据内容动态生成，实现多样性。
                let styleImageUrl: string | undefined;
                if (styleRef && matchType === 'exact' && pageType !== 'content') {
                    // 判断是 URL 还是本地路径
                    if (styleRef.startsWith('http://') || styleRef.startsWith('https://')) {
                        styleImageUrl = styleRef;
                    } else {
                        // 本地文件：转换为 base64 数据 URL
                        try {
                            const base64 = await resourceToBase64(styleRef);
                            styleImageUrl = `data:image/png;base64,${base64}`;
                            console.log(`[generateSlideVariant] Converted local style ref to base64 data URL`);
                        } catch (e) {
                            console.warn(`[generateSlideVariant] Failed to convert style ref to base64:`, e);
                        }
                    }
                }

                const base64Result = await callOpenAIImageGeneration(config, prompt, targetRatio, finalResolution, styleImageUrl);
                return await AssetService.save(base64Result, 'png');
            }
        } catch (error) {
            console.error("Generate Slide Variant Error", error);
            throw error;
        }
    },

    /**
     * 新增: 分析模版创作意图 (支持文本或文件)
     */
    async analyzeTemplateConcept(
        input: string | { path: string, mimeType: string },
        settings?: AppSettings
    ): Promise<StyleConfig> {
        // 1. 准备 Context
        let contextText = "";
        let visionPart: { mimeType: string, data: string } | null = null;
        let isVisionMode = false;

        // 处理输入
        if (typeof input === 'string') {
            // 纯文本输入
            contextText = input;
        } else {
            // 文件输入 (Vision 或 MinierU 提取后的文本)
            const { path: filePath, mimeType } = input;

            // 如果是 PDF/Word，先尝试提取文本 (复用 extractTextFromFile)
            if (mimeType === 'application/pdf' || mimeType.includes('word') || mimeType.includes('text') || filePath.endsWith('.md')) {
                const extracted = await AIService.extractTextFromFile(filePath, mimeType, settings);
                contextText = extracted.content;
            } else if (mimeType.startsWith('image/')) {
                // 图片: 启用 Vision 模式
                isVisionMode = true;
                const base64 = await resourceToBase64(filePath);
                visionPart = { mimeType, data: base64 };
            }
        }

        const config = await resolveActiveConfig(settings, isVisionMode ? 'vision' : 'text');

        // 2. 构建 Prompt
        const prompt = `
            Role: 资深视觉设计总监 & PPT 专家。
            Task: ${isVisionMode ? '分析这张设计图/PPT截图的【视觉风格】' : '分析用户的【设计需求描述】'}，并将其转化为结构化的 YH-AI PPT 设计规范。
            
            Input Context: ${isVisionMode ? '见附图' : `"${contextText.substring(0, 2000)}..."`}

            Output Format: JSON Only (严格匹配 StyleConfig 接口).
            
            Analysis Focus (Infer the following fields):
            1. styleName: 推断最接近的风格流派 (如: "极简科技", "商务严谨", "时尚杂志", "扁平插画", "复古风" 或其他精准词汇)。
            2. colorPalette: 提取核心配色方案 (如: "经典蓝白", "黑金奢华", "莫兰迪色系", "赛博朋克" 等)。
            3. requirements: **核心字段**。请生成一份符合以下 Markdown 结构的详细 AI 视觉指令 (Prompt)。
               
               [CRITICAL INSTRUCTION]
               You MUST write a COMPLETE Markdown document inside this string. 
               DO NOT truncate. DO NOT skip sections. DO NOT use placeholders like "(Provide details...)".
               You MUST fill out Section 3 for ALL 5 page types explicitly.

               **必需结构 (Markdown)**:
               # [角色定义，如：极简主义架构师] AI 视觉指令

               ## 1. 核心定位
               *   **场景定位**: (如：A轮融资路演 / 内部技术分享)
               *   **视觉关键词**: (3-5个核心词)

               ## 2. 总体视觉规范
               *   **设计美学**: (详述风格、材质、光影、氛围)
               *   **色彩方案**:
                   *   **背景色**: [Hex] (描述)
                   *   **主色**: [Hex] (描述)
                   *   **辅助色**: [Hex] (描述)
                   *   **文字色**: [Hex] (描述)
               *   **排版与字体**: (推荐字体与字号策略，必填)
               *   **核心元素**: (具体的装饰元素，如玻璃拟态、粒子流，必填)

               ## 3. 页面类型详细指令
               (Must provide specific "Layout", "Elements", "Features" for EVERY single page type below)
               
               ### [封面页] (Cover Page)
               *   **布局**: 
               *   **元素**: 
               
               ### [目录页] (Agenda Page)
               *   **布局**: 
               *   **元素**: 
               
               ### [章节过渡页] (Section Header)
               *   **布局**: 
               *   **元素**: 
               
               ### [内容页] (Content Page)
               *   **布局**: 
               *   **元素**: 
               
               ### [结束页] (Thank You)
               *   **布局**: 
               *   **元素**: 

            4. targetPageCount: 推荐的总页数 (默认为 10-15)。
            5. pageStructure: 推荐的页面结构对象 { cover: number, directory: number, transition: number, content: number, end: number }。
               - 封面(cover)通常为 1。
               - 目录(directory)通常为 1。
               - 结束页(end)通常为 1。
               - 其余分配给 transition 和 content。
            
            Constraints:
            - Language: Simplified Chinese (简体中文).
            - Output valid JSON string parsing.
            - ENSURE the "requirements" string contains the FULL Markdown content defined above.
        `;

        try {
            let jsonStr = "";
            if (shouldUseGeminiNative(config, settings)) {
                const ai = createGoogleClient(config);
                const contents: any[] = [];
                if (visionPart) {
                    contents.push({ inlineData: visionPart });
                }
                contents.push({ text: prompt });

                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: { parts: contents } as any
                });
                jsonStr = response.text?.trim() || "{}";
            } else {
                const messages: any[] = [{ role: "user", content: [] }];
                messages[0].content.push({ type: "text", text: prompt });
                if (visionPart) {
                    // OpenAI Vision Format
                    messages[0].content.push({
                        type: "image_url",
                        image_url: { url: `data:${visionPart.mimeType};base64,${visionPart.data}` }
                    });
                }
                // Disable jsonMode to avoid 401/400 errors with ModelScope
                jsonStr = await callOpenAICompatible(config, messages, 0.7, false);
            }

            // Clean & Parse JSON
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = jsonStr.indexOf('{');
            const end = jsonStr.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                jsonStr = jsonStr.substring(start, end + 1);
            }
            const parsed = JSON.parse(jsonStr);

            // Add defaults if missing
            return {
                styleName: parsed.styleName || "自定义风格",
                colorPalette: parsed.colorPalette || "默认配色",
                requirements: parsed.requirements || "保持专业、清晰的视觉风格。",
                aspectRatio: "16:9", // Default
                targetPageCount: parsed.targetPageCount || 10,
                pageStructure: parsed.pageStructure || { cover: 1, directory: 1, transition: 2, content: 5, end: 1 }
            };

        } catch (e) {
            console.error("[analyzeTemplateConcept] Failed:", e);
            // Fallback default
            return {
                styleName: "极简科技",
                colorPalette: "经典蓝白",
                requirements: "生成风格现代、专业的演示文稿。",
                aspectRatio: "16:9",
                targetPageCount: 8,
                pageStructure: { cover: 1, directory: 1, transition: 1, content: 4, end: 1 }
            };
        }
    },

    /**
     * 新增: 生成风格参考图
     */
    async generateStylePreview(
        configStyle: StyleConfig,
        pageType: string,
        settings: AppSettings
    ): Promise<string> {
        // 复用 generateSlideVariant 的逻辑，但 Content 是空的
        const warningContext: { warning?: string } = {};
        const result = await AIService.generateSlideVariant(
            "", // No source content
            null, // No style file
            configStyle,
            "style-preview",
            `${configStyle.styleName} - ${pageType}页预览`,
            settings,
            'text',
            undefined,
            pageType,
            undefined, // fullContent
            undefined, // globalStyleMap
            undefined, // allSlideTitles
            warningContext // context: 接收降级信号
        );
        if (warningContext.warning) {
            console.warn('[generateStylePreview] Smart filter fell back:', warningContext.warning);
        }
        return result;
    },

    // @deprecated 请使用 generateStylePreview
    async generateStyleReference(
        configStyle: StyleConfig,
        pageType: string,
        settings: AppSettings
    ): Promise<string> {
        console.warn('[generateStyleReference] Deprecated, use generateStylePreview instead.');
        return await AIService.generateStylePreview(configStyle, pageType, settings);
    },

    // ============================================================
    // 流式输出方法 (Streaming Methods)
    // ============================================================

    /**
     * 流式调用 OpenAI Compatible API
     */
    async callOpenAICompatibleStream(
        config: ModelConnection,
        messages: any[],
        onChunk: (chunk: string) => void,
        temperature: number = 0.7
    ): Promise<void> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (config.apiKey) {
            const safeKey = config.apiKey.replace(/[^ -~]/g, "");
            headers['Authorization'] = `Bearer ${safeKey}`;
        }

        let baseUrl = config.baseUrl.trim();
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        let url = baseUrl;
        if (!url.toLowerCase().endsWith('/chat/completions')) {
            url = `${baseUrl}/chat/completions`;
        }

        const body: any = {
            model: config.model,
            messages: messages,
            temperature: temperature,
            max_tokens: 4096,
            stream: true
        };

        console.log(`[OpenAI Stream] Calling: ${url}, Model: ${config.model}`);

        const response = await axios.post(url, body, {
            headers,
            timeout: 120000,
            httpsAgent,
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            let buffer = '';
            response.data.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') {
                            resolve();
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content;
                            if (content) {
                                onChunk(content);
                            }
                        } catch {
                            console.warn('[OpenAI Stream] Failed to parse chunk, likely incomplete line:', data?.substring(0, 100));
                        }
                    }
                }
            });

            response.data.on('end', () => {
                resolve();
            });

            response.data.on('error', (err: Error) => {
                console.error('[OpenAI Stream] Error:', err);
                reject(err);
            });
        });
    },

    /**
     * 流式文本润色
     */
    async smartRefineStream(
        text: string,
        type: 'requirement' | 'content' | 'requirement_polish' | 'template_description',
        settings: AppSettings | undefined,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        if (process.env.MOCK_AI === '1') {
            const t = text === undefined || text === null ? '' : String(text);
            if (!t.trim()) return;
            onChunk(t.trim());
            return;
        }

        const sanitized = promptSanitizer.sanitize(text);
        const cleanText = sanitized.cleanedText;

        const config = await resolveActiveConfig(settings, 'text');
        const prompt = PROMPT_TEMPLATES[type]?.(cleanText) || PROMPT_TEMPLATES.content(cleanText);

        const messages = [{ role: "user", content: prompt }];
        await AIService.callOpenAICompatibleStream(config, messages, onChunk);
    },

    /**
     * 流式大纲生成 - 逐项发送
     */
    async generateOutlineStream(
        topic: string,
        configStyle: StyleConfig,
        settings: AppSettings,
        onItem: (item: OutlineItem, index: number) => void
    ): Promise<OutlineItem[]> {
        if (process.env.MOCK_AI === '1') {
            const safeTopic = topic === undefined || topic === null ? '' : String(topic);
            const { targetPageCount, pageStructure } = configStyle;
            const structure = { ...(pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }) };
            const fixedSum = (structure.cover || 0) + (structure.directory || 0) + (structure.transition || 0) + (structure.end || 0);
            structure.content = Math.max(1, (targetPageCount || 10) - fixedSum);

            const seq: Array<'cover' | 'directory' | 'transition' | 'content' | 'end'> = [];
            for (let i = 0; i < (structure.cover || 0); i++) seq.push('cover');
            for (let i = 0; i < (structure.directory || 0); i++) seq.push('directory');
            for (let i = 0; i < (structure.transition || 0); i++) seq.push('transition');
            for (let i = 0; i < (structure.content || 0); i++) seq.push('content');
            for (let i = 0; i < (structure.end || 0); i++) seq.push('end');

            const sliced = seq.slice(0, targetPageCount || seq.length);
            const results: OutlineItem[] = [];
            for (let i = 0; i < sliced.length; i++) {
                const pageType = sliced[i];
                const item: OutlineItem = {
                    id: Math.random().toString(36).slice(2, 11),
                    index: i + 1,
                    title: pageType === 'cover' ? `封面：${safeTopic || '主题'}` :
                        pageType === 'directory' ? '目录' :
                            pageType === 'transition' ? '章节概览' :
                                pageType === 'end' ? '谢谢' :
                                    `要点 ${i + 1}`,
                    brief: pageType === 'content' ? `这是「${safeTopic || '主题'}」的关键要点示例，用于 E2E 测试。` : '',
                    pageType,
                    status: 'idle'
                };
                results.push(item);
                onItem(item, i);
            }
            return results;
        }

        const config = await resolveActiveConfig(settings, 'text');
        const { targetPageCount, pageStructure } = configStyle;
        const structure = { ...(pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }) };

        const fixedSum = (structure.cover || 0) + (structure.directory || 0) + (structure.transition || 0) + (structure.end || 0);
        structure.content = Math.max(1, targetPageCount - fixedSum);

        // 使用 JSON Lines 格式，每行一个 JSON 对象，便于流式解析
        const prompt = `
Task: 根据以下提供的内容，生成一份结构化的 PPT 演示大纲。大纲中的所有内容必须严格来源于下方提供的内容，不得引入外部知识或编造信息。
以下提供的内容将作为"主题"或"源文档"：
"${topic}"

【严格限制】:
1. 总页数必须正好为: ${targetPageCount} 页。
2. 页面组成结构必须严格遵守以下配比:
   - 封面页 (cover): ${structure.cover} 页
   - 目录页 (directory): ${structure.directory} 页
   - 章节过渡页 (transition): ${structure.transition} 页
   - 内容正文页 (content): ${structure.content} 页
   - 结束页 (end): ${structure.end} 页

【输出格式 - JSON Lines】:
每行输出一个 JSON 对象，共 ${targetPageCount} 行。
不要输出数组括号 []，不要使用 Markdown 代码块。

每行格式:
{"title": "页面标题", "brief": "页面内容简介（将直接展示在幻灯片上）", "pageType": "cover|directory|transition|content|end"}

【brief 字段 - 按页面类型严格遵循以下规范】:
brief 的内容将直接作为该页面的展示文案，必须写"观众在幻灯片上看到的文字"，而非"对页面的描述"。

- cover: 写封面一句话定位语/副标题，如"全面解析九功平台与H3C灵犀在六大核心维度的差异化竞争力"。禁止"封面页展示主题"等描述。日期和讲解人由系统自动附加，brief中不得包含。
- directory: 带序号前缀的列表形式，如"一、产品定位 · 二、前端AI助手 · 三、后台管理"。禁止"本次演示分为X部分"等前缀。
- end: 写简短收尾语，如"期待交流合作"。禁止"感谢观看"(标题已表达)、禁止版本号/元数据。
- content: 写该页核心观点概要，作为后续内容指引。
- transition: 写章节方向概述。

示例输出:
{"title": "九功平台 vs H3C 灵犀 — 竞品对比分析", "brief": "全面解析九功平台与H3C灵犀在六大核心维度的差异化竞争力", "pageType": "cover"}
{"title": "目录", "brief": "一、产品定位与架构 · 二、前端AI助手 · 三、后台管理 · 四、数据智能 · 五、工作流编排 · 六、内容创作 · 七、综合评估", "pageType": "directory"}
{"title": "核心对比维度", "brief": "从架构、功能、性能三大维度全面对比两款产品", "pageType": "content"}
{"title": "谢谢", "brief": "期待交流合作", "pageType": "end"}

【重要】: 每行必须是一个完整有效的 JSON 对象，按顺序逐行输出。
`;

        const results: OutlineItem[] = [];
        let buffer = '';
        let itemIndex = 0;
        const messages = [{ role: "user", content: prompt }];

        await AIService.callOpenAICompatibleStream(config, messages, (chunk) => {
            buffer += chunk;

            // 按行分割，逐行解析 JSON
            const lines = buffer.split('\n');
            // 保留最后一个可能不完整的行
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                // 跳过空行和非 JSON 行
                if (!trimmed || !trimmed.startsWith('{')) continue;

                try {
                    const parsed = JSON.parse(trimmed);
                    const item: OutlineItem = {
                        id: Math.random().toString(36).slice(2, 11),
                        index: itemIndex + 1,
                        title: parsed.title || `第 ${itemIndex + 1} 页`,
                        brief: parsed.brief || '',
                        pageType: parsed.pageType || 'content',
                        status: 'idle'
                    };
                    results.push(item);
                    onItem(item, itemIndex);
                    itemIndex++;
                } catch (e) {
                    // JSON 解析失败，可能是行不完整，继续等待更多数据
                    console.log('[GenerateOutlineStream] Failed to parse line:', trimmed.substring(0, 50));
                }
            }
        });

        // 处理 buffer 中剩余的内容
        if (buffer.trim() && buffer.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(buffer.trim());
                const item: OutlineItem = {
                    id: Math.random().toString(36).slice(2, 11),
                    index: itemIndex + 1,
                    title: parsed.title || `第 ${itemIndex + 1} 页`,
                    brief: parsed.brief || '',
                    pageType: parsed.pageType || 'content',
                    status: 'idle'
                };
                results.push(item);
                onItem(item, itemIndex);
            } catch (e) {
                // 忽略解析错误
            }
        }

        console.log(`[GenerateOutlineStream] Parsed ${results.length} items`);
        return results;
    },

    /**
     * 流式幻灯片详情生成
     */
    async generateSlideDetailStream(
        title: string,
        brief: string,
        topicContext: string,
        index: number,
        total: number,
        pageType: string,
        settings: AppSettings | undefined,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        if (process.env.MOCK_AI === '1') {
            const t = title === undefined || title === null ? '' : String(title);
            const b = brief === undefined || brief === null ? '' : String(brief);
            const mockContent = `- ${t || '要点'}\n- ${b || '示例内容（用于 E2E 测试）'}\n\n---DESIGN_SUGGESTION_START---\n**设计建议：** 采用左右分栏布局：左侧标题与要点列表，右侧使用图标/流程箭头表达逻辑。`;
            onChunk(mockContent);
            return;
        }

        const config = await resolveActiveConfig(settings, 'text');
        const prompt = `Topic Context (Source Document Content): ${topicContext}
            Slide Title: ${title}
            Slide Intent: ${brief}

            Structural Context:
            - This is slide ${index} of ${total} in the entire presentation.
            - Page Type: ${pageType}

            Task: Write the full, detailed content for this slide strictly based on the source document content provided above in "Topic Context".

            [CRITICAL FIDELITY REQUIREMENT]:
            - You MUST derive ALL substantive content from the "Topic Context (Source Document Content)" section above.
            - DO NOT fabricate facts, data, statistics, case studies, or examples that do not exist in the source document.
            - If the source document covers a topic, summarize and present it faithfully. DO NOT add external knowledge.
            - You MAY rephrase, restructure, or polish the language for presentation clarity, but the core meaning MUST come from the source.
            - [FORBIDDEN] Generating entirely new sections or claims not supported by the source.

            [CRITICAL OUTPUT FORMAT RULE - STRICTLY ENFORCED]:
            - [FORBIDDEN] Do NOT include any meta-description, structural context, or self-referential text in the output.
            - [FORBIDDEN] Do NOT write phrases like "This is slide X of Y", "根据...分析，第X张幻灯片的内容如下", "以下是...的内容", "Page Type indicates", or any similar framing.
            - [FORBIDDEN] Do NOT describe what the slide "is" or "contains". Instead, directly output the slide's actual content.
            - The output must be ONLY the slide content that the audience can see and read. No explanations, no labels, no descriptions of the slide itself.

            Requirements:
            1. Language: Strictly Simplified Chinese (简体中文).
            2. Include bullet points, key arguments, or data placeholders.
            3. Use a professional tone.
            4. Content length: ${pageType === 'content' ? '150-250' : '50-100'} words.

            [CRITICAL VISUAL INSTRUCTION]:
            At the end of your response (after the content), you MUST append a specific design suggestion field:

            Format:
            **设计建议：** <Your suggestion here>

            Instructions for this field:
            - Act as a Senior Art Director.
            - FOCUS ONLY on Layout, Structure, Charts, Shapes, and Icons.
            - [STRICTLY FORBIDDEN]: Do NOT mention colors, palettes, art styles, or lighting.
            - [Layout]: Suggest the best layout (e.g., 'Left-Right Split', 'Timeline', '3-Column Card').
            - [Hierarchy]: Define visual weight (e.g., "Make the Central Concept 2x larger than supporting points", "Use size contrast to distinguish Main Title from Sub-points").
            - [Logic]: Define connection logic (e.g., "Use arrows to show flow A -> B", "Use concentric circles to show inclusion", "Use connecting lines to show network").
            - [Shapes]: Suggest visual metaphors (e.g., 'Funnel', 'Honeycomb', 'Pyramid').
            - SEPARATOR REQUIRED: You MUST put the separator "---DESIGN_SUGGESTION_START---" on a new line before the design suggestion.
            - Example:

            (Content...)

            ---DESIGN_SUGGESTION_START---
            **设计建议：** 采用中心发散布局。核心概念'AI大脑'位于画面中央且尺寸最大（层级1）；四个子模块环绕周边（层级2），使用虚线箭头指向中心（逻辑：汇聚）。使用蜂窝状容器包裹每个模块。"`;

        const messages = [{ role: "user", content: prompt }];
        await AIService.callOpenAICompatibleStream(config, messages, onChunk);
    }
};

/** @internal exported for testing — must be at end of file to avoid hoisting issues */
export const __testing = {
    extractPageSpecificRequirements,
    detectInputScenario,
    complementScenarioInputs,
    parseStructuredVisionOutput,
    extractDesignSuggestion,
    buildImageGenerationPrompt,
    extractHexFromText,
    detectContentType,
    splitContent,
};
