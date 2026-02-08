import React from 'react';

export type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface TagProps {
    children: React.ReactNode;
    variant?: TagVariant;
    className?: string;
}

export const Tag: React.FC<TagProps> = ({
    children,
    variant = 'default',
    className = ''
}) => {
    const variants: Record<TagVariant, string> = {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800',
        info: 'bg-indigo-100 text-indigo-800'
    };

    return (
        <span
            className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${variants[variant]}
                ${className}
            `}
        >
            {children}
        </span>
    );
};
