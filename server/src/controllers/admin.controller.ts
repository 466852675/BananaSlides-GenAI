// server/src/controllers/admin.controller.ts
// 管理员控制器：处理管理后台的 HTTP 请求

import { Request, Response } from 'express';
import * as AdminService from '../services/admin.service';
import * as OrderService from '../services/order.service';
import * as PointsService from '../services/points.service';
import { productService } from '../services/product.service';
import { UserRole, UserStatus, OrderStatus } from '@prisma/client';

// ============================================================
// 用户管理
// ============================================================

/**
 * 创建新用户
 * POST /api/admin/users
 */
export async function createUser(req: Request, res: Response): Promise<void> {
    try {
        const { email, password, nickname, role, vipLevel, points } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '邮箱和密码为必填项' }
            });
            return;
        }

        const user = await AdminService.createUser(
            { email, password, nickname, role, vipLevel, points },
            req.user!.id
        );

        res.json({ success: true, data: user });
    } catch (error: any) {
        console.error('[Admin] 创建用户失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'CREATE_FAILED', message: error.message || '创建用户失败' }
        });
    }
}

/**
 * 获取用户列表
 * GET /api/admin/users
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
    try {
        const {
            page = '1',
            limit = '20',
            search,
            role,
            status,
            vip,
            sortBy,
            sortOrder,
        } = req.query;

        // 校验 status 是否为合法的 UserStatus 枚举值，避免 Prisma 查询报错
        const validUserStatuses = Object.values(UserStatus);
        const safeStatus = (status && validUserStatuses.includes(status as UserStatus))
            ? status as UserStatus
            : undefined;

        const result = await AdminService.listUsers(
            {
                search: search as string,
                role: role as UserRole,
                status: safeStatus,
                vipLevel: vip ? parseInt(vip as string, 10) : undefined,
                sortBy: sortBy as 'createdAt' | 'points' | 'lastLoginAt',
                sortOrder: sortOrder as 'asc' | 'desc',
            },
            {
                page: parseInt(page as string, 10) || 1,
                limit: Math.min(parseInt(limit as string, 10) || 20, 100),
            }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Admin] 获取用户列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取用户列表失败' }
        });
    }
}

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
export async function getUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const user = await AdminService.getUserById(id);

        if (!user) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '用户不存在' }
            });
            return;
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('[Admin] 获取用户详情失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取用户详情失败' }
        });
    }
}

/**
 * 获取用户统计数据
 * GET /api/admin/users/stats
 */
export async function getUserStats(req: Request, res: Response): Promise<void> {
    try {
        const stats = await AdminService.getUserStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Admin] 获取用户统计失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取用户统计失败' }
        });
    }
}

/**
 * 更新用户信息
 * PUT /api/admin/users/:id
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { nickname, role, status, points, vipLevel } = req.body;

        // 检查是否尝试修改自己
        if (req.user?.id === id && status === UserStatus.DISABLED) {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_OPERATION', message: '无法禁用当前登录账户' }
            });
            return;
        }

        const updated = await AdminService.updateUser(
            id,
            { nickname, role, status, points, vipLevel },
            req.user!.id
        );

        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('[Admin] 更新用户失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message || '更新用户失败' }
        });
    }
}

/**
 * 重置用户密码
 * POST /api/admin/users/:id/reset-password
 */
export async function resetUserPassword(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { newPassword } = req.body;

        if (!newPassword) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '新密码不能为空' }
            });
            return;
        }

        await AdminService.resetUserPassword(id, newPassword);

        res.json({ success: true, message: '密码已重置' });
    } catch (error) {
        console.error('[Admin] 重置密码失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '重置密码失败' }
        });
    }
}

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;

        // 禁止删除自己
        if (req.user?.id === id) {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_OPERATION', message: '无法删除当前登录账户' }
            });
            return;
        }

        await AdminService.deleteUserById(id);

        res.json({ success: true, message: '用户已永久删除' });
    } catch (error: any) {
        console.error('[Admin] 删除用户失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'DELETE_FAILED', message: error.message || '删除用户失败' }
        });
    }
}

/**
 * 批量用户操作
 * POST /api/admin/users/batch
 */
export async function batchUserAction(req: Request, res: Response): Promise<void> {
    try {
        const { action, userIds, reason } = req.body;

        if (!action || !userIds || !Array.isArray(userIds)) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '操作类型和用户ID列表不能为空' }
            });
            return;
        }

        if (!reason) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '操作理由不能为空' }
            });
            return;
        }

        // 过滤掉当前用户自己
        const filteredIds = userIds.filter((id: string) => id !== req.user?.id);

        const result = await AdminService.batchUserAction(action, filteredIds, req.user!.id, reason);

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Admin] 批量操作失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '批量操作失败' }
        });
    }
}

// ============================================================
// 订单管理
// ============================================================

/**
 * 获取订单列表
 * GET /api/admin/orders
 */
export async function listOrders(req: Request, res: Response): Promise<void> {
    try {
        const { page = '1', limit = '20', userId, status, type, productName, cycle, search, sortBy, sortOrder } = req.query;

        // 校验 status 是否为合法的 OrderStatus 枚举值，避免 Prisma 查询报错
        const validOrderStatuses = Object.values(OrderStatus);
        const safeOrderStatus = (status && validOrderStatuses.includes(status as OrderStatus))
            ? status as OrderStatus
            : undefined;

        const result = await OrderService.listOrders(
            {
                userId: userId as string,
                status: safeOrderStatus,
                type: type as string,
                productName: productName as string,
                cycle: cycle as string,
                keyword: search as string,
                sortBy: sortBy as 'createdAt' | 'finalPrice',
                sortOrder: sortOrder as 'asc' | 'desc',
            },
            {
                page: parseInt(page as string, 10) || 1,
                limit: Math.min(parseInt(limit as string, 10) || 20, 100),
            }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Admin] 获取订单列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取订单列表失败' }
        });
    }
}

/**
 * 获取订单详情
 * GET /api/admin/orders/:id
 */
export async function getOrder(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const order = await OrderService.getOrderById(id);

        if (!order) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '订单不存在' }
            });
            return;
        }

        res.json({ success: true, data: order });
    } catch (error) {
        console.error('[Admin] 获取订单详情失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取订单详情失败' }
        });
    }
}

/**
 * 更新订单状态
 * PUT /api/admin/orders/:id
 */
export async function updateOrder(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { status } = req.body;

        const updated = await OrderService.updateOrderStatus(id, status);

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('[Admin] 更新订单失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新订单失败' }
        });
    }
}

/**
 * 订单退款
 * POST /api/admin/orders/:id/refund
 */
export async function refundOrder(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { reason } = req.body;

        await OrderService.refundOrder(id, reason);

        res.json({ success: true, message: '退款成功' });
    } catch (error: any) {
        console.error('[Admin] 订单退款失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'REFUND_FAILED', message: error.message || '退款失败' }
        });
    }
}

/**
 * 获取订单统计数据
 * GET /api/admin/orders/stats
 */
export async function getOrderStats(req: Request, res: Response): Promise<void> {
    try {
        const stats = await OrderService.getOrderStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Admin] 获取订单统计失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取订单统计失败' }
        });
    }
}

// ============================================================
// 积分规则管理
// ============================================================

/**
 * 获取积分规则列表
 * GET /api/admin/points-rules
 */
export async function listPointsRules(req: Request, res: Response): Promise<void> {
    try {
        const rules = await PointsService.listPointsRules();
        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('[Admin] 获取积分规则失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取积分规则失败' }
        });
    }
}

/**
 * 创建积分规则
 * POST /api/admin/points-rules
 */
export async function createPointsRule(req: Request, res: Response): Promise<void> {
    try {
        const { code, name, costPoints, description, module, category, calculationMethod, deductionLogic, effectiveAt } = req.body;

        if (!code || !name || costPoints === undefined) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '规则代码、名称和积分数不能为空' }
            });
            return;
        }

        const rule = await PointsService.createPointsRule({
            code,
            name,
            costPoints,
            description,
            module,
            category,
            calculationMethod,
            deductionLogic,
            effectiveAt: effectiveAt ? new Date(effectiveAt) : undefined,
            createdById: req.user!.id
        });
        res.status(201).json({ success: true, data: rule });
    } catch (error) {
        console.error('[Admin] 创建积分规则失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '创建积分规则失败' }
        });
    }
}

/**
 * 更新积分规则
 * PUT /api/admin/points-rules/:id
 */
export async function updatePointsRule(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const { name, costPoints, description, isActive, module, category, calculationMethod, deductionLogic, effectiveAt } = req.body;

        const rule = await PointsService.updatePointsRule(id, {
            name,
            costPoints,
            description,
            isActive,
            module,
            category,
            calculationMethod,
            deductionLogic,
            effectiveAt: effectiveAt ? new Date(effectiveAt) : undefined
        });
        res.json({ success: true, data: rule });
    } catch (error) {
        console.error('[Admin] 更新积分规则失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新积分规则失败' }
        });
    }
}

/**
 * 删除积分规则
 * DELETE /api/admin/points-rules/:id
 */
export async function deletePointsRule(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        await PointsService.deletePointsRule(id);
        res.json({ success: true, message: '规则已删除' });
    } catch (error) {
        console.error('[Admin] 删除积分规则失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '删除积分规则失败' }
        });
    }
}

// ============================================================
// 角色权限管理
// ============================================================

/**
 * 获取角色列表
 * GET /api/admin/roles
 */
export async function listRoles(req: Request, res: Response): Promise<void> {
    try {
        const roles = await AdminService.listRoles();
        res.json({ success: true, data: roles });
    } catch (error) {
        console.error('[Admin] 获取角色列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取角色列表失败' }
        });
    }
}

/**
 * 获取权限列表
 * GET /api/admin/permissions
 */
export async function listPermissions(req: Request, res: Response): Promise<void> {
    try {
        const permissions = await AdminService.listPermissions();
        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('[Admin] 获取权限列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取权限列表失败' }
        });
    }
}

/**
 * 获取角色权限
 * GET /api/admin/roles/:role/permissions
 */
export async function getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
        const role = req.params.role as UserRole;
        const permissions = await AdminService.getRolePermissions(role);
        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('[Admin] 获取角色权限失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取角色权限失败' }
        });
    }
}

/**
 * 获取当前用户权限
 * GET /api/admin/roles/my-permissions
 */
export async function getMyPermissions(req: Request, res: Response): Promise<void> {
    try {
        const userRole = req.user!.role;
        const permissions = await AdminService.getRolePermissions(userRole);
        res.json({ success: true, data: permissions });
    } catch (error) {
        console.error('[Admin] 获取我的权限失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取权限失败' }
        });
    }
}

/**
 * 更新角色权限
 * PUT /api/admin/roles/:role/permissions
 */
export async function updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
        const role = req.params.role as UserRole;
        const { permissionIds } = req.body;

        await AdminService.updateRolePermissions(role, permissionIds);
        res.json({ success: true, message: '权限更新成功' });
    } catch (error) {
        console.error('[Admin] 更新角色权限失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新角色权限失败' }
        });
    }
}


// ============================================================
// 系统统计
// ============================================================

/**
 * 获取系统统计
 * GET /api/admin/system/stats
 */
export async function getSystemStats(req: Request, res: Response): Promise<void> {
    try {
        const stats = await AdminService.getSystemStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Admin] 获取系统统计失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取系统统计失败' }
        });
    }
}

// ============================================================
// 系统运行配置（内存存储）
// ============================================================

// 内存存储系统配置（生产环境应改为数据库存储）
let systemConfig = {
    SYSTEM_STATUS: 'NORMAL' as 'NORMAL' | 'MAINTENANCE',
    REG_MODE: 'OPEN' as 'OPEN' | 'INVITE_ONLY' | 'CLOSED'
};

/**
 * 获取系统运行配置
 * GET /api/admin/config
 */
export async function getSystemConfig(req: Request, res: Response): Promise<void> {
    try {
        res.json({ success: true, data: systemConfig });
    } catch (error) {
        console.error('[Admin] 获取系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取系统配置失败' }
        });
    }
}

/**
 * 更新系统运行配置
 * PUT /api/admin/config
 */
export async function updateSystemConfig(req: Request, res: Response): Promise<void> {
    try {
        const { SYSTEM_STATUS, REG_MODE } = req.body;

        if (SYSTEM_STATUS) {
            systemConfig.SYSTEM_STATUS = SYSTEM_STATUS;
        }
        if (REG_MODE) {
            systemConfig.REG_MODE = REG_MODE;
        }

        console.log('[Admin] 系统配置已更新:', systemConfig);
        res.json({ success: true, data: systemConfig });
    } catch (error) {
        console.error('[Admin] 更新系统配置失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新系统配置失败' }
        });
    }
}

// ============================================================
// 增长运营统计
// ============================================================

import { growthService } from '../services/growth.service';

/**
 * 获取增长运营统计
 * GET /api/admin/growth/stats
 */
export async function getGrowthStats(req: Request, res: Response): Promise<void> {
    try {
        const stats = await growthService.getGrowthStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[Admin] 获取增长统计失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取增长统计失败' }
        });
    }
}

// ============================================================
// 商品管理
// ============================================================

/**
 * 获取商品列表 (管理端返回全量)
 * GET /api/admin/products
 */
export async function listProducts(req: Request, res: Response): Promise<void> {
    try {
        const products = await productService.listAllProducts();
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('[Admin] 获取商品列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取商品列表失败' }
        });
    }
}

/**
 * 创建商品
 * POST /api/admin/products
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
    try {
        const { type, name, price, originalPrice, points, tags, features, roleToGrant, discountEnd, sortOrder, effectiveAt, period } = req.body;

        if (!type || !name || price === undefined || points === undefined) {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: '缺少必要参数: type, name, price, points' }
            });
            return;
        }

        const product = await productService.createProduct({
            type,
            name,
            price: Number(price),
            originalPrice: originalPrice ? Number(originalPrice) : undefined,
            points: Number(points),
            tags,
            features,
            roleToGrant,
            discountEnd: discountEnd ? new Date(discountEnd) : undefined,
            sortOrder: sortOrder ? Number(sortOrder) : undefined,
            createdById: req.user?.id,
            effectiveAt: effectiveAt ? new Date(effectiveAt) : undefined,
            period
        });

        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[Admin] 创建商品失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '创建商品失败' }
        });
    }
}

/**
 * 更新商品
 * PUT /api/admin/products/:id
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const updateData = req.body;

        // 转换数值类型
        if (updateData.price !== undefined) updateData.price = Number(updateData.price);
        if (updateData.originalPrice !== undefined) updateData.originalPrice = Number(updateData.originalPrice);
        if (updateData.points !== undefined) updateData.points = Number(updateData.points);
        if (updateData.sortOrder !== undefined) updateData.sortOrder = Number(updateData.sortOrder);
        if (updateData.discountEnd) updateData.discountEnd = new Date(updateData.discountEnd);
        if (updateData.effectiveAt) updateData.effectiveAt = new Date(updateData.effectiveAt);

        const product = await productService.updateProduct(id, updateData);
        res.json({ success: true, data: product });
    } catch (error) {
        console.error('[Admin] 更新商品失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '更新商品失败' }
        });
    }
}

/**
 * 删除商品
 * DELETE /api/admin/products/:id
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        await productService.deleteProduct(id);
        res.json({ success: true, message: '商品已删除' });
    } catch (error) {
        console.error('[Admin] 删除商品失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '删除商品失败' }
        });
    }
}

// ============================================================
// AI 引擎规则管理
// ============================================================

/**
 * 获取所有 AI 引擎规则
 * GET /api/admin/ai-engine-rules
 */
export async function listEngineRules(req: Request, res: Response): Promise<void> {
    try {
        const rules = await AdminService.listEngineRules();
        res.json({ success: true, data: rules });
    } catch (error: any) {
        console.error('[Admin] 获取引擎规则列表失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取引擎规则失败' }
        });
    }
}

/**
 * 创建 AI 引擎规则
 * POST /api/admin/ai-engine-rules
 */
export async function createEngineRule(req: Request, res: Response): Promise<void> {
    try {
        const { name, provider, config, description } = req.body;

        if (!name || !provider || !config) {
            res.status(400).json({
                success: false,
                error: { code: 'MISSING_FIELDS', message: '名称、厂商和配置为必填项' }
            });
            return;
        }

        const rule = await AdminService.createEngineRule({
            name,
            provider,
            config: typeof config === 'string' ? config : JSON.stringify(config),
            description
        });

        res.json({ success: true, data: rule });
    } catch (error: any) {
        console.error('[Admin] 创建引擎规则失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'CREATE_FAILED', message: error.message || '创建规则失败' }
        });
    }
}

/**
 * 更新 AI 引擎规则
 * PUT /api/admin/ai-engine-rules/:id
 */
export async function updateEngineRule(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const updateData = req.body;

        // 如果传入了 config 对象，序列化为字符串
        if (updateData.config && typeof updateData.config !== 'string') {
            updateData.config = JSON.stringify(updateData.config);
        }

        const rule = await AdminService.updateEngineRule(id, updateData);
        res.json({ success: true, data: rule });
    } catch (error: any) {
        console.error('[Admin] 更新引擎规则失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'UPDATE_FAILED', message: error.message || '更新规则失败' }
        });
    }
}

/**
 * 激活 AI 引擎规则
 * POST /api/admin/ai-engine-rules/:id/activate
 */
export async function activateEngineRule(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const rule = await AdminService.activateEngineRule(id);
        res.json({ success: true, data: rule, message: '规则已激活' });
    } catch (error: any) {
        console.error('[Admin] 激活引擎规则失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'ACTIVATE_FAILED', message: error.message || '激活规则失败' }
        });
    }
}

/**
 * 删除 AI 引擎规则
 * DELETE /api/admin/ai-engine-rules/:id
 */
export async function deleteEngineRule(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        await AdminService.deleteEngineRule(id);
        res.json({ success: true, message: '规则已删除' });
    } catch (error: any) {
        console.error('[Admin] 删除引擎规则失败:', error);
        res.status(400).json({
            success: false,
            error: { code: 'DELETE_FAILED', message: error.message || '删除规则失败' }
        });
    }
}
