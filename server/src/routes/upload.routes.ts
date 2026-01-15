import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload';
import { handleUpload } from '../controllers/upload.controller';

const router = Router();

// POST /api/upload
router.post('/', uploadMiddleware.single('file'), handleUpload);

export default router;
