import { Router } from 'express';
import * as LeadController from '../controllers/lead.controller';
import { authenticate, requireAdmin, optionalAuth as optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();


// 提交线索 (无需强制登录，但如果有 token 会关联用户)
router.post('/', optionalAuthenticate, LeadController.submitLead);

// 管理员接口
router.get('/', authenticate, requireAdmin, LeadController.listLeads);
router.put('/:id/status', authenticate, requireAdmin, LeadController.updateLeadStatus);
router.delete('/:id', authenticate, requireAdmin, LeadController.deleteLead);

export default router;
