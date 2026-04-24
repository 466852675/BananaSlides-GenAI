import { Router } from 'express';
import { handleGetSettings, handleGetMaskedSettings, handleUpdateSettings, handleResetSettings } from '../controllers/setting.controller';
import { authenticate, requireAdmin, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/settings - Full settings (requires authentication)
router.get('/', authenticate, requireAdmin, handleGetSettings);

// GET /api/settings/masked - Masked settings (for frontend display, hides API keys)
// 需要查看系统设置权限
router.get('/masked', authenticate, requireAdmin, requirePermission('admin.settings.view'), handleGetMaskedSettings);

// POST /api/settings/reset - Reset settings to Environment defaults
// 需要重置设置权限（仅超级管理员）
router.post('/reset', authenticate, requireAdmin, requirePermission('admin.settings.reset'), handleResetSettings);

// POST /api/settings - Update settings
// 需要修改通用设置权限
router.post('/', authenticate, requireAdmin, requirePermission('admin.settings.update.general'), handleUpdateSettings);

export default router;
