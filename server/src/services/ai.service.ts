
import { GoogleGenAI, Type } from "@google/genai";
import { AppSettings, ModelConnection, StoredResource, DocParserConfig, StyleConfig, OutlineItem, ImageResolution } from "../types";
import { resourceToBase64, readResourceBuffer } from "../utils/file";
import mammoth from 'mammoth';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { AssetService } from './asset.service';
import { saveBase64Image } from '../utils/imageSaver';

// --- Default Configuration ---
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || "";

// --- AI Prompt Generation Helper Functions ---

/**
 * 根据页面类型生成专属指令
 */
const getPageTypeInstructions = (pageType: string): string => {
    const commonRules = '【必须遵守】: 页面中的标题名称必须去重,保证生成的页面中只有唯一的一个标题。生成的文字、数字等务必清晰,严禁模糊化,特别是正文、列表、总结性的小字体文字,确保极高的可读性。';

    const instructions: Record<string, string> = {
        cover: `生成专业的PPT封面页。要求:标题突出醒目,背景视觉大气。${commonRules}`,
        directory: `生成清晰的PPT目录页。要求:1)章节列表条理清晰,层级分明;2)根据提供的内容或大纲标题,智能归纳总结出合适的目录结构;3)严禁随意发挥偏离本项目主题。${commonRules}`,
        transition: `生成章节过渡页。要求:突出显示章节标题,具有承上启下的视觉过渡效果。${commonRules}`,
        content: `生成内容展示页。要求:1)在页面标题下方添加一句核心总结语句,让观众快速理解本页核心观点;2)内容需要有层次地展示:提炼小标题、关键要素、视觉标签;3)避免大段文字堆叠。${commonRules}`,
        end: `生成PPT结束页。要求:严格根据提供的标题和描述内容生成,严禁包含联系电话、电子邮箱、网址、地址等占位符信息。${commonRules}`,
        custom: `按照提供的内容和要求自定义生成专业PPT页面。${commonRules}`
    };
    return instructions[pageType] || instructions.custom;
};

type PageType = 'cover' | 'directory' | 'transition' | 'content' | 'end' | 'custom';
type GlobalStyleMap = Record<PageType, string | null>;

/**
 * 视觉特征提取: 使用 Vision 模型分析风格图并返回关键词
 */
const analyzeStyleImage = async (
    imageResource: string,
    pageType: string,
    settings?: AppSettings
): Promise<string> => {
    const config = getTaskConfig(settings, 'vision');
    const base64 = await resourceToBase64(imageResource);

    // 全流派适用: 通用设计语言提取 Prompt
    const prompt = `
        Role: 顶级 PPT 视觉分析师 & 构图专家。
        Task: 解构这张 PPT ${pageType} 的“视觉元属性”，为 DALL-E 重建其灵魂。
        
        重点提取以下抽象设计属性 (禁止描述具象物品，禁止提取文字内容):
        1. 【构图骨架】: 描述画面的几何重心分配（如：偏左重心、居中对称、大块非对称切割）。识别其引导线的方向和视觉流动感。
        2. 【空间层级】: 识别其视觉深度（如：多层 3D 堆叠、极简扁平层级、半透明重叠感）。
        3. 【背景肌理 & 渐变】: 描述背景是某种纹理（如：颗粒、金属拉丝、流体）、还是特定的颜色渐变方式。
        4. 【配色灵魂】: 捕捉其核心的色彩对比逻辑（如：高对比度撞色、同色系渐变、极简灰白）。
        
        输出要求:
        - 语言: 简体中文。
        - 格式: 极简扫描指令（类似：“主体构图为...，视觉流向为...，背景呈现...肌理，色彩逻辑采用...，禁止添加任何具象装饰”）。
        - 长度: 120 字以内。
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
            return response.text?.trim() || "";
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
            return await callOpenAICompatible(config, messages);
        }
    } catch (e) {
        console.warn(`[analyzeStyleImage] Style analysis failed (Model: ${config.model}), falling back to basic metadata.`, e);
        return "";
    }
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
 * 智能 Prompt 过滤器: 从完整的 Markdown 需求中提取特定页面的指令
 */
const extractPageSpecificRequirements = (fullRequirements: string, pageType: string): string => {
    if (!fullRequirements) return "";

    try {
        // 1. 提取全局规范 (Section 2)
        // 匹配 "## 2. 总体视觉规范" 开始，直到下一个 "##" (通常是 Section 3)
        const globalSpecMatch = fullRequirements.match(/## 2\. 总体视觉规范([\s\S]*?)(?=## \d|\z)/);
        const globalSpec = globalSpecMatch ? globalSpecMatch[1].trim() : "";

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
            // 匹配 "### [关键词]" 开始，直到下一个 "###" 或 "##" 或 结束
            // 注意：Markdown 标题可能包含额外的文字，如 "### [封面页] (Cover Page)"
            // 正则解释: 
            // ###\s*\[?       -> 匹配 "### [" (可选左方括号)
            // ${targetKeyword} -> 匹配关键词
            // \]?             -> 匹配可选右方括号
            // [^\n]*          -> 匹配标题行的剩余部分
            // ([\s\S]*?)      -> 捕获内容
            // (?=###|##|\z)   -> 向后查找，直到下一个标题或结束
            const regex = new RegExp(`###\\s*\\[?${targetKeyword}\\]?[^\\n]*([\\s\\S]*?)(?=###|##|\\z)`, 'i');
            const pageMatch = fullRequirements.match(regex);

            if (pageMatch) {
                pageSpec = pageMatch[1].trim();
            } else {
                console.warn(`[SmartPrompt] No specific instructions found for type: ${pageType} (${targetKeyword})`);
            }
        }

        // 3. 组合
        if (globalSpec || pageSpec) {
            console.log(`[SmartPrompt] Successfully filtered requirements for ${pageType}.`);
            return `【全局视觉规范】\n${globalSpec}\n\n【本页专属指令 (${pageType})】\n${pageSpec}`;
        }

        // Fallback
        return fullRequirements;

    } catch (e) {
        console.warn("[SmartPrompt] Regex parsing failed, using full requirements.", e);
        return fullRequirements;
    }
};

/**
 * 构建完整的图片生成Prompt (OpenAI兼容模式)
 */
const buildImageGenerationPrompt = (params: {
    pageType: string;
    title: string;
    content: string;
    styleName: string;
    colorPalette: string;
    requirements: string;
    aspectRatio: string;
    styleMatchType: 'exact' | 'fallback' | 'none';
    allSlideTitles?: string[]; // 新增: 所有页面标题,用于目录页生成参考
    styleKeywords?: string;  // 新增: Vision 模型解析出的风格特征
}): string => {
    const { pageType, title, content, styleName, colorPalette, requirements, aspectRatio, styleMatchType, allSlideTitles, styleKeywords } = params;

    let prompt = '';

    // 0. 智能过滤需求 (Smart Prompt Filter)
    const effectiveRequirements = extractPageSpecificRequirements(requirements, pageType);

    // 第一部分: 视觉调性定义 (Visual Language - "HOW to draw")
    prompt += `【1. 视觉语言 & 艺术风格 (最高优先级说明书)】\n`;
    if (styleKeywords) {
        prompt += `- 核心视觉指纹: ${styleKeywords}\n`;
    }
    if (styleMatchType === 'exact') {
        prompt += `- 构图锁定: 必须严格复刻参考图的几何骨架、色彩权重和视觉平衡感。\n`;
    }

    // Inject filtered requirements here
    if (effectiveRequirements) {
        prompt += `- 详细设计规范:\n${effectiveRequirements}\n`;
    }

    // 第二部分: 业务任务核心 (Business Core - "WHAT to draw")
    prompt += `\n【2. 业务任务内容 (核心质料)】\n`;
    prompt += `- 页面标题: "${title}"\n`;

    if (pageType === 'directory' && (!content || content.length < 20) && allSlideTitles && allSlideTitles.length > 0) {
        prompt += `- 大纲参考: "${allSlideTitles.join('、')}"\n`;
    } else if (content) {
        const contentPreview = content.length > 800 ? content.substring(0, 800) + '...' : content;
        prompt += `- 详细业务描述: "${contentPreview}"\n`;
    }

    // 第三部分: 形神兼备合成指令 (Synthesized Meta-Instruction)
    prompt += `\n【3. 形神兼备合成要求】\n`;
    prompt += `- 任务使命: 请使用第一部分定义的【视觉语言】去重构并描绘第二部分定义的【业务任务内容】。\n`;
    prompt += `- 深度要求: 生成的图像必须在视觉上看起来与参考图逻辑一致，但在含义和内容上必须精准对应本页面的业务主题。\n`;
    prompt += `- [CRITICAL] 内容隔离: 请**忽略**参考风格图中的任何文字、数字或具体业务信息。只提取其视觉风格，内容完全以【业务任务内容】为准。\n`;

    // 第四部分: 技术规格
    prompt += `\n【4. 技术规格】\n`;
    prompt += `- 宽高比: ${aspectRatio}\n`;
    if (styleName) prompt += `- 风格流派: ${styleName}\n`;
    if (colorPalette) prompt += `- 配色方案: ${colorPalette}\n`;
    // Note: requirements are already injected in Part 1
    prompt += `- 画面基调: 专业商业演示, 4K 高画质, 文字严禁模糊, 线条精准。\n`;

    return prompt;
};

// --- Helper Functions ---

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
    const cleanUrl = cleanBaseUrlForGoogle(config.baseUrl);
    const isCustomProxy = !cleanUrl.includes('googleapis.com') && !cleanUrl.includes('generativelanguage');

    const options: any = {
        apiKey: config.apiKey,
        baseUrl: cleanUrl
    };

    if (isCustomProxy) {
        options.customHeaders = {
            'Authorization': `Bearer ${config.apiKey}`,
            'X-Goog-Api-Key': config.apiKey
        };
    }

    return new GoogleGenAI(options);
};

const getTaskConfig = (settings: AppSettings | undefined, task: 'text' | 'image' | 'vision'): ModelConnection => {
    // console.log(`[getTaskConfig] Task: ${task}, Provider: ${settings?.ai?.provider || 'default'}`);

    if (!settings) {
        // console.log(`[getTaskConfig] No settings provided, using defaults`);
        return {
            apiKey: DEFAULT_GEMINI_KEY,
            baseUrl: 'https://generativelanguage.googleapis.com',
            model: task === 'vision' ? 'gemini-3-flash' : 'gemini-3-pro-preview'
        };
    }

    let connection: ModelConnection;

    // Priority 1: Use customCombo if it has configuration for this task AND provider is CustomCombo
    if (settings.ai.provider === 'CustomCombo' && settings.ai.customCombo && settings.ai.customCombo[task] && settings.ai.customCombo[task].model) {
        // console.log(`[getTaskConfig] Using CustomCombo for ${task}:`, JSON.stringify(settings.ai.customCombo[task], null, 2));
        connection = { ...settings.ai.customCombo[task] };
        if (!connection.apiKey) connection.apiKey = settings.ai.apiKey;
        if (!connection.baseUrl) connection.baseUrl = settings.ai.baseUrl;
        if (!connection.apiKey) connection.apiKey = DEFAULT_GEMINI_KEY;
    } else {
        // Priority 2: Use general settings
        let apiKey = settings.ai.apiKey;
        const baseUrl = settings.ai.baseUrl;

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
    if (connection.model.includes('gemini-3-pro-image-2k-16x9') || connection.model.includes('gemini-3-pro-image-preview')) {
        connection.model = 'gemini-3-pro-image';
    }

    // console.log(`[getTaskConfig] Final config: baseUrl=${connection.baseUrl}, model=${connection.model}, hasApiKey=${!!connection.apiKey}`);
    return connection;
};

const shouldUseGeminiNative = (config: ModelConnection, settings?: AppSettings): boolean => {
    const url = config.baseUrl.toLowerCase().trim();

    // Priority 1: Official Google APIs use Gemini Native
    if (url.includes('googleapis.com') || url.includes('generativelanguage')) {
        console.log(`[shouldUseGeminiNative] Google API detected, using Gemini Native API`);
        return true;
    }

    // Priority 2: URLs with /v1 endpoint are OpenAI compatible (even if model name contains 'gemini')
    if (url.includes('/v1')) {
        console.log(`[shouldUseGeminiNative] OpenAI compatible endpoint detected (/v1), using OpenAI API`);
        return false;
    }

    // Priority 3: Check if model name indicates Gemini (e.g., gemini-3-pro-image, gemini-3-flash)
    if (config.model && config.model.toLowerCase().includes('gemini')) {
        console.log(`[shouldUseGeminiNative] Gemini model detected (${config.model}), using Gemini Native API`);
        return true;
    }

    // Priority 4: Check provider setting
    if (settings?.ai.provider === 'Gemini') {
        console.log(`[shouldUseGeminiNative] Provider is Gemini, using Gemini Native API`);
        return true;
    }

    // All other URLs use OpenAI compatible API
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

const calculateFinalResolution = (qualitySetting: string | undefined, aspectRatio: string): string => {
    // 1. Identify Quality Tier based on the "Flagship" resolution set in Global Config
    // 1K Tier: '1024x1024' (or '1280x720')
    // 2K Tier: '2048x2048' (or '1920x1080')
    // 4K Tier: '3840x2160' (or '4096x4096')

    let tier = '4K'; // Default
    if (qualitySetting?.includes('1024') || qualitySetting?.includes('1280')) tier = '1K';
    else if (qualitySetting?.includes('2048') || qualitySetting?.includes('1920')) tier = '2K';
    else tier = '4K';

    // 2. Map Tier + Ratio to Final Resolution
    const ratio = getClosestSupportedRatio(aspectRatio);

    // Dictionary: [Tier][Ratio]
    const map: Record<string, Record<string, string>> = {
        '1K': {
            '16:9': '1280x720',
            '4:3': '1024x768',
            '1:1': '1024x1024',
            '3:4': '768x1024',
            '9:16': '720x1280'
        },
        '2K': {
            '16:9': '1920x1080',
            '4:3': '2048x1536', // Standard 4:3 2K-ish
            '1:1': '2048x2048',
            '3:4': '1536x2048',
            '9:16': '1080x1920'
        },
        '4K': {
            '16:9': '3840x2160',
            '4:3': '4096x3072', // High res 4:3
            '1:1': '2160x2160', // Matching 4K height pixel density, (or 4096x4096 if model supports) -> limit to 2160 for safety/balance
            '3:4': '3072x4096',
            '9:16': '2160x3840'
        }
    };

    return map[tier][ratio] || map['2K']['16:9'];
};

async function callOpenAICompatible(
    config: ModelConnection,
    messages: any[],
    temperature: number = 0.7,
    jsonMode: boolean = false
): Promise<string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        // [Debug] Aggressive Sanitization
        const safeKey = config.apiKey.replace(/[^ -~]/g, "");
        headers['Authorization'] = `Bearer ${safeKey}`;
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

    let retries = 3;
    while (retries > 0) {
        try {
            console.log(`[OpenAI Compatible] Calling: ${url}, Model: ${config.model} (Attempts left: ${retries})`);
            const response = await axios.post(url, body, { headers, timeout: 120000 });
            const content = response.data.choices[0]?.message?.content || "";
            console.log(`[OpenAI Compatible] Response received, length: ${content.length}`);
            console.log(`[OpenAI Compatible] Response preview:`, content.substring(0, 200));
            return content;
        } catch (error: any) {
            const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            const statusCode = error.response?.status;
            console.error(`[OpenAI Compatible] Attempt failed: ${errMsg} (Status: ${statusCode})`);

            // Only retry on specific status codes or network errors
            const shouldRetry = !statusCode || [500, 502, 503, 504].includes(statusCode);

            if (shouldRetry && retries > 1) {
                retries--;
                console.log(`[OpenAI Compatible] Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }

            if (error.response?.data) {
                console.error(`[OpenAI Compatible] Full error response:`, JSON.stringify(error.response.data, null, 2));
            }
            throw new Error(`API Request Failed: ${errMsg} (Status: ${statusCode})`);
        }
    }
    throw new Error("API Request Failed after retries");
}

async function callOpenAIImageGeneration(
    config: ModelConnection,
    prompt: string,
    aspectRatio: string = "16:9",
    resolution?: string
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
    // Use explicit resolution if provided, otherwise fallback to aspect ratio map
    const size = resolution ? resolution : (sizeMap[aspectRatio] || "1792x1024");

    const body: any = {
        model: config.model,
        prompt: prompt,
        n: 1,
        size: size,
        response_format: "b64_json" // Request base64 directly
    };

    let baseUrl = config.baseUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    let url = `${baseUrl}/images/generations`;

    console.log(`[OpenAI Image] Calling: ${url}, Model: ${config.model}, Size: ${size}`);

    let retries = 3;
    while (retries > 0) {
        try {
            console.log(`[OpenAI Image] Calling: ${url}, Model: ${config.model}, Size: ${size} (Attempts left: ${retries})`);
            const response = await axios.post(url, body, { headers, timeout: 600000 });
            const data = response.data?.data?.[0];

            if (data?.b64_json) {
                const base64 = `data:image/png;base64,${data.b64_json}`;
                return await saveBase64Image(base64, 'gen_ai');
            } else if (data?.url) {
                // If URL is returned, fetch and convert to base64 then save
                const imageResponse = await axios.get(data.url, { responseType: 'arraybuffer' });
                const base64 = `data:image/png;base64,${Buffer.from(imageResponse.data, 'binary').toString('base64')}`;
                return await saveBase64Image(base64, 'gen_ai');
            }
            throw new Error("No image data returned from API"); // Should be caught by catch block
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

            // Only retry on specific status codes or network errors
            const shouldRetry = !statusCode || [500, 502, 503, 504].includes(statusCode);

            if (shouldRetry && retries > 1) {
                retries--;
                console.log(`[OpenAI Image] Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
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

    async smartRefine(text: string, type: 'requirement' | 'content' | 'requirement_polish', settings?: AppSettings): Promise<string> {
        const config = getTaskConfig(settings, 'text');
        let prompt = '';
        if (type === 'requirement_polish') {
            prompt = `
Task: Rewrite the user's input into ONE single fluent paragraph of plain text.
Input: "${text}"

[STRICT RULES]
1. NO Markdown (no **, #, etc).
2. NO Bullet points or lists (*, -).
3. NO Newlines. Return exactly one line of text.
4. Keep the original intent but make it sound professional and descriptive.
5. Language: Simplified Chinese (简体中文).
6. If the input is keywords, expand them into full sentences.

Example Output:
"该模版专为小学语文教学设计，采用生动有趣的视觉风格，以适应小学生的审美偏好，旨在打造沉浸式的语文课堂体验，帮助学生更好地理解教学内容。"`;
        } else if (type === 'requirement') {
            prompt = `
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
Constraint: Return ONLY the markdown content. Language: Simplified Chinese (简体中文).`;
        } else {
            // Content refinement remains simple
            prompt = `Task: Refine the following presentation slide content. Make it concise, professional, impactful, and suitable for a slide (use bullet points or punchy text if applicable). Maintain the original meaning.\n\nInput Text: "${text}"\n\nRequirement: Return ONLY the refined text in Simplified Chinese (简体中文). Do not add explanations or conversational filler.`;
        }

        if (shouldUseGeminiNative(config, settings)) {
            const ai = createGoogleClient(config);
            const response = await ai.models.generateContent({
                model: config.model,
                contents: prompt,
            });
            return response.text?.trim() || text;
        } else {
            const messages = [{ role: "user", content: prompt }];
            return await callOpenAICompatible(config, messages);
        }
    },

    async generateSnapshotSummary(diffContext: string, settings?: AppSettings): Promise<string> {
        const config = getTaskConfig(settings, 'text');
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
            return await callOpenAICompatible(config, messages);
        }
    },

    async extractTextFromFile(resourcePath: string, fileType: string, settings?: AppSettings): Promise<{ content: string, fallback?: boolean, provider?: string }> {
        // Handle PDF via MinerU with Fallback
        if (fileType === 'application/pdf') {
            const mineruKey = settings?.docParser?.apiKey;

            if (mineruKey) {
                try {
                    const { MinerUService } = await import('./mineru.service');

                    console.log('[AIService] Attempting MinerU PDF Parsing...');
                    const markdown = await MinerUService.parseFile(resourcePath, {
                        apiKey: mineruKey,
                        baseUrl: settings?.docParser?.baseUrl || 'https://mineru.openxlab.org.cn',
                        provider: 'MinerU'
                    });

                    console.log('[AIService] MinerU Success.');
                    return { content: markdown, provider: 'MinerU' };

                } catch (mineruError: any) {
                    console.warn(`[AIService] MinerU Failed (Falling back to Vision): ${mineruError.message}`);
                    // Proceed to Vision Model logic below, but mark as fallback
                    // We continue execution...
                }
            } else {
                console.log('[AIService] MinerU API Key missing. Skipping to Vision Model.');
            }
        }

        const config = getTaskConfig(settings, 'vision');

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

        // AI Vision
        const base64 = await resourceToBase64(resourcePath);

        // Determine whether this was a fallback from PDF
        const isFallback = (fileType === 'application/pdf');

        if (shouldUseGeminiNative(config, settings)) {
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
            // OpenAI Vision
            const messages = [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please analyze this image/file and extract the main content, key topics, and detailed information. Summarize it into a comprehensive text format. Language: Simplified Chinese." },
                        { type: "image_url", image_url: { url: `data:${fileType};base64,${base64}` } }
                    ]
                }
            ];
            const text = await callOpenAICompatible(config, messages);
            return {
                content: text,
                fallback: isFallback,
                provider: 'OpenAI Vision'
            };
        }
    },

    async generateOutline(topic: string, configStyle: StyleConfig, settings: AppSettings): Promise<OutlineItem[]> {
        const config = getTaskConfig(settings, 'text');

        const { targetPageCount, pageStructure } = configStyle;
        const structure = { ...(pageStructure || { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }) };

        // 自动校准正文页数,确保总数一致
        const fixedSum = (structure.cover || 0) + (structure.directory || 0) + (structure.transition || 0) + (structure.end || 0);
        structure.content = Math.max(1, targetPageCount - fixedSum);

        const prompt = `
            Task: 为主题 "${topic}" 生成一份结构化的 PPT 演示大纲。
            
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
            2. 简洁有力: 每页的 brief (简介) 应当提炼核心观点,不宜过长。
            3. 输出语言: 简体中文。
            
            【输出格式】:
            返回一个 JSON 数组,数组长度必须为 ${targetPageCount}。
            每个对象包含以下字段:
            - title: 页面标题
            - brief: 页面内容简介 (作为生成正文的参考)
            - pageType: 必须是 "cover" | "directory" | "transition" | "content" | "end" 中的一个。
            
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
                const messages = [{ role: "user", content: prompt }];
                jsonStr = await callOpenAICompatible(config, messages, 0.7, true);
            }
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(jsonStr);
            return parsed.map((item: any, index: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                index: index + 1,
                title: item.title,
                brief: item.brief,
                pageType: item.pageType || 'content',
                status: 'idle'
            }));
        } catch (e) {
            console.error("Outline Gen Error", e);
            throw new Error("Failed to generate outline");
        }
    },

    async generateSingleOutlineItem(topic: string, index: number, total: number, settings?: AppSettings): Promise<{ title: string, brief: string }> {
        const config = getTaskConfig(settings, 'text');
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
                jsonStr = await callOpenAICompatible(config, messages, 0.7, true);
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
        const config = getTaskConfig(settings, 'text');
        const prompt = `Topic Context: ${topicContext}
            Slide Title: ${title}
            Slide Intent: ${brief}
            
            Structural Context:
            - This is slide ${index} of ${total} in the entire presentation.
            - Page Type: ${pageType}
            
            Task: Write the full, detailed content for this slide.
            
            Requirements:
            1. Language: Strictly Simplified Chinese (简体中文).
            2. Include bullet points, key arguments, or data placeholders.
            3. Use a professional tone.
            4. Content length: ${pageType === 'content' ? '150-250' : '50-100'} words.`;

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
                return await callOpenAICompatible(config, messages);
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
        allSlideTitles?: string[]
    ): Promise<string> {
        const config = getTaskConfig(settings, 'image');
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
        if (styleRef) {
            try {
                styleKeywords = await analyzeStyleImage(styleRef, effectivePageType, settings);
                console.log(`[generateSlideVariant] Vision Analysis Results for ${effectivePageType}: ${styleKeywords.substring(0, 50)}...`);
            } catch (err) {
                console.warn(`[generateSlideVariant] Vision analysis failed, continuing with prompt only.`, err);
            }
        }

        // 3. 构建智能 Prompt
        const prompt = buildImageGenerationPrompt({
            pageType: effectivePageType,
            title: title || '',
            content: fullContent || (contentType === 'text' ? contentSource : ""),
            styleName: configStyle.styleName,
            colorPalette: configStyle.colorPalette,
            requirements: configStyle.requirements,
            aspectRatio: targetRatio,
            styleMatchType: matchType,
            allSlideTitles,
            styleKeywords
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
                // OpenAI DALL-E 3 (No Reference Image Support usually)
                const qualitySetting = settings?.imageGeneration?.resolution; // e.g., '3840x2160' acting as "4K Flag"
                const finalResolution = calculateFinalResolution(qualitySetting, targetRatio);

                console.log(`[generateSlideVariant] Resolution Calc: Quality=${qualitySetting}, Ratio=${targetRatio} -> ${finalResolution}`);

                const base64Result = await callOpenAIImageGeneration(config, prompt, targetRatio, finalResolution);
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

        const config = getTaskConfig(settings, isVisionMode ? 'vision' : 'text');

        // 2. 构建 Prompt
        const prompt = `
            Role: 资深视觉设计总监 & PPT 专家。
            Task: ${isVisionMode ? '分析这张设计图/PPT截图的【视觉风格】' : '分析用户的【设计需求描述】'}，并将其转化为结构化的 BananaSlides 设计规范。
            
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
                jsonStr = await callOpenAICompatible(config, messages, 0.7, true);
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
    async generateStyleReference(
        configStyle: StyleConfig,
        pageType: string,
        settings: AppSettings
    ): Promise<string> {
        // 复用 generateSlideVariant 的逻辑，但 Content 是空的
        return await AIService.generateSlideVariant(
            "", // No source content
            null, // No style file
            configStyle,
            "style-reference",
            `${configStyle.styleName} - ${pageType}页参考`,
            settings,
            'text',
            undefined,
            pageType
        );
    }
};
