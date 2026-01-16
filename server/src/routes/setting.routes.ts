import { Router } from 'express';
import { handleGetSettings, handleGetMaskedSettings, handleUpdateSettings, handleResetSettings } from '../controllers/setting.controller';

const router = Router();

// GET /api/settings - Full settings (for backend/AI service use)
router.get('/', handleGetSettings);

// GET /api/settings/masked - Masked settings (for frontend display, hides API keys)
router.get('/masked', handleGetMaskedSettings);

// POST /api/settings/reset - Reset settings to Environment defaults
router.post('/reset', handleResetSettings);

// POST /api/settings - Update settings
router.post('/', handleUpdateSettings);

export default router;
