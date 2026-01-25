// src/components/auth/UserWidget.tsx
// 用户组件：显示在导航栏的用户信息和下拉菜单

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Coins,
    Settings,
    LogOut,
    ChevronDown,
    Shield,
    History,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserWidgetProps {
    /** compact 模式：在落地页等场景只显示登录按钮，登录后显示简洁的"进入创作室"按钮 */
    compact?: boolean;
    /** compact 模式下登录后点击的回调 */
    onEnterApp?: () => void;
    /** 点击"管理后台"的回调 */
    /** 点击"管理后台"的回调 */
    onAdminClick?: () => void;
    /** 点击"个人中心"的回调 */
    onProfileClick?: () => void;
    /** 点击"积分明细"的回调 */
    onPointsClick?: () => void;
    /** 组件模式：'app' 为普通应用模式，'admin' 为管理后台模式 */
    mode?: 'app' | 'admin';
}

export const UserWidget: React.FC<UserWidgetProps> = ({ compact = false, mode = 'app', onEnterApp, onAdminClick, onProfileClick, onPointsClick }) => {
    const { user, isAuthenticated, logout, setShowLoginModal, isAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 未登录状态：显示登录按钮
    if (!isAuthenticated || !user) {
        return (
            <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-md shadow-violet-500/20"
            >
                登录
            </button>
        );
    }

    // compact 模式：登录后不显示任何内容（落地页已有"免费开始"按钮）
    if (compact) {
        return null;
    }

    // 已登录状态（完整模式）：显示用户信息和下拉菜单
    return (
        <div className="relative" ref={dropdownRef}>
            {/* 用户头像和信息 */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
                {/* 头像 */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium shadow-md">
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.nickname || ''} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        (user.nickname || user.email || 'U')[0].toUpperCase()
                    )}
                </div>

                {/* 昵称和积分 */}
                <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        {user.nickname || user.email?.split('@')[0] || '用户'}
                        {isAdmin && (
                            <Shield size={12} className="text-amber-500" />
                        )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Coins size={10} className="text-amber-500" />
                        {user.points} 积分
                    </div>
                </div>

                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>


            {/* 下拉菜单 */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200/60 overflow-hidden z-50"
                    >
                        {/* 用户信息头部 */}
                        <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-slate-100">
                            <div className="font-medium text-slate-800">
                                {user.nickname || user.email?.split('@')[0] || '用户'}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {user.email}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                                    <Coins size={10} />
                                    {user.points} 积分
                                </span>
                                {user.vipLevel > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                                        VIP {user.vipLevel}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 菜单项 */}
                        <div className="py-1">
                            <MenuButton icon={<User size={16} />} label="个人中心" onClick={() => { setIsOpen(false); onProfileClick?.(); }} />
                            <MenuButton icon={<History size={16} />} label="积分明细" onClick={() => { setIsOpen(false); onPointsClick?.(); }} />

                            {isAdmin && (
                                <>
                                    <div className="my-1 border-t border-slate-100" />
                                    {mode === 'app' ? (
                                        <MenuButton
                                            icon={<Shield size={16} />}
                                            label="管理后台"
                                            onClick={() => {
                                                setIsOpen(false);
                                                if (onAdminClick) {
                                                    onAdminClick();
                                                } else {
                                                    window.location.href = '/admin';
                                                }
                                            }}
                                            highlight
                                        />
                                    ) : (
                                        <MenuButton
                                            icon={<LogOut size={16} className="rotate-180" />}
                                            label="返回创作室"
                                            onClick={() => {
                                                setIsOpen(false);
                                                onAdminClick?.(); // In admin mode, this triggers 'back'
                                            }}
                                            highlight
                                        />
                                    )}
                                </>
                            )}

                            <div className="my-1 border-t border-slate-100" />
                            <MenuButton
                                icon={<LogOut size={16} />}
                                label="退出登录"
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                danger
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 菜单按钮组件
interface MenuButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    danger?: boolean;
    highlight?: boolean;
}

const MenuButton: React.FC<MenuButtonProps> = ({ icon, label, onClick, danger, highlight }) => (
    <button
        onClick={onClick}
        className={`w-full px-4 py-2 flex items-center gap-3 text-sm transition-colors ${danger
            ? 'text-red-600 hover:bg-red-50'
            : highlight
                ? 'text-violet-600 hover:bg-violet-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
    >
        {icon}
        {label}
    </button>
);

export default UserWidget;
