import React from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    width?: string;
    footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = '480px',
    footer
}) => {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                onClick={onClose}
            />
            <div
                className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col"
                style={{ width }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        {footer}
                    </div>
                )}
            </div>
        </>
    );
};
