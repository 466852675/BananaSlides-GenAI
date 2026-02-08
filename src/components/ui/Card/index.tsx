import React from 'react';

export interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    extra?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
    title,
    children,
    className = '',
    extra
}) => {
    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            {(title || extra) && (
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
                    {extra && <div>{extra}</div>}
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
};
