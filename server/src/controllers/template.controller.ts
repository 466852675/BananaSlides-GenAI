import { Request, Response } from 'express';
import { templateService } from '../services/template.service';

const safeJSONParse = (str: string | null) => {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
};

const safeJSONStringify = (obj: any) => {
    if (obj === undefined || obj === null) return null;
    if (typeof obj === 'string') return obj;
    return JSON.stringify(obj);
};

const getOwnerId = (req: Request) => (req as any).user?.id as string;

const transformTemplateOut = (t: any) => {
    if (!t) return null;
    return {
        ...t,
        config: safeJSONParse(t.config) || {},
        styleMap: safeJSONParse(t.styleMap) || {}
    };
};

export const getTemplates = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);
        const raw = await templateService.findAll(ownerId, isAdmin);
        const templates = raw.map(transformTemplateOut);
        res.json(templates);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const { name, config, styleMap, isCustom } = req.body;
        const data = {
            name,
            config: safeJSONStringify(config) || "{}",
            styleMap: safeJSONStringify(styleMap),
            isCustom: isCustom !== undefined ? isCustom : true
        };
        const result = await templateService.create(ownerId, data);
        res.status(201).json(transformTemplateOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const id = req.params.id as string;
        const { name, config, styleMap, isRecommended, recommendCount, favoriteCount, usageCount, isOfficial } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (config !== undefined) updateData.config = safeJSONStringify(config);
        if (styleMap !== undefined) updateData.styleMap = safeJSONStringify(styleMap);
        if (isRecommended !== undefined) updateData.isRecommended = isRecommended;
        if (recommendCount !== undefined) updateData.recommendCount = recommendCount;
        if (favoriteCount !== undefined) updateData.favoriteCount = favoriteCount;
        if (usageCount !== undefined) updateData.usageCount = usageCount;
        if (isOfficial !== undefined) updateData.isOfficial = isOfficial;

        const result = await templateService.update(id, ownerId, updateData);
        res.json(transformTemplateOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const id = req.params.id as string;
        await templateService.delete(id, ownerId);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
