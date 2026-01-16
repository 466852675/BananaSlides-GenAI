import express from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../controllers/template.controller';

const router = express.Router();

router.get('/', getTemplates);
router.post('/', createTemplate);
router.patch('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

export default router;
