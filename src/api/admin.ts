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
    role: 'USER' | 'BASIC' | 'PROFESSIONAL' | 'PREMIUM' | 'ENTERPRISE' | 'ADMIN' | 'SUPER_ADMIN';
    status: 'ACTIVE' | 'DISABLED' | 'PENDING';
    points: number;
    pointsUsed: number;
    vipLevel: number;
    vipExpiresAt?: string | null;  // V8.5 Added
    lastLoginAt: string | null;
    createdAt: string;
    projectCount: number;
    totalSpent: number;
    riskScore?: number; // Added
}

export interface UserListFilters {
    keyword?: string;
    role?: string;
    status?: string;
    vipLevel?: number;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    amountType?: 'points' | 'spent';
    minAmount?: number;
    maxAmount?: number;
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
    beforeVipLevel?: number | null;
    afterVipLevel?: number | null;
    fulfillmentAt?: string | null; // Added
    refundRequests?: any[]; // Added - using any[] for now or define RefundRequest interface
}

export interface PointsRule {
    id: string;
    code: string;
    name: string;
    costPoints: number;
    vipCostPoints?: number | null; // V8.5
    description: string | null;
    module: string | null;
    category: string | null;
    calculationMethod: string | null;
    deductionLogic: string | null;
    isActive: boolean;
    sortOrder: number; // V8.5
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
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.amountType) params.append('amountType', filters.amountType);
    if (filters.minAmount !== undefined) params.append('minAmount', String(filters.minAmount));
    if (filters.maxAmount !== undefined) params.append('maxAmount', String(filters.maxAmount));

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
 * 创建用户
 */
export async function createUser(data: any): Promise<AdminUser> {
    const result = await client.post('/admin/users', data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '创建用户失败');
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
    vipExpiresAt?: string | null;
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

/**
 * 批量用户操作
 */
export async function batchUserAction(
    action: 'disable' | 'enable' | 'delete',
    userIds: string[],
    reason: string
): Promise<{ affected: number }> {
    const result = await client.post('/admin/users/batch', { action, userIds, reason }) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '批量操作失败');
}

/**
 * 获取用户统计数据 (按状态)
 */
export async function getUserStats(): Promise<{
    total: number;
    active: number;
    disabled: number;
    pending: number;
}> {
    const result = await client.get('/admin/users/stats') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取用户统计失败');
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
    productName?: string;
    cycle?: string;
    page?: number;
    pageSize?: number;
    keyword?: string; // Search by Order ID or User info
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
} = {}): Promise<{ orders: Order[]; pagination: any }> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.productName) params.append('productName', filters.productName);
    if (filters.cycle) params.append('cycle', filters.cycle);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.pageSize) params.append('limit', String(filters.pageSize));
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.minAmount !== undefined) params.append('minAmount', String(filters.minAmount));
    if (filters.maxAmount !== undefined) params.append('maxAmount', String(filters.maxAmount));

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
 * 获取订单详情
 */
export async function getOrderById(id: string): Promise<Order> {
    const result = await client.get(`/admin/orders/${id}`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取订单详情失败');
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

/**
 * 获取订单统计数据
 */
export async function getOrderStats(): Promise<{
    total: number;
    pending: number;
    paid: number;
    refunded: number;
    cancelled: number;
    failed: number;
    today: number;
    totalRevenue: number;
    todayRevenue: number;
}> {
    const result = await client.get('/admin/orders/stats') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取订单统计失败');
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
    tags?: string | string[] | null;
    features?: string | string[] | null;
    roleToGrant?: string | null;    // 购买后授权角色
    displayType?: string;           // public | hidden | contact_sales (V8.5)
    period: 'month' | 'year' | 'once'; // V8.5
    discountEnd?: string | null;
    sortOrder: number;
    isActive: boolean;
    effectiveAt: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        nickname: string;
        avatar?: string;
    };
}

/**
 * 获取所有商品 (活跃状态)
 */
export async function getProducts(): Promise<Product[]> {
    const result = await client.get('/admin/products') as any;
    // 优先处理后端的 { success, data } 包装格式
    if (result && result.success && Array.isArray(result.data)) {
        return result.data;
    }
    // 兼容可能存在的直接返回数组的情况
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
    roleToGrant?: string;  // 新增: 授权角色
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

// ============================================================
// 销售线索 API
// ============================================================

export interface Lead {
    id: string;
    name: string;
    phone: string;
    company: string | null;
    position: string | null;
    email: string | null;
    teamSize: string | null;
    industry: string | null;
    needs: string | null;
    status: 'PENDING' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    assigneeId: string | null;
    assignee?: {
        nickname: string;
        avatar?: string;
    };
    nextFollowUpAt: string | null;
    convertedOrderId: string | null;
    notes: string | null;
    source: string | null;
    userId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadActivity {
    id: string;
    leadId: string;
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'SYSTEM';
    content: string;
    metadata?: string | null; // JSON for files, duration, etc.
    operatorId: string;
    createdAt: string;
}

export interface LeadListFilters {
    status?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
}

export interface LeadListResult {
    items: Lead[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

/**
 * 获取销售线索列表
 */
export async function getLeads(filters: LeadListFilters = {}): Promise<LeadListResult> {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.keyword) params.append('search', filters.keyword);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.pageSize) params.append('limit', String(filters.pageSize));

    const result = await client.get(`/leads?${params.toString()}`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取线索列表失败');
}

/**
 * 更新线索状态
 */
export async function updateLeadStatus(id: string, status: string, notes?: string): Promise<Lead> {
    const result = await client.put(`/leads/${id}/status`, { status, notes }) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新线索状态失败');
}

/**
 * 删除线索
 */
export async function deleteLead(id: string): Promise<void> {
    const result = await client.delete(`/leads/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除线索失败');
    }
}

/**
 * 获取线索跟进记录
 */
export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
    const result = await client.get(`/leads/${leadId}/activities`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取跟进记录失败');
}

/**
 * 创建跟进记录
 */
export async function createLeadActivity(leadId: string, data: {
    type: string;
    content: string;
    metadata?: any;
}): Promise<LeadActivity> {
    const result = await client.post(`/leads/${leadId}/activities`, data) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '创建记录失败');
}

/**
 * 分派线索负责人
 */
export async function assignLead(leadId: string, assigneeId: string | null): Promise<Lead> {
    const result = await client.put(`/leads/${leadId}/assign`, { assigneeId }) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '分派线索失败');
}

// ============================================================
// AI 引擎规则管理 API
// ============================================================

export interface AiEngineRule {
    id: string;
    name: string;
    provider: 'Gemini' | 'Volcengine' | 'OpenAI' | 'CustomCombo' | string;
    config: string; // JSON 字符串
    isActive: boolean;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AiEngineRuleConfig {
    apiKey: string;
    baseUrl?: string;
    textModel?: string;
    imageModel?: string;
    visionModel?: string;
    // CustomCombo 分离配置
    combo?: {
        text?: { baseUrl: string; apiKey: string; model: string };
        image?: { baseUrl: string; apiKey: string; model: string };
        vision?: { baseUrl: string; apiKey: string; model: string };
    };
}

// 全局基础配置 (单一存储在 AppSettings 中)
export interface GlobalAiConfig {
    docParser: {
        provider: string;  // MinerU, etc.
        apiKey: string;
        baseUrl: string;
    };
    imageResolution: string;  // "2048x2048"
    textConcurrency: number;  // 1-10
    imageConcurrency: number;  // 1-5
    outputLanguage: 'zh' | 'en' | 'ja' | 'auto';
}

// 厂商预设
export const PROVIDER_PRESETS = [
    { value: 'Gemini', label: 'Google Gemini', color: 'violet', icon: '🔮' },
    { value: 'Volcengine', label: '火山引擎 (Doubao)', color: 'orange', icon: '🌋' },
    { value: 'OpenAI', label: 'OpenAI', color: 'emerald', icon: '🤖' },
    { value: 'Zhipu', label: '智谱清言 (GLM)', color: 'blue', icon: '🧠' },
    { value: 'SiliconFlow', label: '硅基流动', color: 'cyan', icon: '💎' },
    { value: 'ModelScope', label: '魔搭社区', color: 'purple', icon: '🔬' },
    { value: 'Custom', label: '自定义', color: 'slate', icon: '⚙️' },
    { value: 'CustomCombo', label: '自定义组合', color: 'amber', icon: '🧩' },
] as const;

// 分辨率预设
export const RESOLUTION_PRESETS = [
    '1024x1024',
    '2048x2048',
    '4096x4096',
] as const;

export const RESOLUTION_OPTIONS = [
    { value: '1024x1024', label: '1024x1024 (1K)' },
    { value: '2048x2048', label: '2048x2048 (2K)' },
    { value: '4096x4096', label: '4096x4096 (4K)' },
];

// 语言预设
export const LANGUAGE_PRESETS = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'auto', label: '自动检测' },
] as const;

/**
 * 获取所有 AI 引擎规则
 */
export async function getAiEngineRules(): Promise<AiEngineRule[]> {
    const result = await client.get('/admin/ai-engine-rules') as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取 AI 引擎规则失败');
}

/**
 * 创建 AI 引擎规则
 */
export async function createAiEngineRule(data: {
    name: string;
    provider: string;
    config: AiEngineRuleConfig;
    description?: string;
}): Promise<AiEngineRule> {
    const result = await client.post('/admin/ai-engine-rules', {
        ...data,
        config: JSON.stringify(data.config)
    }) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '创建 AI 引擎规则失败');
}

/**
 * 更新 AI 引擎规则
 */
export async function updateAiEngineRule(id: string, data: {
    name?: string;
    provider?: string;
    config?: AiEngineRuleConfig;
    description?: string;
}): Promise<AiEngineRule> {
    const payload: any = { ...data };
    if (data.config) {
        payload.config = JSON.stringify(data.config);
    }
    const result = await client.put(`/admin/ai-engine-rules/${id}`, payload) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '更新 AI 引擎规则失败');
}

/**
 * 激活 AI 引擎规则
 */
export async function activateAiEngineRule(id: string): Promise<AiEngineRule> {
    const result = await client.post(`/admin/ai-engine-rules/${id}/activate`) as any;
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error?.message || '激活 AI 引擎规则失败');
}

/**
 * 删除 AI 引擎规则
 */
export async function deleteAiEngineRule(id: string): Promise<void> {
    const result = await client.delete(`/admin/ai-engine-rules/${id}`) as any;
    if (!result.success) {
        throw new Error(result.error?.message || '删除 AI 引擎规则失败');
    }
}
