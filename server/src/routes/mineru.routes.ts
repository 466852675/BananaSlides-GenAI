import { Router } from 'express';

const router = Router();

// GET /api/doc-parser/health
router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Doc parser service is available' });
});

// POST /api/doc-parser/parse
router.post('/parse', (req, res) => {
    res.status(501).json({
        error: 'NOT_IMPLEMENTED',
        message: 'Document parsing is not yet implemented'
    });
});

export default router;
