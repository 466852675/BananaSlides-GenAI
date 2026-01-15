import { Request, Response } from 'express';
import { snapshotService } from '../services/snapshot.service';

export class SnapshotController {
    
    async create(req: Request, res: Response) {
        try {
            const projectId = req.params.projectId as string;
            // Frontend should define structure: { projectData: ..., settings: ... }
            const { projectData, settings } = req.body;
            
            if (!projectData) {
                return res.status(400).json({ error: "Missing projectData" });
            }
            
            console.log(`[SnapshotController] Creating snapshot for project: ${projectId}`);
            const snapshot = await snapshotService.create(projectId, projectData, settings);
            console.log(`[SnapshotController] Snapshot created: id=${snapshot.id}, version=${snapshot.version}`);
            
            res.json(snapshot);
        } catch (error: any) {
            console.error("[SnapshotController] Snapshot create error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async findAll(req: Request, res: Response) {
        try {
            const projectId = req.params.projectId as string;
            console.log(`[SnapshotController] Listing snapshots for project: ${projectId}`);
            
            const snapshots = await snapshotService.findAll(projectId);
            console.log(`[SnapshotController] Found ${snapshots.length} snapshots:`, snapshots.map((s: any) => ({ id: s.id, version: s.version })));
            
            res.json(snapshots);
        } catch (error: any) {
             console.error("[SnapshotController] Snapshot list error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getOne(req: Request, res: Response) {
        try {
            const snapshotId = req.params.snapshotId as string;
            console.log(`[SnapshotController] Fetching snapshot with ID: ${snapshotId}`);
            
            const snapshot = await snapshotService.findById(snapshotId);
            
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
    }
    
    async restore(req: Request, res: Response) {
        try {
            const snapshotId = req.params.snapshotId as string;
            const result = await snapshotService.restore(snapshotId);
            res.json(result);
        } catch (error: any) {
             console.error("Snapshot restore error", error);
            res.status(500).json({ error: error.message });
        }
    }
    
    async delete(req: Request, res: Response) {
        try {
            const snapshotId = req.params.snapshotId as string;
            await snapshotService.delete(snapshotId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}

export const snapshotController = new SnapshotController();
