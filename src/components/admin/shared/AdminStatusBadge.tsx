import React from 'react';

export interface BadgeConfig {
    label: string;
    className: string;
    icon?: React.ReactNode;
}

interface AdminStatusBadgeProps {
    status: string;
    configs: Record<string, BadgeConfig>;
    className?: string;
}

export const AdminStatusBadge: React.FC<AdminStatusBadgeProps> = ({
    status,
    configs,
    className = ''
}) => {
    const config = configs[status] || {
        label: status,
        className: 'bg-slate-50 text-slate-500 border-slate-200'
    };

    return (
        <div className={`
            px-2 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap w-fit
            ${config.className}
            ${className}
        `}>
            {config.icon}
            <span className="leading-none">{config.label}</span>
        </div>
    );
};
