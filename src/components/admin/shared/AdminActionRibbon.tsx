import React from 'react';
import { X, Sparkles, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface RibbonAction {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: string;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

interface AdminActionRibbonProps {
    selectedCount: number;
    onClear: () => void;
    actions: RibbonAction[];
    variant?: 'floating' | 'inline';
    tagLabel?: string;
    subText?: string;
    onSubTextClick?: () => void;
    unit?: string;
}

export const AdminActionRibbon: React.FC<AdminActionRibbonProps> = ({
    selectedCount,
    onClear,
    actions,
    variant = 'floating',
    tagLabel = 'BATCH',
    subText,
    onSubTextClick,
    unit = '订单数据'
}) => {
    return (
        <AnimatePresence>
            {selectedCount > 0 && (
                <motion.div
                    initial={variant === 'floating' ? { y: 100, opacity: 0 } : { height: 0, opacity: 0, marginBottom: 0 }}
                    animate={variant === 'floating' ? { y: 0, opacity: 1 } : { height: 'auto', opacity: 1, marginBottom: 16 }}
                    exit={variant === 'floating' ? { y: 100, opacity: 0 } : { height: 0, opacity: 0, marginBottom: 0 }}
                    className={variant === 'floating' ? "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4" : "w-full overflow-hidden"}
                >
                    <div className={`
                        ${variant === 'floating'
                            ? 'bg-slate-900 border-white/10 shadow-indigo-500/40'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-600 border-white/10 shadow-indigo-500/15'
                        }
                        text-white rounded-2xl p-3 shadow-2xl border flex items-center justify-between gap-4 relative overflow-hidden
                    `}>
                        {variant === 'inline' && (
                            <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />
                        )}
                        <div className="relative z-10 flex-1 flex items-center justify-between pl-1">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${variant === 'floating' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-white/15 backdrop-blur-md border border-white/10'}`}>
                                        {variant === 'floating' ? <Sparkles size={16} /> : <Zap size={16} className="text-amber-300 fill-amber-300 animate-pulse" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black tracking-tight leading-none ${variant === 'floating' ? '' : 'text-white'}`}>
                                                已选中 {selectedCount} 项{variant === 'inline' ? unit : ''}
                                            </span>
                                            {tagLabel && (
                                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${variant === 'floating' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-white/10 border-white/10 text-white'}`}>
                                                    {tagLabel}
                                                </span>
                                            )}
                                        </div>
                                        {subText && (
                                            <button
                                                onClick={onSubTextClick}
                                                className={`text-[10px] font-bold mt-1 text-left transition-colors ${variant === 'floating' ? 'text-slate-400 hover:text-indigo-400' : 'text-indigo-100 hover:text-white'}`}
                                            >
                                                {subText}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 relative z-10 pr-1">
                                {actions && actions.length > 0 && (
                                    <div className="flex items-center gap-2.5">
                                        {actions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={action.onClick}
                                                disabled={action.disabled}
                                                className={`
                                                px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2
                                                ${action.variant === 'primary'
                                                        ? 'bg-white text-indigo-600 shadow-xl shadow-white/10 hover:scale-105 active:scale-95'
                                                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}
                                                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                            >
                                                {action.icon && <span className="opacity-80">{action.icon}</span>}
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {variant === 'floating' && (
                                    <div className="w-px h-6 bg-white/10 mx-1" />
                                )}

                                {variant === 'floating' && (
                                    <button
                                        onClick={onClear}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                                        title="取消选择"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
