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
        const userRole = (req as any).user?.role;
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

        console.log(`[TemplateController] User: ${ownerId}, Role: ${userRole}, isAdmin: ${isAdmin}`);

        const raw = await templateService.findAll(ownerId, isAdmin);

        console.log(`[TemplateController] Returned ${raw.length} templates`);

        const templates = raw.map(transformTemplateOut);
        res.json(templates);
    } catch (error: any) {
        console.error('[TemplateController] Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const { name, thumbnailUrl, config, styleMap, isCustom } = req.body;
        const data = {
            name,
            thumbnailUrl: thumbnailUrl || null,
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
        const { name, thumbnailUrl, config, styleMap, isRecommended, recommendCount, favoriteCount, usageCount, isOfficial } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
        if (config !== undefined) updateData.config = safeJSONStringify(config);
        if (styleMap !== undefined) updateData.styleMap = safeJSONStringify(styleMap);
        if (isRecommended !== undefined) updateData.isRecommended = isRecommended;
        if (recommendCount !== undefined) updateData.recommendCount = recommendCount;
        if (favoriteCount !== undefined) updateData.favoriteCount = favoriteCount;
        if (usageCount !== undefined) updateData.usageCount = usageCount;
        if (isOfficial !== undefined) updateData.isOfficial = isOfficial;

        // Check if user is admin
        const userRole = (req as any).user?.role;
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);

        let result;
        if (isAdmin) {
            // Admin: try admin update first (for official templates), fallback to regular update
            result = await templateService.updateAdminFields(id, updateData);
            if (!result) {
                result = await templateService.update(id, ownerId, updateData);
            }
        } else {
            // Regular user: can only update own templates
            result = await templateService.update(id, ownerId, updateData);
        }

        if (!result) {
            return res.status(404).json({ error: '模板不存在或无权更新' });
        }

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
