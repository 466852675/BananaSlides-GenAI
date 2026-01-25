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
    description: string;
    costPoints: number;
    isActive: boolean;
    sortOrder: number;
}

export interface PointsBalance {
    points: number;
    vipLevel: number;
    vipExpiresAt: string | null;
}

export interface PointsTransaction {
    id: string;
    type: string;
    amount: number;
    balance: number;
    description: string;
    createdAt: string;
}

// 积分规则代码映射
export type PointsActionCode =
    | 'outline_generation'
    | 'slide_content'
    | 'slide_image'
    | 'doc_parse'
    | 'style_apply'
    | 'export_pptx'
    | 'vision_analyze';

// ============================================================
// Fallback 规则（API 不可用时使用）
// ============================================================

const FALLBACK_RULES: PointsRule[] = [
    { id: 'f1', code: 'outline_generation', name: '大纲生成', description: '', costPoints: 5, isActive: true, sortOrder: 1 },
    { id: 'f2', code: 'slide_content', name: '内容生成', description: '', costPoints: 3, isActive: true, sortOrder: 2 },
    { id: 'f3', code: 'slide_image', name: '图片生成', description: '', costPoints: 10, isActive: true, sortOrder: 3 },
    { id: 'f4', code: 'doc_parse', name: '文档解析', description: '', costPoints: 5, isActive: true, sortOrder: 4 },
    { id: 'f5', code: 'style_apply', name: '风格应用', description: '', costPoints: 1, isActive: true, sortOrder: 5 },
    { id: 'f6', code: 'export_pptx', name: '导出 PPTX', description: '', costPoints: 2, isActive: true, sortOrder: 6 },
    { id: 'f7', code: 'vision_analyze', name: '视觉分析', description: '', costPoints: 8, isActive: true, sortOrder: 7 },
];

// ============================================================
// API 函数
// ============================================================

// 缓存积分规则（避免重复请求）
let cachedRules: PointsRule[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

/**
 * 获取积分规则列表（公开接口）
 * 如果 API 失败，使用 fallback 规则
 */
export async function getRules(): Promise<PointsRule[]> {
    const now = Date.now();
    if (cachedRules && now < cacheExpiry) {
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

/**
 * 获取指定操作的积分消耗
 * 直接使用 FALLBACK_RULES，不再依赖 API
 */
export async function getActionCost(actionCode: PointsActionCode): Promise<number> {
    // 尝试从 API/缓存获取最新规则
    const rules = await getRules();
    const rule = rules.find(r => r.code === actionCode && r.isActive);

    // 如果没找到（极端情况），尝试从 Fallback 找
    if (!rule) {
        const fallback = FALLBACK_RULES.find(r => r.code === actionCode && r.isActive);

        return fallback?.costPoints ?? 0;
    }

    return rule.costPoints;
}

/**
 * 获取积分余额（需要登录）
 */
export async function getBalance(): Promise<PointsBalance> {
    const result = await client.get('/points/balance') as any;
    if (result.success && result.data) {
        return result.data;
    }
    throw new Error(result.error?.message || '获取积分余额失败');
}

/**
 * 获取积分交易历史
 */
export async function getTransactions(page: number = 1, limit: number = 20): Promise<{ items: PointsTransaction[], total: number }> {
    const result = await client.get(`/points/transactions?page=${page}&limit=${limit}`) as any;
    if (result.success && result.data) {
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
