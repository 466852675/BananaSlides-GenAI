import { Request, Response } from 'express';
import { resourceService } from '../services/resource.service';

export const handleUpload = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
    }

    // Return relative URL that can be accessed via static serve
    // Assumption: Server serves /uploads route mapping to uploads folder
    const url = `/uploads/${req.file.filename}`;

    // 注册资源到 AssetRegistry
    try {
        const projectId = req.body?.projectId || null;
        const userId = (req as any).user?.id || null;
        const purpose = req.body?.purpose || null;

        await resourceService.registerUserUpload({
            url,
            filename: req.file.filename,
            sizeBytes: req.file.size,
            mimeType: req.file.mimetype,
            projectId,
            userId,
            isReferenced: purpose === 'avatar'
        });
    } catch (registerError) {
        // 注册失败不影响上传功能
        console.warn('[Upload] 资源注册失败:', registerError);
    }

    // Return simple { url: "..." } for frontend compatibility
    res.json({
        url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
