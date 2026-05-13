import React from 'react';
import { useCommercial, CommercialModuleId } from '../hooks/useCommercial';

interface CommercialGuardProps {
    /** 模块标识 */
    module: CommercialModuleId;
    /** 子元素 */
    children: React.ReactNode;
    /** 禁用时的替代内容 */
    fallback?: React.ReactNode;
}

/**
 * 商业化功能守卫组件
 * 当指定模块被禁用时，隐藏子元素
 */
export const CommercialGuard: React.FC<CommercialGuardProps> = ({
    module,
    children,
    fallback,
}) => {
    const { isModuleDisabled, loading } = useCommercial();

    // 加载中显示子元素（避免闪烁）
    if (loading) {
        return <>{children}</>;
    }

    // 模块被禁用
    if (isModuleDisabled(module)) {
        return fallback !== undefined ? <>{fallback}</> : null;
    }

    // 正常渲染
    return <>{children}</>;
};

export default CommercialGuard;