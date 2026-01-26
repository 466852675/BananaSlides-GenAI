
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { SettingService } from '../services/setting.service';
import * as PointsService from '../services/points.service';

// Helper to get settings from database (API keys never leave server)
const getServerSettings = async () => {
    return await SettingService.getSettings();
};

export const handleAnalyzeTemplateConcept = async (req: Request, res: Response) => {
    const { input, projectId } = req.body; // input can be string or { path, mimeType }
    try {
        // Vision 分析扣费：仅当输入为图片时扣费
        const isImageInput = input && typeof input === 'object' &&
            input.mimeType?.startsWith('image/');
        if (req.user && isImageInput) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'vision_analyze',
                projectId,
                'AI 视觉分析模版',
                1,
                {
                    module: '创作室',
                    category: '视觉分析',
                    subcategory: '模版分析'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.analyzeTemplateConcept(input, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleAnalyzeTemplateConcept] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateStyleReference = async (req: Request, res: Response) => {
    const { configStyle, pageType, settings: clientSettings, projectId } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        // 使用 slide_image 规则 (5积分)
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'slide_image',
                projectId,
                `生成风格参考图: ${configStyle?.styleName || 'Custom'} - ${pageType}`,
                1,
                {
                    module: '创作室',
                    category: '图片生成',
                    subcategory: '风格参考图'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        let settings = await getServerSettings();
        if (clientSettings) {
            // Apply client overrides (e.g. from frontend Global Settings)
            settings = { ...settings, ...clientSettings };
            // Deep merge AI settings if needed, but simple spread is usually enough for top level
            if (clientSettings.ai) {
                settings.ai = { ...settings.ai, ...clientSettings.ai };
            }
        }
        const result = await AIService.generateStyleReference(configStyle, pageType, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateStyleReference] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleSmartRefine = async (req: Request, res: Response) => {
    const { text, type, projectId } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'smart_refine',
                projectId,
                `AI 文本润色: ${type}`,
                1,
                {
                    module: '创作室',
                    category: '文本生成',
                    subcategory: '智能润色'
                }
            );
            if (!deductResult.success) {
                res.status(420).json({ // Using a clear error for points
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.smartRefine(text, type, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

import * as path from 'path';

export const handleExtractText = async (req: Request, res: Response) => {
    let { resourcePath, fileType, projectId } = req.body;
    try {
        if (!resourcePath) throw new Error("Resource path is required");

        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'doc_parse',
                projectId,
                `文档解析: ${path.basename(resourcePath)}`,
                1,
                {
                    module: '创作室',
                    category: '文档解析',
                    subcategory: '文本提取'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        // FIX: Resolve relative upload path (e.g. /uploads/file.pdf) to absolute path for MinerU/FS
        if (typeof resourcePath === 'string' && resourcePath.startsWith('/uploads/')) {
            resourcePath = path.resolve(process.cwd(), resourcePath.slice(1));
        }

        const settings = await getServerSettings();
        const result = await AIService.extractTextFromFile(resourcePath, fileType || 'application/octet-stream', settings);

        // Unpack the new object result
        // if result is string (legacy/local), handle it? No, we updated service to always return object now.
        // But to be safe:
        const content = typeof result === 'string' ? result : result.content;
        const fallback = typeof result === 'string' ? false : result.fallback;
        const provider = typeof result === 'string' ? 'unknown' : result.provider;

        res.json({
            success: true,
            data: content,
            meta: {
                isFallback: fallback,
                provider: provider
            },
            pointsDeducted: (res as any).deductedPoints
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateOutline = async (req: Request, res: Response) => {
    const { topic, configStyle, projectId } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'outline_generation',
                projectId,
                undefined,
                1,
                {
                    module: '创作室',
                    category: '文本生成',
                    subcategory: '大纲生成'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.generateOutline(topic, configStyle, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateOutline] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSingleOutlineItem = async (req: Request, res: Response) => {
    const { topic, index, total, projectId } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'outline_page_regen',
                projectId,
                `大纲单页重写: 第 ${index} 页`,
                1,
                {
                    module: '创作室',
                    category: '文本生成',
                    subcategory: '大纲优化'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.generateSingleOutlineItem(topic, index, total, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSlideDetail = async (req: Request, res: Response) => {
    const { title, brief, topicContext, index, total, pageType, projectId } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'slide_content',
                projectId,
                `幻灯片内容: ${title}`,
                1,
                {
                    module: '创作室',
                    category: '文本生成',
                    subcategory: '正文生成'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.generateSlideDetail(title, brief, topicContext, index, total, pageType, settings);
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSlideVariant = async (req: Request, res: Response) => {
    const {
        contentSource,
        styleFile,
        configStyle,
        variantLabel,
        title,
        contentType,
        contentMimeType,
        // 新增参数 ↓
        pageType,
        fullContent,
        globalStyleMap,
        allSlideTitles,
        projectId
    } = req.body;

    console.log(`[handleGenerateSlideVariant] Request for: ${variantLabel} (Title: ${title || 'N/A'}), PageType: ${pageType || 'N/A'}`);

    try {
        // 配图生成扣费（仅当 variantLabel 包含 image 时扣费）
        const isImageGeneration = variantLabel?.toLowerCase().includes('image') ||
            variantLabel?.toLowerCase().includes('背景') ||
            variantLabel?.toLowerCase().includes('配图');
        if (req.user && isImageGeneration) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'slide_image',
                projectId,
                `配图生成: ${title || variantLabel}`,
                1,
                {
                    module: '创作室',
                    category: '图片生成',
                    subcategory: '正文配图'
                }
            );
            if (!deductResult.success) {
                res.status(402).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
                });
                return;
            }
            (res as any).deductedPoints = deductResult.deductedAmount;
        }

        const settings = await getServerSettings();
        const result = await AIService.generateSlideVariant(
            contentSource,
            styleFile,
            configStyle,
            variantLabel,
            title,
            settings,
            contentType,
            contentMimeType,
            // 传递新参数 ↓
            pageType,
            fullContent,
            globalStyleMap,
            allSlideTitles
        );
        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateSlideVariant] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
