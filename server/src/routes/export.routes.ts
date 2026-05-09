/**
 * Export Routes — 服务端导出 API
 */

import { Router } from 'express';
import { handleExportPptx } from '../controllers/export.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 所有导出路由要求登录认证
router.use(authenticate);

// SVG → PPTX 可编辑导出
router.post('/pptx', handleExportPptx);

export default router;