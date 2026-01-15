
import express from 'express';
import { 
    handleSmartRefine, 
    handleExtractText, 
    handleGenerateOutline, 
    handleGenerateSlideVariant,
    handleGenerateSingleOutlineItem,
    handleGenerateSlideDetail
} from '../controllers/ai.controller';

const router = express.Router();

router.post('/smart-refine', handleSmartRefine);
router.post('/extract-text', handleExtractText);
router.post('/generate-outline', handleGenerateOutline);
router.post('/generate-single-outline-item', handleGenerateSingleOutlineItem);
router.post('/generate-slide-detail', handleGenerateSlideDetail);
router.post('/generate-slide-variant', handleGenerateSlideVariant);

export default router;
