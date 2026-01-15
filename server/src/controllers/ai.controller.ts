
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';

export const handleSmartRefine = async (req: Request, res: Response) => {
    const { text, type, settings } = req.body;
    try {
        const result = await AIService.smartRefine(text, type, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleExtractText = async (req: Request, res: Response) => {
    const { resourcePath, fileType, settings } = req.body;
    try {
        if (!resourcePath) throw new Error("Resource path is required");
        const result = await AIService.extractTextFromFile(resourcePath, fileType || 'application/octet-stream', settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateOutline = async (req: Request, res: Response) => {
    const { topic, configStyle, settings } = req.body;
    try {
        const result = await AIService.generateOutline(topic, configStyle, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSingleOutlineItem = async (req: Request, res: Response) => {
    const { topic, index, total, settings } = req.body;
    try {
        const result = await AIService.generateSingleOutlineItem(topic, index, total, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSlideDetail = async (req: Request, res: Response) => {
    const { title, brief, topicContext, settings } = req.body;
    try {
        const result = await AIService.generateSlideDetail(title, brief, topicContext, settings);
        res.json({ success: true, data: result });
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
        settings, 
        contentType,
        contentMimeType 
    } = req.body;

    console.log('[handleGenerateSlideVariant] Received settings:', JSON.stringify(settings, null, 2));

    try {
        const result = await AIService.generateSlideVariant(
            contentSource, 
            styleFile, 
            configStyle, 
            variantLabel, 
            title, 
            settings, 
            contentType,
            contentMimeType
        );
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('[handleGenerateSlideVariant] Error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
};
