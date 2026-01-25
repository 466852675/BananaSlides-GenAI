import express from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/template.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = express.Router();

// All template routes require authentication
router.use(authenticate);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
