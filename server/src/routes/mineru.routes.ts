import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload';
import { parseDoc } from '../controllers/mineru.controller';

const router = Router();

// POST /api/doc-parser/parse
router.post('/parse', uploadMiddleware.single('file'), parseDoc);

export default router;
