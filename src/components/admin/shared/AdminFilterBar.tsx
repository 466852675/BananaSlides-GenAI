import React from 'react';

interface AdminFilterBarProps {
    children: React.ReactNode;
    className?: string;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
    children,
    className = ''
}) => {
    return (
        <div className={`bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm overflow-x-auto no-scrollbar ${className}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="flex items-center gap-1 min-w-max">
                {children}
            </div>
        </div>
    );
};
