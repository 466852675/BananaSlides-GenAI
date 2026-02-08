import React from 'react';

interface AdminCardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
    glass?: boolean;
}

export const AdminCard: React.FC<AdminCardProps> = ({
    children,
    className = '',
    hoverable = false,
    glass = true
}) => {
    return (
        <div className={`
            ${glass ? 'bg-white/80 backdrop-blur-xl border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'bg-white border-slate-200 shadow-sm'}
            rounded-3xl border transition-all duration-500
            ${hoverable ? 'hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1' : ''}
            ${className}
        `}>
            {children}
        </div>
    );
};
