import { Request, Response } from 'express';
import { projectService } from '../services/project.service';
import { quotaService } from '../services/quota.service';

// --- Helpers ---
const safeJSONParse = (str: string | null | any) => {
    if (!str) return null;
    // If already an object or array (Prisma auto-parses JSON fields), return as-is
    if (typeof str === 'object') return str;
    // Otherwise parse the string
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
};

const safeJSONStringify = (obj: any) => {
    if (obj === undefined || obj === null) return null;
    if (typeof obj === 'string') return obj; // Already string?
    return JSON.stringify(obj);
};

const getOwnerId = (req: Request) => (req as any).user?.id as string;
const isAdminRole = (req: Request) => ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);
const allowedScenarioTypes = new Set(['ACADEMIC', 'BUSINESS', 'CREATIVE']);

const transformProjectOut = (p: any) => {
    if (!p) return null;
    return {
        ...p,
        globalConfig: safeJSONParse(p.globalConfig) || {},
        styleMap: safeJSONParse(p.styleMap),
        items: p.items?.map((i: any) => ({
            ...i,
            variants: safeJSONParse(i.variants) || [],
            originalFileRef: safeJSONParse(i.originalFileRef)
        }))
    };
};

// --- Controllers ---

export const getProjects = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = isAdminRole(req);
        const rawProjects = await projectService.findAll(ownerId, isAdmin);
        const projects = rawProjects.map(transformProjectOut);
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getProject = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = isAdminRole(req);
        const rawProject = await projectService.findById(req.params.id as string, ownerId, isAdmin);
        if (!rawProject) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(transformProjectOut(rawProject));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createProject = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isPro = ((req as any).user?.vipLevel > 0 && (!req.user?.vipExpiresAt || new Date(req.user.vipExpiresAt) > new Date())) || ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);
        const { title, status, isPinned, globalConfig, styleMap, globalStyleMap, items, thumbnailUrl, scenarioType } = req.body;
        if (scenarioType !== undefined && scenarioType !== null && !allowedScenarioTypes.has(String(scenarioType))) {
            res.status(400).json({ error: 'INVALID_SCENARIO_TYPE' });
            return;
        }

        // Check Quota (Skip for Admins)
        const isAdmin = isAdminRole(req);

        if (!isAdmin) {
            const limit = quotaService.getDefaultLimit('project_count', isPro);
            const currentCount = await projectService.countActive(ownerId);
            if (limit > 0 && currentCount >= limit) {
                res.status(403).json({ error: 'QUOTA_PROJECT_LIMIT', limit, currentCount });
                return;
            }
        }

        // Transform Input -> Prisma Format
        const slideData = (items || []).map((item: any, idx: number) => ({
            index: idx,
            pageType: item.pageType,
            contentType: item.contentType,
            title: item.title || "Untitled",
            content: item.textContent || item.content || "",
            brief: item.brief || "",
            variantCount: Math.min(Math.max(item.variantCount || 2, 1), 4),
            variants: safeJSONStringify(item.variants) || "[]",
            previewUrl: item.previewUrl || null,
            originalFileRef: safeJSONStringify(item.originalFileRef ?? item.originalFile),
            status: item.status === 'completed' ? 'success' : (item.status || "idle")
        }));

        const projectData: any = {
            title,
            status: status || 'idle', // Use provided status or default to idle
            isPinned: isPinned || false,
            thumbnailUrl,
            scenarioType: scenarioType || 'BUSINESS',
            globalConfig: safeJSONStringify(globalConfig) || "{}",
            styleMap: safeJSONStringify(styleMap || globalStyleMap),
        };

        // Only include Slide creation if there are slides to create
        if (slideData.length > 0) {
            projectData.Slide = { create: slideData };
        }

        const result = await projectService.create(ownerId, projectData);
        res.status(201).json(transformProjectOut(result));
    } catch (error: any) {
        console.error("Create Project Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const { id } = req.params;
        const { title, globalConfig, styleMap, status, isPinned, scenarioType } = req.body;
        if (scenarioType !== undefined && scenarioType !== null && !allowedScenarioTypes.has(String(scenarioType))) {
            res.status(400).json({ error: 'INVALID_SCENARIO_TYPE' });
            return;
        }

        // This is a simplified update 
        // Real-world might need 'upsert' for items, but Phase 1 focuses on top-level
        // or full replacement.

        /* 
           Ideally, for full sync:
           delete all items? No that's expensive via Prisma without transaction.
           For now, let's just update Top Level + Global Config
        */

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (isPinned !== undefined) updateData.isPinned = isPinned;
        if (scenarioType !== undefined) updateData.scenarioType = scenarioType;
        if (globalConfig !== undefined) updateData.globalConfig = safeJSONStringify(globalConfig);
        if (styleMap !== undefined) updateData.styleMap = safeJSONStringify(styleMap);
        // Fallback for frontend alias
        else if (req.body.globalStyleMap !== undefined) updateData.styleMap = safeJSONStringify(req.body.globalStyleMap);

        // Special handling for Pinning:
        // If ONLY 'isPinned' is being updated, we want to PRESERVE the original 'updatedAt'
        // so that pinning/unpinning doesn't change the project's sort order (last active time).
        const updateKeys = Object.keys(updateData);
        const isAdmin = isAdminRole(req);
        if (updateKeys.length === 1 && updateKeys[0] === 'isPinned') {
            const result = await projectService.setPinnedStatus(id as string, ownerId, isPinned, isAdmin);
            if (result) {
                res.json(transformProjectOut(result));
            } else {
                res.status(404).json({ error: 'Project not found' });
            }
            return;
        }

        const result = await projectService.update(id as string, ownerId, updateData, isAdmin);
        if (!result) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(transformProjectOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const syncProjectSlides = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = isAdminRole(req);
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { slides } = req.body;

        if (!Array.isArray(slides)) {
            res.status(400).json({ error: 'slides must be an array' });
            return;
        }

        const result = await projectService.syncSlides(id, ownerId, slides, isAdmin);
        if (!result) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(transformProjectOut(result));
    } catch (error: any) {
        console.error('Sync Slides Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getTrashProjects = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const rawProjects = await projectService.listTrash(ownerId);
        const projects = rawProjects.map(transformProjectOut);
        res.json(projects);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const restoreProject = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = isAdminRole(req);
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await projectService.restore(id, ownerId, isAdmin);
        if (!result) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json(transformProjectOut(result));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    try {
        const ownerId = getOwnerId(req);
        const isAdmin = isAdminRole(req);
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await projectService.softDelete(id, ownerId, isAdmin);
        if (!result) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
