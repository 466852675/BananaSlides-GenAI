import { Request, Response } from 'express';
import { snapshotService } from '../services/snapshot.service';

const getOwnerId = (req: Request) => (req as any).user?.id as string | undefined;

export class SnapshotController {
    create = async (req: Request, res: Response) => {
        try {
            const ownerId = getOwnerId(req);
            if (!ownerId) return res.status(401).json({ error: 'UNAUTHORIZED' });
            const projectId = req.params.projectId as string;
            // Frontend should define structure: { projectData: ..., settings: ... }
            const { projectData, settings } = req.body;

            if (!projectData) {
                return res.status(400).json({ error: "Missing projectData" });
            }

            console.log(`[SnapshotController] Creating snapshot for project: ${projectId}`);
            const snapshot = await snapshotService.create(projectId, ownerId, projectData, settings);
            console.log(`[SnapshotController] Snapshot created: id=${snapshot.id}, version=${snapshot.version}`);

            res.json(snapshot);
        } catch (error: any) {
            console.error("[SnapshotController] Snapshot create error:", error);
            res.status(500).json({ error: error.message });
        }
    };

    findAll = async (req: Request, res: Response) => {
        try {
            const ownerId = getOwnerId(req);
            if (!ownerId) return res.status(401).json({ error: 'UNAUTHORIZED' });
            const projectId = req.params.projectId as string;
            const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((req as any).user?.role);
            console.log(`[SnapshotController] Listing snapshots for project: ${projectId}`);

            const snapshots = await snapshotService.findAll(projectId, ownerId, isAdmin);
            console.log(`[SnapshotController] Found ${snapshots.length} snapshots:`, snapshots.map((s: any) => ({ id: s.id, version: s.version })));

            res.json(snapshots);
        } catch (error: any) {
            console.error("[SnapshotController] Snapshot list error:", error);
            res.status(500).json({ error: error.message });
        }
    };

    getOne = async (req: Request, res: Response) => {
        try {
            const ownerId = getOwnerId(req);
            if (!ownerId) return res.status(401).json({ error: 'UNAUTHORIZED' });
            const snapshotId = req.params.snapshotId as string;
            console.log(`[SnapshotController] Fetching snapshot with ID: ${snapshotId}`);

            const snapshot = await snapshotService.findById(snapshotId, ownerId);

            if (!snapshot) {
                console.warn(`[SnapshotController] Snapshot not found: ${snapshotId}`);
                return res.status(404).json({ error: "Snapshot not found" });
            }

            console.log(`[SnapshotController] Snapshot found: version ${snapshot.version}, projectId ${snapshot.projectId}`);
            res.json(snapshot);
        } catch (error: any) {
            console.error("[SnapshotController] Error fetching snapshot:", error);
            res.status(500).json({ error: error.message });
        }
    };

    restore = async (req: Request, res: Response) => {
        try {
            const ownerId = getOwnerId(req);
            if (!ownerId) return res.status(401).json({ error: 'UNAUTHORIZED' });
            const snapshotId = req.params.snapshotId as string;
            const result = await snapshotService.restore(snapshotId, ownerId);
            res.json(result);
        } catch (error: any) {
            console.error("Snapshot restore error", error);
            res.status(500).json({ error: error.message });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const ownerId = getOwnerId(req);
            if (!ownerId) return res.status(401).json({ error: 'UNAUTHORIZED' });
            const snapshotId = req.params.snapshotId as string;
            const result = await snapshotService.delete(snapshotId, ownerId);
            if (!result) {
                res.status(404).json({ error: "Snapshot not found" });
                return;
            }
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

export const snapshotController = new SnapshotController();
