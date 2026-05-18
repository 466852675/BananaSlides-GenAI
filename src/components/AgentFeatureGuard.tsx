import React from 'react';
import { useAgentFeature } from '../hooks/useAgentFeature';

interface AgentFeatureGuardProps {
    /** 子元素 */
    children: React.ReactNode;
    /** 禁用时的替代内容 */
    fallback?: React.ReactNode;
}

/**
 * Agent 功能守卫组件
 * 当 Agent 模式被禁用时，隐藏子元素
 */
export const AgentFeatureGuard: React.FC<AgentFeatureGuardProps> = ({
    children,
    fallback,
}) => {
    const { isAgentDisabled, loading } = useAgentFeature();

    // 加载中显示子元素（避免闪烁）
    if (loading) {
        return <>{children}</>;
    }

    // Agent 模式被禁用
    if (isAgentDisabled()) {
        return fallback !== undefined ? <>{fallback}</> : null;
    }

    // 正常渲染
    return <>{children}</>;
};

export default AgentFeatureGuard;