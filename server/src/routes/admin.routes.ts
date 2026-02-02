// server/src/routes/admin.routes.ts
// 管理员路由：所有管理后台接口

import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import { authenticate, requireAdmin, requireSuperAdmin, requirePermission } from '../middlewares/auth.middleware';

const router = Router();

// 所有管理员路由都需要登录 + 管理员权限
router.use(authenticate);
router.use(requireAdmin);

// ============================================================
// 用户管理
// ============================================================
router.get('/users', AdminController.listUsers);
router.post('/users', authenticate, requireAdmin, requirePermission('admin.users.create'), AdminController.createUser); // 新增路由
router.get('/users/:id', AdminController.getUser);
router.put('/users/:id', authenticate, requireAdmin, requirePermission('admin.users.manage.role'), AdminController.updateUser);
router.post('/users/:id/reset-password', authenticate, requireAdmin, requirePermission('admin.users.reset.password'), AdminController.resetUserPassword);
router.post('/users/batch', authenticate, requireAdmin, requirePermission('admin.users.batch.action'), AdminController.batchUserAction);

// ============================================================
// 订单管理
// ============================================================
router.get('/orders', AdminController.listOrders);
router.put('/orders/:id', authenticate, requireAdmin, requirePermission('admin.orders.update.status'), AdminController.updateOrder);
router.post('/orders/:id/refund', authenticate, requireSuperAdmin, requirePermission('admin.orders.refund'), AdminController.refundOrder); // 退款需要超管

// ============================================================
// 积分规则管理
// ============================================================
router.get('/points-rules', AdminController.listPointsRules);
router.post('/points-rules', authenticate, requireSuperAdmin, requirePermission('admin.points.create'), AdminController.createPointsRule);
router.put('/points-rules/:id', requireSuperAdmin, AdminController.updatePointsRule);
router.delete('/points-rules/:id', authenticate, requireSuperAdmin, requirePermission('admin.points.delete'), AdminController.deletePointsRule);

// ============================================================
// 商品管理
// ============================================================
router.get('/products', AdminController.listProducts);
router.post('/products', authenticate, requireSuperAdmin, requirePermission('admin.products.create'), AdminController.createProduct);
router.put('/products/:id', authenticate, requireSuperAdmin, requirePermission('admin.products.manage.price'), AdminController.updateProduct);
router.delete('/products/:id', authenticate, requireSuperAdmin, requirePermission('admin.products.delete'), AdminController.deleteProduct);

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

// ============================================================
// 增长运营统计
// ============================================================
router.get('/growth/stats', AdminController.getGrowthStats);

export default router;
