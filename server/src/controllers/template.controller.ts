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
        const raw = await templateService.findAll();
        const templates = raw.map(transformTemplateOut);
        res.json(templates);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createTemplate = async (req: Request, res: Response) => {
    try {
        const { name, config, styleMap, isCustom } = req.body;
        const data = {
            name,
            config: safeJSONStringify(config) || "{}",
            styleMap: safeJSONStringify(styleMap),
            isCustom: isCustom !== undefined ? isCustom : true
        };
        const result = await templateService.create(data);
        res.status(201).json(transformTemplateOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateTemplate = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { name, config, styleMap } = req.body;
        
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (config !== undefined) updateData.config = safeJSONStringify(config);
        if (styleMap !== undefined) updateData.styleMap = safeJSONStringify(styleMap);

        const result = await templateService.update(id, updateData);
        res.json(transformTemplateOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await templateService.delete(id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
