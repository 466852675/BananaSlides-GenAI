// server/src/routes/admin.routes.ts
// 管理员路由：所有管理后台接口

import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middlewares/auth.middleware';

const router = Router();

// 所有管理员路由都需要登录 + 管理员权限
router.use(authenticate);
router.use(requireAdmin);

// ============================================================
// 用户管理
// ============================================================
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUser);
router.put('/users/:id', AdminController.updateUser);
router.post('/users/:id/reset-password', AdminController.resetUserPassword);
router.post('/users/batch', AdminController.batchUserAction);

// ============================================================
// 订单管理
// ============================================================
router.get('/orders', AdminController.listOrders);
router.put('/orders/:id', AdminController.updateOrder);
router.post('/orders/:id/refund', requireSuperAdmin, AdminController.refundOrder); // 退款需要超管

// ============================================================
// 积分规则管理
// ============================================================
router.get('/points-rules', AdminController.listPointsRules);
router.post('/points-rules', requireSuperAdmin, AdminController.createPointsRule);
router.put('/points-rules/:id', requireSuperAdmin, AdminController.updatePointsRule);
router.delete('/points-rules/:id', requireSuperAdmin, AdminController.deletePointsRule);

// ============================================================
// 角色权限管理
// ============================================================
router.get('/roles', AdminController.listRoles);
router.get('/permissions', AdminController.listPermissions);
router.get('/roles/:role/permissions', requireSuperAdmin, AdminController.getRolePermissions);
router.put('/roles/:role/permissions', requireSuperAdmin, AdminController.updateRolePermissions);

// ============================================================
// 系统统计
// ============================================================
router.get('/system/stats', AdminController.getSystemStats);

export default router;
