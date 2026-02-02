import { Router } from 'express';
import * as LeadController from '../controllers/lead.controller';
import { authenticate, requireAdmin, requirePermission, optionalAuth as optionalAuthenticate } from '../middlewares/auth.middleware';

const router = Router();


// 提交线索 (无需强制登录，但如果有 token 会关联用户)
router.post('/', optionalAuthenticate, LeadController.submitLead);

// 管理员接口 - 添加细粒度权限控制
router.get('/', authenticate, requireAdmin, requirePermission('admin.leads.view'), LeadController.listLeads);
router.get('/:id', authenticate, requireAdmin, requirePermission('admin.leads.view.detail'), LeadController.getLeadDetail);
router.put('/:id/status', authenticate, requireAdmin, requirePermission('admin.leads.manage.status'), LeadController.updateLeadStatus);
router.put('/:id/note', authenticate, requireAdmin, requirePermission('admin.leads.manage.note'), LeadController.addLeadNote);
router.post('/:id/convert', authenticate, requireAdmin, requirePermission('admin.leads.convert'), LeadController.convertLeadToUser);
router.delete('/:id', authenticate, requireAdmin, requirePermission('admin.leads.delete'), LeadController.deleteLead);

export default router;
