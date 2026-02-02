import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
    /** 单一权限代码 */
    permission?: string;
    /** 多个权限代码（满足任一即可） */
    permissions?: string[];
    /** 是否需要满足所有权限（AND逻辑，默认false为OR逻辑） */
    requireAll?: boolean;
    /** 子元素 */
    children: React.ReactNode;
    /** 无权限时的替代内容 */
    fallback?: React.ReactNode;
    /** 无权限时是否完全隐藏（默认显示fallback） */
    hideOnMissing?: boolean;
    /** 自定义样式类名 */
    className?: string;
}

/**
 * 权限守卫组件
 * 根据用户权限决定是否渲染子元素
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    permissions,
    requireAll = false,
    children,
    fallback,
    hideOnMissing = false,
    className = ''
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

    // 加载中显示子元素（避免闪烁）
    if (isLoading) {
        return <>{children}</>;
    }

    // 检查权限
    let hasAccess = false;

    if (permission) {
        // 单一权限检查
        hasAccess = hasPermission(permission);
    } else if (permissions && permissions.length > 0) {
        // 多权限检查
        hasAccess = requireAll
            ? hasAllPermissions(permissions)  // AND逻辑
            : hasAnyPermission(permissions);  // OR逻辑
    } else {
        // 未指定权限，默认允许
        hasAccess = true;
    }

    // 有权限，正常渲染
    if (hasAccess) {
        return <>{children}</>;
    }

    // 无权限，完全隐藏
    if (hideOnMissing) {
        return null;
    }

    // 无权限，显示fallback或默认遮罩
    if (fallback !== undefined) {
        return <>{fallback}</>;
    }

    // 默认无权限显示
    return (
        <div className={`relative inline-block ${className}`}>
            <div className="opacity-50 grayscale pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px] rounded cursor-not-allowed">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/90 rounded-lg shadow-sm">
                    <Lock size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-600">无权限</span>
                </div>
            </div>
        </div>
    );
};

export default PermissionGuard;
