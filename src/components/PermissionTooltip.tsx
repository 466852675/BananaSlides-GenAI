import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { Lock, HelpCircle } from 'lucide-react';

interface PermissionTooltipProps {
    /** 所需权限代码 */
    requiredPermission: string;
    /** 子元素（按钮等） */
    children: React.ReactNode;
    /** 自定义样式类名 */
    className?: string;
    /** 是否显示帮助提示 */
    showHelp?: boolean;
}

/**
 * 权限提示组件
 * 当用户无权限时，显示锁图标和提示
 */
export const PermissionTooltip: React.FC<PermissionTooltipProps> = ({
    requiredPermission,
    children,
    className = '',
    showHelp = true
}) => {
    const { hasPermission, isLoading } = usePermissions();

    // 加载中直接显示
    if (isLoading) {
        return <>{children}</>;
    }

    // 有权限直接显示
    if (hasPermission(requiredPermission)) {
        return <>{children}</>;
    }

    // 无权限，显示带提示的版本
    return (
        <div className={`relative inline-block group ${className}`}>
            {/* 原内容 */}
            {children}

            {/* 遮罩层 */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded flex items-center justify-center cursor-not-allowed">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 rounded-md shadow-sm border border-slate-200">
                    <Lock size={14} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-600">无权限</span>
                </div>
            </div>

            {/* 悬浮提示 */}
            {showHelp && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
                    <div className="px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-xl">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Lock size={12} className="text-amber-400" />
                            <span className="font-bold">权限不足</span>
                        </div>
                        <div className="text-slate-300 text-[11px]">
                            需要权限: <code className="bg-slate-700 px-1 py-0.5 rounded text-amber-300">{requiredPermission}</code>
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 权限提示图标组件
 * 用于在按钮旁边显示权限提示图标
 */
export const PermissionHint: React.FC<{ permission: string }> = ({ permission }) => {
    const { hasPermission } = usePermissions();

    if (hasPermission(permission)) {
        return null;
    }

    return (
        <div className="group relative inline-flex">
            <HelpCircle size={14} className="text-amber-500 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50 whitespace-nowrap">
                <div className="px-2 py-1 bg-slate-800 text-white text-[10px] rounded">
                    需要: {permission}
                </div>
            </div>
        </div>
    );
};

export default PermissionTooltip;
