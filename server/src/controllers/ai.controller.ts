
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { SettingService } from '../services/setting.service';
import * as PointsService from '../services/points.service';

// Helper to get settings from database (API keys never leave server)
const getServerSettings = async () => {
    return await SettingService.getSettings();
};

// Check if MOCK_AI mode is enabled - in this mode, no points should be deducted
const isMockAiMode = () => process.env.MOCK_AI === '1';

// ============================================================
// 流式输出控制器 (Streaming Controllers)
// ============================================================

export const handleSmartRefineStream = async (req: Request, res: Response) => {
    const { text, type, projectId, triggerTime } = req.body;

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲

    let deductedPoints = 0;
    let transactionId: string | undefined;

    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'smart_refine',
                    projectId,
                    `AI 文本润色(流式): ${type}`,
                    1,
                    {
                        module: '模版间',
                        category: '文本生成',
                        subcategory: '智能润色',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined,
                        templateId: projectId
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.write(`data: ${JSON.stringify({ error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message } })}\n\n`);
            res.end();
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            deductedPoints = deductResult.deductedAmount;
            transactionId = deductResult.transactionId;
        }

        await AIService.smartRefineStream(text, type, settings, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });

        // 标记交易完成
        if (transactionId) {
            await PointsService.completeTransaction(transactionId);
        }

        res.write(`data: ${JSON.stringify({ done: true, pointsDeducted: deductedPoints })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('[handleSmartRefineStream] Error:', error);
        if (req.user && deductedPoints > 0 && transactionId) {
            await PointsService.refundPoints(req.user.id, deductedPoints, transactionId);
        }
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

export const handleGenerateOutlineStream = async (req: Request, res: Response) => {
    const { topic, configStyle, projectId, triggerTime } = req.body;

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let deductedPoints = 0;
    let transactionId: string | undefined;

    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'outline_generation',
                    projectId,
                    '大纲生成(流式)',
                    1,
                    {
                        module: '创作室',
                        category: '文本生成',
                        subcategory: '大纲生成',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.write(`data: ${JSON.stringify({ error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message } })}\n\n`);
            res.end();
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            deductedPoints = deductResult.deductedAmount;
            transactionId = deductResult.transactionId;
        }

        const result = await AIService.generateOutlineStream(
            topic,
            configStyle,
            settings,
            (item, index) => {
                res.write(`data: ${JSON.stringify({ item, index })}\n\n`);
            }
        );

        // 标记交易完成
        if (transactionId) {
            await PointsService.completeTransaction(transactionId);
        }

        res.write(`data: ${JSON.stringify({ done: true, total: result.length, pointsDeducted: deductedPoints })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('[handleGenerateOutlineStream] Error:', error);
        if (req.user && deductedPoints > 0 && transactionId) {
            await PointsService.refundPoints(req.user.id, deductedPoints, transactionId);
        }
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

export const handleGenerateSlideDetailStream = async (req: Request, res: Response) => {
    const { title, brief, topicContext, index, total, pageType, projectId, triggerTime } = req.body;

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let deductedPoints = 0;
    let transactionId: string | undefined;

    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'slide_content',
                    projectId,
                    `幻灯片内容(流式): ${title}`,
                    1,
                    {
                        module: '创作室',
                        category: '文本生成',
                        subcategory: '正文生成',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.write(`data: ${JSON.stringify({ error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message } })}\n\n`);
            res.end();
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            deductedPoints = deductResult.deductedAmount;
            transactionId = deductResult.transactionId;
        }

        await AIService.generateSlideDetailStream(
            title,
            brief,
            topicContext,
            index,
            total,
            pageType,
            settings,
            (chunk) => {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }
        );

        // 标记交易完成
        if (transactionId) {
            await PointsService.completeTransaction(transactionId);
        }

        res.write(`data: ${JSON.stringify({ done: true, pointsDeducted: deductedPoints })}\n\n`);
        res.end();
    } catch (error: any) {
        console.error('[handleGenerateSlideDetailStream] Error:', error);
        if (req.user && deductedPoints > 0 && transactionId) {
            await PointsService.refundPoints(req.user.id, deductedPoints, transactionId);
        }
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
};

// ============================================================
// 非流式控制器 (Non-Streaming Controllers)
// ============================================================

export const handleAnalyzeTemplateConcept = async (req: Request, res: Response) => {
    const { input, projectId, triggerTime } = req.body; // input can be string or { path, mimeType }
    try {
        // Vision 分析扣费：仅当输入为图片时扣费
        const isImageInput = input && typeof input === 'object' &&
            input.mimeType?.startsWith('image/');
        if (req.user && isImageInput && !isMockAiMode()) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'vision_analyze',
                projectId,
                'AI 视觉分析模版',
                1,
                {
                    module: '模版间',
                    category: '视觉分析',
                    subcategory: '模版分析',
                    triggerTime: triggerTime ? new Date(triggerTime) : undefined,
                    templateId: projectId // Map projectId to templateId for template actions
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
            (res as any).transactionId = deductResult.transactionId;
        }

        // FIX: Resolve relative upload path (e.g. /uploads/image.png) to absolute path
        if (input && typeof input === 'object' && input.path && typeof input.path === 'string' && input.path.startsWith('/uploads/')) {
            const path = require('path');
            const originalPath = input.path;
            input.path = path.resolve(process.cwd(), input.path.slice(1));
            console.log('[AnalyzeTemplateConcept] Resolved Path:', { original: originalPath, resolved: input.path, cwd: process.cwd() });
        } else {
            console.log('[AnalyzeTemplateConcept] Input Path Check:', { inputType: typeof input, isObject: typeof input === 'object', path: input?.path });
        }

        const settings = await getServerSettings();
        const result = await AIService.analyzeTemplateConcept(input, settings);

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleAnalyzeTemplateConcept] Error:', error);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateStylePreview = async (req: Request, res: Response) => {
    const { configStyle, pageType, settings: clientSettings, projectId, triggerTime } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        // 使用 slide_image 规则 (5积分)
        if (req.user && !isMockAiMode()) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'slide_image',
                projectId,
                `生成风格参考图: ${configStyle?.styleName || 'Custom'} - ${pageType}`,
                1,
                {
                    module: '模版间',
                    category: '图片生成',
                    subcategory: '风格参考图',
                    triggerTime: triggerTime ? new Date(triggerTime) : undefined,
                    templateId: projectId
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
            (res as any).transactionId = deductResult.transactionId;
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
        const result = await AIService.generateStylePreview(configStyle, pageType, settings);

        // Mark transaction as completed
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateStyleReference] Error:', error);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleSmartRefine = async (req: Request, res: Response) => {
    const { text, type, projectId, triggerTime } = req.body;
    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'smart_refine',
                    projectId,
                    `AI 文本润色: ${type}`,
                    1,
                    {
                        module: '模版间',
                        category: '文本生成',
                        subcategory: '智能润色',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined,
                        templateId: projectId
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.status(402).json({
                success: false,
                error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
            });
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            (res as any).deductedPoints = deductResult.deductedAmount;
            (res as any).transactionId = deductResult.transactionId;
        }

        const result = await AIService.smartRefine(text, type, settings);

        // Mark transaction as completed
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

import * as path from 'path';

export const handleExtractText = async (req: Request, res: Response) => {
    let { resourcePath, fileType, projectId, triggerTime } = req.body;
    try {
        if (!resourcePath) throw new Error("Resource path is required");

        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user && !isMockAiMode()) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'doc_parse',
                projectId,
                `文档解析: ${path.basename(resourcePath)}`,
                1,
                {
                    module: '创作室',
                    category: '文档解析',
                    subcategory: '文本提取',
                    triggerTime: triggerTime ? new Date(triggerTime) : undefined
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
            (res as any).transactionId = deductResult.transactionId;
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

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

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
        console.error('[handleExtractText] Error:', error);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateOutline = async (req: Request, res: Response) => {
    const { topic, configStyle, projectId, triggerTime } = req.body;
    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'outline_generation',
                    projectId,
                    undefined,
                    1,
                    {
                        module: '创作室',
                        category: '文本生成',
                        subcategory: '大纲生成',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.status(402).json({
                success: false,
                error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
            });
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            (res as any).deductedPoints = deductResult.deductedAmount;
            (res as any).transactionId = deductResult.transactionId;
        }

        const result = await AIService.generateOutline(topic, configStyle, settings);

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateOutline] Error:', error);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSingleOutlineItem = async (req: Request, res: Response) => {
    const { topic, index, total, projectId, triggerTime } = req.body;
    try {
        // 积分扣费（登录用户扣费，未登录免费）
        if (req.user && !isMockAiMode()) {
            const deductResult = await PointsService.deductPoints(
                req.user.id,
                'outline_page_regen',
                projectId,
                `大纲单页重写: 第 ${index} 页`,
                1,
                {
                    module: '创作室',
                    category: '文本生成',
                    subcategory: '大纲优化',
                    triggerTime: triggerTime ? new Date(triggerTime) : undefined
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
            (res as any).transactionId = deductResult.transactionId;
        }

        const settings = await getServerSettings();
        const result = await AIService.generateSingleOutlineItem(topic, index, total, settings);

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        console.error('[handleGenerateSingleOutlineItem] Error:', error);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSlideDetail = async (req: Request, res: Response) => {
    const { title, brief, topicContext, index, total, pageType, projectId, triggerTime } = req.body;
    try {
        // [优化] 并行执行积分扣费和配置获取
        const [deductResult, settings] = await Promise.all([
            req.user && !isMockAiMode()
                ? PointsService.deductPoints(
                    req.user.id,
                    'slide_content',
                    projectId,
                    `幻灯片内容: ${title}`,
                    1,
                    {
                        module: '创作室',
                        category: '文本生成',
                        subcategory: '正文生成',
                        triggerTime: triggerTime ? new Date(triggerTime) : undefined
                    }
                )
                : Promise.resolve({ success: true, deductedAmount: 0, remainingPoints: 0 } as PointsService.DeductResult),
            getServerSettings()
        ]);

        // 检查积分扣费结果
        if (req.user && !isMockAiMode() && !deductResult.success) {
            res.status(402).json({
                success: false,
                error: { code: 'INSUFFICIENT_POINTS', message: deductResult.message }
            });
            return;
        }
        if (deductResult.success && deductResult.deductedAmount) {
            (res as any).deductedPoints = deductResult.deductedAmount;
            (res as any).transactionId = deductResult.transactionId;
        }

        const result = await AIService.generateSlideDetail(title, brief, topicContext, index, total, pageType, settings);

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({ success: true, data: result, pointsDeducted: (res as any).deductedPoints });
    } catch (error: any) {
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
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
        projectId,
        triggerTime
    } = req.body;

    try {
        // 配图生成扣费（当 contentType 为 image 或 variantLabel 包含相关关键字时扣费）
        const isImageGeneration = contentType === 'image' ||
            variantLabel?.toLowerCase().includes('image') ||
            variantLabel?.toLowerCase().includes('背景') ||
            variantLabel?.toLowerCase().includes('配图') ||
            variantLabel?.toLowerCase().includes('插图') ||
            variantLabel?.toLowerCase().includes('option');

        if (req.user && !isMockAiMode()) {
            const actionCode = isImageGeneration ? 'slide_image' : 'slide_content';
            const category = isImageGeneration ? '图片生成' : '文本生成';
            const subcategory = isImageGeneration ? '正文配图' : '内容变体';

            const deductResult = await PointsService.deductPoints(
                req.user.id,
                actionCode,
                projectId,
                `${isImageGeneration ? '配图' : '内容'}生成: ${title || variantLabel}`,
                1,
                {
                    module: '创作室',
                    category: category,
                    subcategory: subcategory,
                    triggerTime: triggerTime ? new Date(triggerTime) : undefined
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
            (res as any).transactionId = deductResult.transactionId;
        }

        const settings = await getServerSettings();
        const warningContext: { warning?: string } = {};
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
            allSlideTitles,
            warningContext       // 新增: 传递 context 用于接收降级信号
        );

        // Mark transaction as completed if successful
        if ((res as any).transactionId) {
            await PointsService.completeTransaction((res as any).transactionId);
        }

        res.json({
            success: true,
            data: result,
            pointsDeducted: (res as any).deductedPoints,
            ...(warningContext.warning ? {
                warning: warningContext.warning,
                warningMessage: "设计需求未按标准格式分段，已使用完整文本"
            } : {})
        });
    } catch (error: any) {
        console.error('[handleGenerateSlideVariant] Error:', error.message);
        if (req.user && (res as any).deductedPoints > 0) {
            await PointsService.refundPoints(req.user.id, (res as any).deductedPoints, (res as any).transactionId);
        }
        res.status(500).json({ success: false, error: error.message });
    }
};
