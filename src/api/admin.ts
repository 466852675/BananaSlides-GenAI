// src/api/admin.ts
// 管理后台 API 模块

import { client } from './client';

// ============================================================
// 类型定义
// ============================================================

export interface AdminUser {
    id: string;
    email: string | null;
    username: string | null;
    nickname: string | null;
    phone: string | null;
    avatar: string | null;
    role: 'USER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'ADMIN' | 'SUPER_ADMIN';
    status: 'ACTIVE' | 'DISABLED' | 'PENDING';
    points: number;
    pointsUsed: number;
    vipLevel: number;
    lastLoginAt: string | null;
    createdAt: string;
    projectCount: number;
}

export interface UserListFilters {
    keyword?: string;
    role?: string;
    status?: string;
    vipLevel?: number;
    page?: number;
    pageSize?: number;
}

export interface UserListResult {
    users: AdminUser[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface Order {
    id: string;
    orderNo: string;
    userId: string;
    user?: AdminUser;
    productType: string;  // POINTS, VIP, FEATURE 等
    productName: string;
    productDesc?: string | null;
    quantity: number;
    originalPrice: number;
    discountPrice?: number | null;
    finalPrice: number;
    status: string;  // PENDING, PAID, CANCELLED, REFUNDED
    paymentMethod?: string | null;
    paymentNo?: string | null;
    paidAt?: string | null;
    refundReason?: string | null;
    refundedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PointsRule {
    id: string;
    code: string;
    name: string;
    costPoints: number;
    description: string | null;
    module: string | null;
    category: string | null;
    calculationMethod: string | null;
    deductionLogic: string | null;
    isActive: boolean;
    effectiveAt: string;
    createdAt: string;
    createdBy?: {
        nickname: string;
        avatar?: string;
    };
}

export interface SystemStats {
    users: {
        total: number;
        today: number;
        active: number;
        disabled: number;
    };
    orders: {
        total: number;
        today: number;
        totalRevenue: number;
        todayRevenue: number;
    };
    projects: {
        total: number;
        today: number;
    };
}

// ============================================================
// 用户管理 API
// ============================================================

/**
 * 获取用户列表
 */
export async function getUsers(filters: UserListFilters = {}): Promise<UserListResult> {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('search', filters.keyword);  // 后端用 search
    if (filters.role) params.append('role', filters.role);
    if (filters.status) params.append('status', filters.status);
    if (filters.vipLevel !== undefined && (filters.vipLevel as any) !== '') params.append('vip', String(filters.vipLevel));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.pageSize) params.append('limit', String(filters.pageSize));  // 后端用 limit

    const result = await client.get(`/admin/users?${params.toString()}`) as any;
    if (result.success) {
        // 后端返回 items，前端期望 users
        return {
            users: result.data.items,
            pagination: {
                page: result.data.pagination.page,
                pageSize: result.data.pagination.limit,
                total: result.data.pagination.total,
                totalPages: result.data.pagination.totalPages,
            }
        };
    }
    throw new Error(result.error?.message || '获取用户列表失败');
}

/**
 * 获取单个用户
 */
export async function getUser(id: string): Promise<AdminUser> {
    const result = await client.get(`/admin/users/${id}`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取用户信息失败');
}

/**
 * 更新用户
 */
export async function updateUser(id: string, data: {
    nickname?: string;
    role?: string;
    status?: string;
    points?: number;
    vipLevel?: number;
}): Promise<AdminUser> {
    const result = await client.put(`/admin/users/${id}`, data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新用户失败');
}

/**
 * 重置用户密码
 */
export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
    const result = await client.post(`/admin/users/${id}/reset-password`, { newPassword }) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '重置密码失败');
    }
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<void> {
    const result = await client.delete(`/admin/users/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除用户失败');
    }
}

// ============================================================
// 订单管理 API
// ============================================================

/**
 * 获取订单列表
 */
export async function getOrders(filters: {
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
    keyword?: string; // Search by Order ID or User info
} = {}): Promise<{ orders: Order[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
    if (filters.keyword) params.append('search', filters.keyword);

    const result = await client.get(`/admin/orders?${params.toString()}`) as any;
    if (result.success) {
        return {
            orders: result.data.items,
            pagination: result.data.pagination
        };
    }
    throw new Error(result.error?.message || '获取订单列表失败');
}

/**
 * 退款订单
 */
export async function refundOrder(id: string, reason?: string): Promise<void> {
    const result = await client.post(`/admin/orders/${id}/refund`, { reason }) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '退款失败');
    }
}

// ============================================================
// 积分规则 API
// ============================================================

/**
 * 获取积分规则列表
 */
export async function getPointsRules(): Promise<PointsRule[]> {
    const result = await client.get('/admin/points-rules') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取积分规则失败');
}

/**
 * 创建积分规则
 */
export async function createPointsRule(data: {
    code: string;
    name: string;
    costPoints: number;
    description?: string;
    module?: string;
    category?: string;
    calculationMethod?: string;
    deductionLogic?: string;
    effectiveAt?: string;
}): Promise<PointsRule> {
    const result = await client.post('/admin/points-rules', data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '创建积分规则失败');
}

/**
 * 更新积分规则
 */
export async function updatePointsRule(id: string, data: {
    name?: string;
    costPoints?: number;
    description?: string;
    isActive?: boolean;
    module?: string;
    category?: string;
    calculationMethod?: string;
    deductionLogic?: string;
    effectiveAt?: string;
}): Promise<PointsRule> {
    const result = await client.put(`/admin/points-rules/${id}`, data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新积分规则失败');
}

/**
 * 删除积分规则
 */
export async function deletePointsRule(id: string): Promise<void> {
    const result = await client.delete(`/admin/points-rules/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除积分规则失败');
    }
}

// ============================================================
// 角色权限管理 API
// ============================================================

export interface Role {
    id: string; // Enum Key
    name: string;
    description: string;
}

export interface Permission {
    id: string;
    code: string;
    name: string;
    description: string | null;
    module: string;
}

export interface RolePermission {
    id: string;
    role: string;
    permissionId: string;
    permission: Permission;
}

/**
 * 获取角色列表
 */
export async function getRoles(): Promise<Role[]> {
    const result = await client.get('/admin/roles') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取角色列表失败');
}

/**
 * 获取权限列表
 */
export async function getPermissions(): Promise<Permission[]> {
    const result = await client.get('/admin/permissions') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取权限列表失败');
}

/**
 * 获取角色权限
 */
export async function getRolePermissions(role: string): Promise<RolePermission[]> {
    const result = await client.get(`/admin/roles/${role}/permissions`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取角色权限失败');
}

/**
 * 更新角色权限
 */
export async function updateRolePermissions(role: string, permissionIds: string[]): Promise<void> {
    const result = await client.put(`/admin/roles/${role}/permissions`, { permissionIds }) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '更新角色权限失败');
    }
}

// ============================================================
// 系统统计 API
// ============================================================

export interface SystemStats {
    totalUsers: number;
    todayUsers: number;
    activeUsers: number;
    disabledUsers: number;
    totalOrders: number;
    todayOrders: number;
    totalProjects: number;
    todayProjects: number;
}

/**
 * 获取系统统计数据
 */
export async function getSystemStats(): Promise<SystemStats> {
    const result = await client.get('/admin/system/stats') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取系统统计失败');
}

// ============================================================
// 增长运营 API
// ============================================================

export interface GrowthStats {
    checkIn: {
        total: number;
        today: number;
        weekly: number;
        totalRewards: number;
        activeStreakUsers: number;
    };
    referral: {
        total: number;
        today: number;
    };
    trend: Array<{
        date: string;
        count: number;
    }>;
}

/**
 * 获取增长运营统计
 */
export async function getGrowthStats(): Promise<GrowthStats> {
    const result = await client.get('/admin/growth/stats') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取增长统计失败');
}

// ============================================================
// 全局配置 API
// ============================================================

export interface GlobalSettings {
    [key: string]: string | number | boolean | object;
}

export interface SystemConfig {
    SYSTEM_STATUS: 'NORMAL' | 'MAINTENANCE';
    REG_MODE: 'OPEN' | 'INVITE_ONLY' | 'CLOSED';
}

/**
 * 获取系统运行配置 (Status/RegMode)
 */
export async function getSystemConfig(): Promise<SystemConfig> {
    const result = await client.get('/admin/config') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取系统配置失败');
}

/**
 * 更新系统运行配置
 */
export async function updateSystemConfig(config: SystemConfig): Promise<void> {
    const result = await client.put('/admin/config', config) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '更新系统配置失败');
    }
}

/**
 * 获取全局配置
 */
export async function getSettings(): Promise<GlobalSettings> {
    const result = await client.get('/settings') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取配置失败');
}

/**
 * 更新全局配置
 */
export async function updateSettings(settings: GlobalSettings): Promise<void> {
    const result = await client.post('/settings', settings) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '更新配置失败');
    }
}

// ============================================================
// 商品管理 API
// ============================================================

export interface Product {
    id: string;
    type: string;
    name: string;
    price: number;
    originalPrice?: number | null;
    points: number;
    tags?: string[] | null;
    features?: string[] | null;
    discountEnd?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

/**
 * 获取所有商品 (活跃状态)
 */
export async function getProducts(): Promise<Product[]> {
    const result = await client.get('/products') as any;
    // 后端直接返回数组，不包装在 { success, data } 中
    if (Array.isArray(result)) {
        return result;
    }
    throw new Error('获取商品列表失败');
}

/**
 * 创建商品
 */
export async function createProduct(data: {
    type: string;
    name: string;
    price: number;
    originalPrice?: number;
    points: number;
    tags?: string[];
    features?: string[];
    discountEnd?: Date;
    sortOrder?: number;
}): Promise<Product> {
    const result = await client.post('/admin/products', data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '创建商品失败');
}

/**
 * 更新商品
 */
export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const result = await client.put(`/admin/products/${id}`, data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新商品失败');
}

/**
 * 删除商品
 */
export async function deleteProduct(id: string): Promise<void> {
    const result = await client.delete(`/admin/products/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除商品失败');
    }
}
