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
    CreditCard,
    Maximize2,
    Minimize,
    CalendarCheck
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
    /** 点击"每日签到"的回调 */
    onCheckInClick?: () => void;
    /** 组件模式：'app' 为普通应用模式，'admin' 为管理后台模式 */
    mode?: 'app' | 'admin';
    /** 是否处于滚动状态（灵动岛模式） */
    isScrolled?: boolean;
    isFullscreen?: boolean;
    toggleFullscreen?: () => void;
}

export const UserWidget: React.FC<UserWidgetProps> = ({ compact = false, mode = 'app', isScrolled = false, isFullscreen = false, toggleFullscreen, onEnterApp, onAdminClick, onProfileClick, onPointsClick, onCheckInClick }) => {
    const { user, isAuthenticated, logout, setShowLoginModal, isAdmin, isSuperAdmin } = useAuth();
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
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-md shadow-violet-500/20"
            >
                登录
            </button>
        );
    }

    // compact 模式：登录后显示"返回创作室"按钮
    if (compact) {
        return (
            <button
                onClick={onEnterApp}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm hover:from-violet-700 hover:to-fuchsia-700 transition-all shadow-md shadow-violet-500/20"
            >
                返回创作室
            </button>
        );
    }

    // 已登录状态（完整模式）：显示用户信息、角色标签、积分面板
    return (
        <div className="flex items-center gap-2 lg:gap-3 ml-auto" ref={dropdownRef}>
            {/* 0. 全屏切换按钮 - 根据灵动岛状态动态对齐 */}
            <button
                onClick={toggleFullscreen}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all group shrink-0"
                title={isFullscreen ? "退出全屏" : "全屏模式"}
            >
                {isFullscreen ? <Minimize size={16} /> : <Maximize2 size={16} />}
            </button>

            {/* 1. 用户类型标签 (User Role Tag) */}
            {!isScrolled && (
                <div className="hidden md:flex">
                    <UserRoleTag user={user} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
                </div>
            )}

            {/* 2. 剩余积分标签 (Points Label) - 点击可查看明细 */}
            <button
                onClick={onPointsClick}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-100/50 hover:bg-amber-100 hover:border-amber-200 transition-all group"
                title="点击查看积分明细"
            >
                <Coins size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-amber-700">{user.points}</span>
                {!isScrolled && <span className="text-[10px] text-amber-600/70 font-medium">积分</span>}
            </button>

            {/* 3. 用户信息下拉菜单 (User Info & Dropdown) */}
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-all group"
                >
                    {/* 头像 */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium shadow-sm group-hover:shadow-md transition-shadow ring-2 ring-white overflow-hidden">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.nickname || ''} className="w-full h-full object-cover" />
                        ) : (
                            (user.nickname || user.email || 'U')[0].toUpperCase()
                        )}
                    </div>

                    {/* 昵称 */}
                    {!isScrolled && (
                        <div className="hidden sm:block text-left">
                            <div className="text-sm font-bold text-slate-700 max-w-[100px] truncate leading-tight">
                                {user.nickname || user.email?.split('@')[0] || '用户'}
                            </div>
                        </div>
                    )}

                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* 下拉菜单内容 */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden z-50 origin-top-right"
                        >
                            {/* 头部信息卡片 */}
                            <div className="p-4 bg-gradient-to-tr from-slate-50 to-white border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-lg font-bold shadow-inner">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.nickname || ''} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            (user.nickname || user.email || 'U')[0].toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-black text-slate-800 truncate text-base leading-none mb-1">
                                            {user.nickname || user.email?.split('@')[0] || '用户'}
                                        </div>
                                        <div className="text-[11px] text-slate-400 truncate font-medium">
                                            {user.email || '尚未绑定邮箱'}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    <UserRoleTag user={user} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} compact />
                                    {user.vipLevel > 0 && (
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100/50">
                                            LV. {user.vipLevel}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 菜单项部分 */}
                            <div className="p-1.5">
                                <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">个人中心</div>
                                <MenuButton icon={<User size={16} />} label="系统资料设置" onClick={() => { setIsOpen(false); onProfileClick?.(); }} />
                                <MenuButton icon={<History size={16} />} label="查看积分明细" onClick={() => { setIsOpen(false); onPointsClick?.(); }} />
                                <MenuButton icon={<CalendarCheck size={16} />} label="每日签到" onClick={() => { setIsOpen(false); onCheckInClick?.(); }} highlight />

                                {isAdmin && (
                                    <>
                                        <div className="my-1.5 border-t border-slate-100 mx-2" />
                                        <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">管理入口</div>
                                        {mode === 'app' ? (
                                            <MenuButton
                                                icon={<Shield size={16} />}
                                                label="进入管理后台"
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
                                                    onAdminClick?.(); // Trigger back
                                                }}
                                                highlight
                                            />
                                        )}
                                    </>
                                )}

                                <div className="my-1.5 border-t border-slate-100 mx-2" />
                                <MenuButton
                                    icon={<LogOut size={16} />}
                                    label="退出当前账号"
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
        </div>
    );
};

/**
 * 角色标签组件
 */
const UserRoleTag: React.FC<{ user: any, isAdmin: boolean, isSuperAdmin: boolean, compact?: boolean }> = ({ user, isAdmin, isSuperAdmin, compact }) => {
    // 逻辑：超级管理员 > 管理员 > 企业用户 > 专业用户 > 基础用户
    let label = "基础用户";
    let style = "bg-slate-100 text-slate-600 border-slate-200";

    if (isSuperAdmin) {
        label = "超级管理员";
        style = "bg-rose-50 text-rose-600 border-rose-200";
    } else if (isAdmin) {
        // 这里可以根据具体的业务逻辑细分，目前统称为系统管理员或业务管理员
        label = "系统管理员";
        style = "bg-blue-50 text-blue-600 border-blue-200";
    } else if (user.role === 'ENTERPRISE' || user.vipLevel >= 3) {
        label = "企业用户";
        style = "bg-emerald-50 text-emerald-600 border-emerald-200";
    } else if (user.role === 'PROFESSIONAL' || user.vipLevel >= 2) {
        label = "专业用户";
        style = "bg-violet-50 text-violet-600 border-violet-200";
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-bold whitespace-nowrap ${style} ${compact ? 'text-[10px] py-0' : ''}`}>
            {label}
        </span>
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
