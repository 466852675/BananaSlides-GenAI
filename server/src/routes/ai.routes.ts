
import express from 'express';
import {
    handleSmartRefine,
    handleExtractText,
    handleGenerateOutline,
    handleGenerateSlideVariant,
    handleGenerateSingleOutlineItem,
    handleGenerateSlideDetail,
    // New Handlers
    handleAnalyzeTemplateConcept,
    handleGenerateStylePreview,
    // Streaming Handlers
    handleSmartRefineStream,
    handleGenerateOutlineStream,
    handleGenerateSlideDetailStream
} from '../controllers/ai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middleware/validateMiddleware';
import { SmartRefineSchema } from '../validators';

const router = express.Router();

// 所有 AI 路由强制要求登录认证（防止未登录用户滥用）
router.use(authenticate);

// 非流式端点
router.post('/analyze-template-concept', handleAnalyzeTemplateConcept);
router.post('/generate-style-preview', handleGenerateStylePreview);
router.post('/generate-style-reference', handleGenerateStylePreview); // @deprecated 保留兼容
router.post('/smart-refine', validate(SmartRefineSchema), handleSmartRefine);
router.post('/extract-text', handleExtractText);
router.post('/generate-outline', handleGenerateOutline);
router.post('/generate-single-outline-item', handleGenerateSingleOutlineItem);
router.post('/generate-slide-detail', handleGenerateSlideDetail);
router.post('/generate-slide-variant', handleGenerateSlideVariant);

// 流式端点
router.post('/smart-refine/stream', validate(SmartRefineSchema), handleSmartRefineStream);
router.post('/generate-outline/stream', handleGenerateOutlineStream);
router.post('/generate-slide-detail/stream', handleGenerateSlideDetailStream);

export default router;
