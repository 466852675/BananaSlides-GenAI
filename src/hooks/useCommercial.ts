import { useState, useEffect, useCallback, useRef } from 'react';
import { getCommercialConfig, CommercialConfig, updateCommercialConfig } from '../api/admin';

// 模块标识列表（与管理后台对应）
export const COMMERCIAL_MODULES = {
    points: { label: '积分体系', category: 'user' as const },
    checkin: { label: '签到功能', category: 'user' as const },
    invite: { label: '邀请功能', category: 'user' as const },
    purchase: { label: '购买套餐/商品', category: 'user' as const },
    orders: { label: '订单管理', category: 'admin' as const },
    refunds: { label: '退款管理', category: 'admin' as const },
    leads: { label: '销售线索', category: 'admin' as const },
    'points-rules': { label: '积分规则', category: 'admin' as const },
    growth: { label: '产品管理', category: 'admin' as const },
    pricing: { label: '落地页价格方案', category: 'landing' as const },
} as const;

export type CommercialModuleId = keyof typeof COMMERCIAL_MODULES;

export const USER_MODULES = (Object.entries(COMMERCIAL_MODULES) as [CommercialModuleId, typeof COMMERCIAL_MODULES[CommercialModuleId]][])
    .filter(([, v]) => v.category === 'user')
    .map(([k]) => k);

export const ADMIN_MODULES = (Object.entries(COMMERCIAL_MODULES) as [CommercialModuleId, typeof COMMERCIAL_MODULES[CommercialModuleId]][])
    .filter(([, v]) => v.category === 'admin')
    .map(([k]) => k);

export const LANDING_MODULES = (Object.entries(COMMERCIAL_MODULES) as [CommercialModuleId, typeof COMMERCIAL_MODULES[CommercialModuleId]][])
    .filter(([, v]) => v.category === 'landing')
    .map(([k]) => k);

interface UseCommercialReturn {
    enabled: boolean;
    disabledModules: CommercialModuleId[];
    auditLog: CommercialConfig['auditLog'];
    isModuleDisabled: (moduleId: CommercialModuleId) => boolean;
    loading: boolean;
    refresh: () => Promise<void>;
    update: (enabled: boolean, disabledModules: CommercialModuleId[]) => Promise<void>;
}

/**
 * 商业化功能状态 Hook
 * 缓存 60 秒，避免频繁请求
 */
export function useCommercial(): UseCommercialReturn {
    const [config, setConfig] = useState<CommercialConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const cacheRef = useRef<{ data: CommercialConfig; timestamp: number } | null>(null);
    const CACHE_TTL = 60 * 1000;

    const fetchConfig = useCallback(async () => {
        // 检查缓存
        if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL) {
            setConfig(cacheRef.current.data);
            setLoading(false);
            return;
        }

        try {
            const data = await getCommercialConfig();
            cacheRef.current = { data, timestamp: Date.now() };
            setConfig(data);
        } catch {
            // 失败时使用缓存或默认值
            if (!cacheRef.current) {
                setConfig({ enabled: false, disabledModules: [], auditLog: [] });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const isModuleDisabled = useCallback(
        (moduleId: CommercialModuleId): boolean => {
            if (!config) return false;
            // 商业化关闭 = 全部禁用（disabledModules 为空数组时为全量关闭）
            // 商业化开启 = 仅 disabledModules 中的模块禁用（用于选择性关闭个别模块）
            if (!config.enabled) return true;
            return config.disabledModules.includes(moduleId);
        },
        [config]
    );

    const update = useCallback(
        async (enabled: boolean, disabledModules: CommercialModuleId[]) => {
            setLoading(true);
            try {
                const data = await updateCommercialConfig({ enabled, disabledModules });
                cacheRef.current = { data, timestamp: Date.now() };
                setConfig(data);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return {
        enabled: config?.enabled ?? false,
        disabledModules: (config?.disabledModules as CommercialModuleId[]) ?? [],
        auditLog: config?.auditLog ?? [],
        isModuleDisabled,
        loading,
        refresh: fetchConfig,
        update,
    };
}