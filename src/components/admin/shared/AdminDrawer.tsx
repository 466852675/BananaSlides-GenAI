import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';

interface AdminDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'narrow' | 'medium' | 'wide' | number;
    showCloseButton?: boolean;
    headerExtra?: React.ReactNode;
}

const widthPresets = {
    narrow: 440,
    medium: 560,
    wide: 720
};

// ============================================================
// Drawer Standard Sub-components
// ============================================================

export const DrawerSection: React.FC<{
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    extra?: React.ReactNode;
    className?: string;
}> = ({ title, description, icon: Icon, children, extra, className = "" }) => (
    <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between px-1">
            <div className="flex flex-col gap-0.5">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    {Icon && <Icon size={12} className="text-indigo-500" />}
                    {title}
                </h4>
                {description && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{description}</p>}
            </div>
            {extra}
        </div>
        {children}
    </div>
);

export const DrawerCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    noPadding?: boolean;
    variant?: 'default' | 'info' | 'warning' | 'danger';
}> = ({ children, className = "", noPadding = false, variant = 'default' }) => {
    const variants = {
        default: 'bg-white border-slate-100',
        info: 'bg-blue-50/50 border-blue-100',
        warning: 'bg-amber-50/50 border-amber-100',
        danger: 'bg-rose-50/50 border-rose-100',
    };

    return (
        <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${variants[variant]} ${className}`}>
            <div className={noPadding ? "" : "p-5"}>
                {children}
            </div>
        </div>
    );
};

import { AdminAvatar } from './AdminAvatar';

export const DrawerHeadCard: React.FC<{
    title: string;
    description?: string;
    icon?: LucideIcon;
    avatarUrl?: string | null;
    avatarFallback?: string;
    variant?: 'primary' | 'warning' | 'danger' | 'info' | 'dark';
    children?: React.ReactNode;
}> = ({ title, description, icon: Icon, avatarUrl, avatarFallback, variant = 'primary', children }) => {
    const variants = {
        primary: 'from-indigo-500 to-violet-600 text-white shadow-indigo-200',
        dark: 'from-slate-800 to-slate-900 text-white shadow-slate-200',
        warning: 'from-amber-400 to-orange-500 text-white shadow-amber-100',
        danger: 'from-rose-500 to-red-600 text-white shadow-rose-100',
        info: 'from-blue-50 to-indigo-50 text-slate-800 border border-indigo-100 shadow-sm',
    };

    return (
        <div className={`relative p-6 bg-gradient-to-br rounded-[2rem] shadow-xl overflow-hidden ${variants[variant]}`}>
            {variant !== 'info' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            )}
            <div className="flex items-start gap-4 h-full relative z-10">
                <div className="shrink-0">
                    <AdminAvatar
                        src={avatarUrl}
                        fallback={avatarFallback || (Icon ? undefined : title)}
                        icon={Icon}
                        size="lg"
                        className={variant === 'info' ? 'bg-white shadow-sm ring-2 ring-white/50' : 'bg-white/20 ring-2 ring-white/20'}
                    />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black tracking-tight truncate">{title}</h4>
                    {description && (
                        <p className={`text-[10px] mt-1 font-bold uppercase tracking-wider truncate ${variant === 'info' ? 'text-slate-400' : 'text-white/60'}`}>
                            {description}
                        </p>
                    )}
                    {children && <div className="mt-4">{children}</div>}
                </div>
            </div>
        </div>
    );
};

export const DrawerKeyValue: React.FC<{
    label: string;
    value: React.ReactNode;
    icon?: LucideIcon;
    className?: string;
    valueClassName?: string;
}> = ({ label, value, icon: Icon, className = "", valueClassName = "text-slate-700" }) => (
    <div className={`flex items-center justify-between text-sm ${className}`}>
        <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            {Icon && <Icon size={12} />}
            {label}
        </span>
        <span className={`font-bold ${valueClassName}`}>{value}</span>
    </div>
);

// ============================================================
// Main AdminDrawer Component
// ============================================================

export const AdminDrawer: React.FC<AdminDrawerProps> & {
    Section: typeof DrawerSection;
    Card: typeof DrawerCard;
    HeadCard: typeof DrawerHeadCard;
    KeyValue: typeof DrawerKeyValue;
} = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    width = 'medium',
    showCloseButton = true,
    headerExtra
}) => {
        // Lock body scroll when open
        useEffect(() => {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'unset';
            }
            return () => {
                document.body.style.overflow = 'unset';
            };
        }, [isOpen]);

        const resolvedWidth = typeof width === 'number' ? width : widthPresets[width];

        return ReactDOM.createPortal(
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-colors"
                        />

                        {/* Drawer Container */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            style={{ width: resolvedWidth }}
                            className="fixed inset-y-0 right-0 h-full bg-white shadow-2xl z-[110] flex flex-col border-l border-slate-100"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                                <div className="flex flex-col gap-0.5">
                                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                        {title}
                                    </h2>
                                    {description && <p className="text-xs text-slate-400 font-medium">{description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {headerExtra}
                                    {showCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content Scroll Area */}
                            <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]/30 custom-scrollbar">
                                <div className="space-y-6">
                                    {children}
                                </div>
                            </div>

                            {/* Footer */}
                            {footer && (
                                <div className="px-6 py-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                                    {footer}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>,
            document.body
        );
    };

// Assign sub-components
AdminDrawer.Section = DrawerSection;
AdminDrawer.Card = DrawerCard;
AdminDrawer.HeadCard = DrawerHeadCard;
AdminDrawer.KeyValue = DrawerKeyValue;
