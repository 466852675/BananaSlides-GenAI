import { useState, useEffect, useCallback, useRef } from 'react';
import { getAgentFeatureConfig, updateAgentFeatureConfig, AgentFeatureConfig } from '../api/admin';

interface SubFeatures {
    guidedMode: boolean;
    autoMode: boolean;
    fileUpload: boolean;
}

interface UseAgentFeatureReturn {
    enabled: boolean;
    subFeatures: SubFeatures;
    auditLog: AgentFeatureConfig['auditLog'];
    isAgentDisabled: () => boolean;
    isSubFeatureDisabled: (feature: keyof SubFeatures) => boolean;
    loading: boolean;
    refresh: () => Promise<void>;
    update: (config: {
        enabled: boolean;
        subFeatures?: Partial<SubFeatures>;
    }) => Promise<void>;
}

const DEFAULT_SUB_FEATURES: SubFeatures = {
    guidedMode: true,
    autoMode: true,
    fileUpload: true,
};

/**
 * Agent 功能状态 Hook
 * 缓存 60 秒，避免频繁请求
 */
export function useAgentFeature(): UseAgentFeatureReturn {
    const [config, setConfig] = useState<AgentFeatureConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const cacheRef = useRef<{ data: AgentFeatureConfig; timestamp: number } | null>(null);
    const CACHE_TTL = 60 * 1000;

    const fetchConfig = useCallback(async () => {
        if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL) {
            setConfig(cacheRef.current.data);
            setLoading(false);
            return;
        }

        try {
            const data = await getAgentFeatureConfig();
            cacheRef.current = { data, timestamp: Date.now() };
            setConfig(data);
        } catch {
            if (!cacheRef.current) {
                setConfig({
                    enabled: true,
                    subFeatures: { ...DEFAULT_SUB_FEATURES },
                    auditLog: [],
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const isAgentDisabled = useCallback((): boolean => {
        if (!config) return false;
        return !config.enabled;
    }, [config]);

    const isSubFeatureDisabled = useCallback((feature: keyof SubFeatures): boolean => {
        if (!config) return false;
        if (!config.enabled) return true; // 总开关关闭时所有子功能禁用
        return !config.subFeatures[feature];
    }, [config]);

    const update = useCallback(
        async (cfg: {
            enabled: boolean;
            subFeatures?: Partial<SubFeatures>;
        }) => {
            setLoading(true);
            try {
                const currentSub = config?.subFeatures || DEFAULT_SUB_FEATURES;
                const data = await updateAgentFeatureConfig({
                    enabled: cfg.enabled,
                    subFeatures: {
                        ...currentSub,
                        ...(cfg.subFeatures || {}),
                    },
                });
                cacheRef.current = { data, timestamp: Date.now() };
                setConfig(data);
            } finally {
                setLoading(false);
            }
        },
        [config]
    );

    return {
        enabled: config?.enabled ?? true,
        subFeatures: config?.subFeatures ?? DEFAULT_SUB_FEATURES,
        auditLog: config?.auditLog ?? [],
        isAgentDisabled,
        isSubFeatureDisabled,
        loading,
        refresh: fetchConfig,
        update,
    };
}