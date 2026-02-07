// server/src/routes/admin.routes.ts
// 管理员路由：所有管理后台接口

import { Router } from 'express';
import * as AdminController from '../controllers/admin.controller';
import { authenticate, requireAdmin, requireSuperAdmin, requirePermission } from '../middlewares/auth.middleware';
import * as RefundService from '../services/refund.service';

const router = Router();

// 所有管理员路由都需要登录 + 管理员权限
router.use(authenticate);
router.use(requireAdmin);

// ============================================================
// AI 引擎规则管理
// ============================================================
router.get('/ai-engine-rules', requireSuperAdmin, AdminController.listEngineRules);
router.post('/ai-engine-rules', requireSuperAdmin, AdminController.createEngineRule);
router.put('/ai-engine-rules/:id', requireSuperAdmin, AdminController.updateEngineRule);
router.post('/ai-engine-rules/:id/activate', requireSuperAdmin, AdminController.activateEngineRule);
router.delete('/ai-engine-rules/:id', requireSuperAdmin, AdminController.deleteEngineRule);

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
router.get('/roles/my-permissions', AdminController.getMyPermissions);
router.get('/permissions', AdminController.listPermissions);
router.get('/roles/:role/permissions', requireSuperAdmin, AdminController.getRolePermissions);
router.put('/roles/:role/permissions', requireSuperAdmin, AdminController.updateRolePermissions);

// ============================================================
// 系统统计
// ============================================================
router.get('/system/stats', AdminController.getSystemStats);

// ============================================================
router.get('/growth/stats', AdminController.getGrowthStats);

router.get('/refunds', authenticate, requireAdmin, requirePermission('admin.refunds.view'), async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as any;
        const keyword = req.query.keyword as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined;
        const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined;
        const paymentMethod = req.query.channel as string; // 前端传的是 channel
        const hasNote = req.query.hasNote === 'true' ? true : req.query.hasNote === 'false' ? false : undefined;

        const result = await RefundService.listRefunds(
            { status, keyword, startDate, endDate, minAmount, maxAmount, paymentMethod, hasNote },
            { page, limit }
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Admin] 获取退款列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.get('/refunds/stats', authenticate, requireAdmin, requirePermission('admin.refunds.view'), async (req, res) => {
    try {
        const stats = await RefundService.getRefundStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        console.error('[Admin] 获取退款统计失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.get('/refunds/:id', authenticate, requireAdmin, requirePermission('admin.refunds.view'), async (req, res) => {
    try {
        const id = req.params.id as string;
        // [智能决策座舱] 使用聚合详情 API
        const result = await RefundService.getAdminRefundDetailAggregated(id);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: { code: 'REFUND_NOT_FOUND', message: '退款申请不存在' }
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('[Admin] 获取退款详情失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.post('/refunds/:id/audit', authenticate, requireAdmin, requirePermission('admin.refunds.audit'), async (req, res) => {
    try {
        const id = req.params.id as string;
        const { approved, remark } = req.body;
        const adminId = req.user!.id;

        if (typeof approved !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '缺少审核结果' }
            });
        }

        const result = await RefundService.auditRefund(id, adminId, { approved, remark });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json({
                success: false,
                error: { code: result.code, message: result.message }
            });
        }
    } catch (error: any) {
        console.error('[Admin] 审核退款失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

router.get('/refunds/metrics', authenticate, requireAdmin, requirePermission('admin.refunds.view'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where: any = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate as string);
            if (endDate) where.createdAt.lte = new Date(endDate as string);
        }

        const [
            totalCount,
            pendingCount,
            completedCount,
            rejectedCount,
            failedCount,
            manualCount,
            totalAmount,
            avgProcessingTime
        ] = await Promise.all([
            (await import('../db')).prisma.refundRequest.count({ where }),
            (await import('../db')).prisma.refundRequest.count({ where: { ...where, status: 'PENDING' } }),
            (await import('../db')).prisma.refundRequest.count({ where: { ...where, status: 'COMPLETED' } }),
            (await import('../db')).prisma.refundRequest.count({ where: { ...where, status: 'REJECTED' } }),
            (await import('../db')).prisma.refundRequest.count({ where: { ...where, status: 'FAILED' } }),
            (await import('../db')).prisma.refundRequest.count({ where: { ...where, status: 'MANUAL_REQUIRED' } }),
            (await import('../db')).prisma.refundRequest.aggregate({
                where,
                _sum: { amount: true }
            }),
            (await import('../db')).prisma.refundRequest.findMany({
                where: { ...where, status: 'COMPLETED', completedAt: { not: null }, processedAt: { not: null } },
                select: {
                    processedAt: true,
                    completedAt: true
                }
            })
        ]);

        const completedCountNum = completedCount + rejectedCount;
        const successRateNum = completedCountNum > 0
            ? Math.round((completedCount / completedCountNum) * 100)
            : 0;

        const avgTime = avgProcessingTime.length > 0
            ? avgProcessingTime.reduce((acc, curr) => {
                const processed = new Date(curr.processedAt!).getTime();
                const completed = new Date(curr.completedAt!).getTime();
                return acc + (completed - processed);
            }, 0) / avgProcessingTime.length / 1000 / 60
            : 0;

        const dailyStats = await (await import('../db')).prisma.refundRequest.groupBy({
            by: ['status'],
            where: {
                ...where,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            _count: { status: true },
            _sum: { amount: true }
        });

        res.json({
            success: true,
            data: {
                summary: {
                    totalCount,
                    pendingCount,
                    completedCount,
                    rejectedCount,
                    failedCount,
                    manualCount,
                    totalAmount: totalAmount._sum.amount || 0,
                    successRate: successRateNum,
                    avgProcessingTimeMinutes: Math.round(avgTime)
                },
                statusBreakdown: dailyStats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        console.error('[Admin] 获取退款指标失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'SYSTEM_ERROR', message: '系统错误，请稍后重试' }
        });
    }
});

export default router;
