import { Request, Response } from 'express';

export const handleUpload = (req: Request, res: Response): void => {
    if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
    }
    
    // Return relative URL that can be accessed via static serve
    // Assumption: Server serves /uploads route mapping to uploads folder
    const url = `/uploads/${req.file.filename}`;
    
    // Return simple { url: "..." } for frontend compatibility
    res.json({
        url,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    });
};
