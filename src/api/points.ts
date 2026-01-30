// src/api/points.ts
// 积分 API 模块

import { client } from './client';

// ============================================================
// 类型定义
// ============================================================

export interface PointsRule {
    id: string;
    code: string;
    name: string;
    description: string | null;
    module: string | null;
    category: string | null;
    calculationMethod?: string;
    deductionLogic?: string;
    costPoints: number;
    vipCostPoints?: number | null; // V8.5
    isActive: boolean;
    sortOrder: number;
    effectiveAt: string;
    createdAt: string;
    createdBy?: {
        nickname: string;
        avatar?: string;
    };
}

export interface PointsBalance {
    points: number;     // Alias for balance
    balance: number;    // From backend
    used: number;       // From backend
    vipLevel?: number;
    vipExpiresAt?: string | null;
}

export interface PointsTransaction {
    id: string;
    type: string;
    amount: number;
    balance: number;
    description: string;
    createdAt: string;
    module?: string;
    category?: string;
    subcategory?: string;
    triggerTime?: string;
    projectId?: string;
    templateId?: string;
    completedAt?: string;
}

// 积分规则代码映射
export type PointsActionCode =
    | 'outline_generation'
    | 'outline_page_regen'
    | 'slide_content'
    | 'slide_image'
    | 'doc_parse'
    | 'style_apply'
    | 'export_pptx'
    | 'vision_analyze'
    | 'smart_refine'
    | 'style_image'
    | 'full_content_generation'
    | 'theme_refine'
    | 'content_refine'
    | 'template_refine'
    | 'template_doc_parse';

// ============================================================
// Fallback 规则（API 不可用时使用）
// ============================================================

const FALLBACK_RULES: PointsRule[] = [
    { id: 'f1', code: 'outline_generation', name: '大纲一键生成', description: '', costPoints: 5, isActive: true, sortOrder: 1, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f1.5', code: 'outline_page_regen', name: '大纲单页重写', description: '', costPoints: 1, isActive: true, sortOrder: 1, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f2', code: 'slide_content', name: '内容生成', description: '', costPoints: 1, isActive: true, sortOrder: 2, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f3', code: 'slide_image', name: '图片生成', description: '', costPoints: 5, isActive: true, sortOrder: 3, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f4', code: 'doc_parse', name: '文档解析', description: '', costPoints: 1, isActive: true, sortOrder: 4, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f5', code: 'style_apply', name: '风格应用', description: '', costPoints: 1, isActive: true, sortOrder: 5, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f6', code: 'export_pptx', name: '导出 PPTX', description: '', costPoints: 5, isActive: true, sortOrder: 6, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f7', code: 'vision_analyze', name: '视觉分析', description: '', costPoints: 8, isActive: true, sortOrder: 7, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f8', code: 'smart_refine', name: '智能修饰', description: '', costPoints: 1, isActive: true, sortOrder: 8, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f9', code: 'style_image', name: '模版图片生成', description: '', costPoints: 50, isActive: true, sortOrder: 9, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f10', code: 'full_content_generation', name: '正文全量生成', description: '', costPoints: 10, isActive: true, sortOrder: 10, module: null, category: null, calculationMethod: null, deductionLogic: null, effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f11', code: 'theme_refine', name: '主题创意润色', description: '', costPoints: 1, isActive: true, sortOrder: 0, module: '创作室', category: '文本生成', calculationMethod: '按次扣费', deductionLogic: '润色 PPT 主题消耗 1 积分', effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f12', code: 'content_refine', name: '正文二次修饰', description: '', costPoints: 1, isActive: true, sortOrder: 6, module: '创作室', category: '文本生成', calculationMethod: '按页扣费', deductionLogic: '改写正文内容消耗 1 积分', effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f13', code: 'template_refine', name: '模版需求润色', description: '', costPoints: 1, isActive: true, sortOrder: 20, module: '模版间', category: '文本生成', calculationMethod: '按次扣费', deductionLogic: '润色模版需求消耗 1 积分', effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
    { id: 'f14', code: 'template_doc_parse', name: '模版文档解析', description: '', costPoints: 3, isActive: true, sortOrder: 19, module: '模版间', category: '文档解析', calculationMethod: '按项扣费', deductionLogic: '解析模版素材文档消耗 3 积分', effectiveAt: '2026-01-01', createdAt: '2026-01-01' },
];

// ============================================================
// API 函数
// ============================================================

// 缓存积分规则（避免重复请求）
let cachedRules: PointsRule[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

export async function getRules(bypassCache: boolean = false): Promise<PointsRule[]> {
    const now = Date.now();
    if (!bypassCache && cachedRules && now < cacheExpiry) {
        return cachedRules;
    }

    try {
        const result = await client.get('/points/rules') as any;
        if (result.success && result.data && result.data.length > 0) {
            cachedRules = result.data;
            cacheExpiry = now + CACHE_TTL;
            return result.data;
        }
    } catch (error) {
        console.warn('[PointsBadge] API 获取积分规则失败，使用 fallback 规则:', error);
    }

    // API 失败或返回空数据时，使用 fallback 规则
    cachedRules = FALLBACK_RULES;
    cacheExpiry = now + CACHE_TTL;
    return FALLBACK_RULES;
}

export async function getActionCost(actionCode: PointsActionCode, bypassCache: boolean = false): Promise<number> {
    const rule = await getPointsRule(actionCode, bypassCache);
    return rule?.costPoints ?? 0;
}

/**
 * 获取完整的积分规则对象
 */
export async function getPointsRule(actionCode: PointsActionCode, bypassCache: boolean = false): Promise<PointsRule | null> {
    const rules = await getRules(bypassCache);
    const rule = rules.find(r => r.code === actionCode && r.isActive);

    if (!rule) {
        return FALLBACK_RULES.find(r => r.code === actionCode && r.isActive) || null;
    }

    return rule;
}

/**
 * 获取积分余额（需要登录）
 */
export async function getBalance(): Promise<PointsBalance> {
    const result = await client.get('/points/balance') as any;
    if (result.success && result.data) {
        // Map backend 'balance' to 'points' for compatibility
        return {
            ...result.data,
            points: result.data.balance,
            balance: result.data.balance,
            used: result.data.used
        };
    }
    throw new Error(result.error?.message || '获取积分余额失败');
}

/**
 * 获取积分交易历史
 */
/**
 * 获取积分交易历史
 */
export async function getTransactions(
    page: number = 1,
    limit: number = 20,
    search?: string,
    type?: string,
    module?: string,
    category?: string,
    startDate?: string,
    endDate?: string,
    dateField: 'createdAt' | 'triggerTime' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ items: PointsTransaction[], total: number }> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        dateField,
        sortOrder
    });

    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (module) params.append('module', module);
    if (category) params.append('category', category);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const result = await client.get(`/points/transactions?${params.toString()}`) as any;
    if (result.success && result.data) {
        // Backend returns structure { items: [], pagination: { total: number, ... } }
        // We adapt it to { items: [], total: number } for frontend consumption
        if (result.data.pagination) {
            return {
                items: result.data.items,
                total: result.data.pagination.total
            };
        }
        // Fallback for direct structure
        return result.data;
    }
    throw new Error(result.error?.message || '获取交易历史失败');
}

/**
 * 清除规则缓存（用于管理员更新规则后）
 */
export function clearRulesCache(): void {
    cachedRules = null;
    cacheExpiry = 0;
}

/**
 * 直接扣除积分（执行动作）
 * @param actionCode 动作代码
 * @param projectId (可选) 关联的项目ID
 * @param description (可选) 描述，不传则使用默认规则名称
 * @returns 扣减结果
 */
export async function consumeAction(
    actionCode: PointsActionCode,
    projectId?: string,
    description?: string,
    options?: {
        module?: string;
        category?: string;
        subcategory?: string;
        triggerTime?: string; // ISO string
    }
): Promise<{ success: boolean, deductedAmount: number, remainingBalance: number }> {
    const body = {
        actionCode,
        projectId,
        description,
        ...options
    };
    const result = await client.post('/points/deduct', body) as any;

    if (result.success && result.data) {
        return {
            success: true,
            deductedAmount: result.data.deductedAmount,
            remainingBalance: result.data.remainingBalance
        };
    }

    // 如果返回 402 或其他业务错误，抛出异常以便调用方处理
    throw {
        code: result.error?.code || 'UNKNOWN_ERROR',
        message: result.error?.message || '扣费失败',
        details: result.error
    };
}
