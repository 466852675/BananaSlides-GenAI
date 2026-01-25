import { Request, Response } from 'express';
import { favoriteService } from '../services/favorite.service';

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

const transformFavoriteOut = (f: any) => {
    if (!f) return null;
    return {
        ...f,
        config: safeJSONParse(f.config) || {},
        styleMap: safeJSONParse(f.styleMap) || {},
        sampleImages: safeJSONParse(f.sampleImages) || []
    };
};

const getOwnerId = (req: Request) => (req as any).user?.id as string;

export const getFavorites = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);
        const raw = await favoriteService.findAll(ownerId, isAdmin);
        const favorites = raw.map(transformFavoriteOut);
        res.json(favorites);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createFavorite = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const { templateId, name, config, styleMap, sampleImages } = req.body;
        const data = {
            templateId,
            name,
            config: safeJSONStringify(config) || "{}",
            styleMap: safeJSONStringify(styleMap),
            sampleImages: safeJSONStringify(sampleImages)
        };
        const result = await favoriteService.create(ownerId, data as any);
        res.status(201).json(transformFavoriteOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteFavorite = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const id = req.params.id as string;
        const result = await favoriteService.delete(id, ownerId);
        if (!result) {
            res.status(404).json({ error: 'Favorite not found' });
            return;
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
