import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload';
import { handleUpload } from '../controllers/upload.controller';
import { uploadLimiter } from '../middleware/rateLimitMiddleware';

const router = Router();

// POST /api/upload
router.post(
    '/',
    uploadLimiter,
    (req, res, next) => {
        uploadMiddleware.single('file')(req, res, (err: any) => {
            if (err) {
                res.status(400).json({ success: false, error: err.message || 'UPLOAD_FAILED' });
                return;
            }
            next();
        });
    },
    handleUpload
);

export default router;
