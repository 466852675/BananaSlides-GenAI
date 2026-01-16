import { Request, Response } from 'express';
import { MinerUService } from '../services/mineru.service';
import fs from 'fs';

// MinerU v4 Logic
export const parseDoc = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        // Parse config from request or use defaults/env
        const config = req.body.config ? JSON.parse(req.body.config) : {};
        
        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Validate config presence for direct API call
        if (!config.apiKey) {
             res.status(400).json({ error: 'API Key is required' });
             return;
        }

        const markdown = await MinerUService.parseFile(file.path, {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            provider: 'MinerU'
        });

        // Cleanup
        if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
        }

        res.json({ markdown });

    } catch (error: any) {
        console.error('[MinerU-Backend] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
