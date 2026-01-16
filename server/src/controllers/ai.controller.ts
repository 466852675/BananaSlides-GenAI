
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { SettingService } from '../services/setting.service';

// Helper to get settings from database (API keys never leave server)
const getServerSettings = async () => {
    return await SettingService.getSettings();
};

export const handleSmartRefine = async (req: Request, res: Response) => {
    const { text, type } = req.body;
    try {
        const settings = await getServerSettings();
        const result = await AIService.smartRefine(text, type, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleExtractText = async (req: Request, res: Response) => {
    const { resourcePath, fileType } = req.body;
    try {
        if (!resourcePath) throw new Error("Resource path is required");
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
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateOutline = async (req: Request, res: Response) => {
    const { topic, configStyle } = req.body;
    try {
        const settings = await getServerSettings();
        const result = await AIService.generateOutline(topic, configStyle, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSingleOutlineItem = async (req: Request, res: Response) => {
    const { topic, index, total } = req.body;
    try {
        const settings = await getServerSettings();
        const result = await AIService.generateSingleOutlineItem(topic, index, total, settings);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const handleGenerateSlideDetail = async (req: Request, res: Response) => {
    const { title, brief, topicContext } = req.body;
    try {
        const settings = await getServerSettings();
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
        contentType,
        contentMimeType 
    } = req.body;

    console.log(`[handleGenerateSlideVariant] Request for: ${variantLabel} (Title: ${title || 'N/A'})`);

    try {
        const settings = await getServerSettings();
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
