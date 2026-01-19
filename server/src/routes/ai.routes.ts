
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
    handleGenerateStyleReference
} from '../controllers/ai.controller';

const router = express.Router();

router.post('/analyze-template-concept', handleAnalyzeTemplateConcept);
router.post('/generate-style-reference', handleGenerateStyleReference);
router.post('/smart-refine', handleSmartRefine);
router.post('/extract-text', handleExtractText);
router.post('/generate-outline', handleGenerateOutline);
router.post('/generate-single-outline-item', handleGenerateSingleOutlineItem);
router.post('/generate-slide-detail', handleGenerateSlideDetail);
router.post('/generate-slide-variant', handleGenerateSlideVariant);

export default router;
