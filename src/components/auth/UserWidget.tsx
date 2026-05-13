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
    CalendarCheck,
    Gift,
    ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from '../message/NotificationBell';
import { CommercialGuard } from '../CommercialGuard';

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
    /** 点击"我的订单"的回调 */
    onOrdersClick?: () => void;
    /** 点击"每日签到"的回调 */
    onCheckInClick?: () => void;
    /** 点击"邀请有礼"的回调 */
    onInviteClick?: () => void;
    /** 组件模式：'app' 为普通应用模式，'admin' 为管理后台模式 */
    mode?: 'app' | 'admin';
    /** 是否处于滚动状态（灵动岛模式） */
    isScrolled?: boolean;
    isFullscreen?: boolean;
    toggleFullscreen?: () => void;
}

export const UserWidget: React.FC<UserWidgetProps> = ({ compact = false, mode = 'app', isScrolled = false, isFullscreen = false, toggleFullscreen, onEnterApp, onAdminClick, onProfileClick, onPointsClick, onOrdersClick, onCheckInClick, onInviteClick }) => {
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
            {/* 1.5. 消息通知铃铛 - 移至最左侧 */}
            <NotificationBell />

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
            {/* 低积分预警：≤50 红色闪烁 / ≤100 橙色 / >100 正常 */}
            <CommercialGuard module="points">
            <button
                onClick={onPointsClick}
                className={`flex items-center gap-1.5 rounded-lg transition-all group ${isScrolled
                    ? 'p-1.5'
                    : 'px-2.5 py-1.5'
                } ${user.points <= 50
                    ? 'bg-gradient-to-r from-red-100 to-orange-100 border border-red-200/50 hover:from-red-200 hover:to-orange-200 animate-pulse'
                    : user.points <= 100
                        ? 'bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 hover:bg-orange-100'
                        : 'bg-amber-50 border border-amber-100/50 hover:bg-amber-100 hover:border-amber-200'
                    }`}
                title={isScrolled ? `${user.points} 积分` : '点击查看积分明细'}
            >
                <Coins size={14} className={`group-hover:scale-110 transition-transform ${user.points <= 50 ? 'text-red-500' : user.points <= 100 ? 'text-orange-500' : 'text-amber-500'
                    }`} />
                {!isScrolled && (
                    <span className={`text-xs font-bold ${user.points <= 50 ? 'text-red-700' : user.points <= 100 ? 'text-orange-700' : 'text-amber-700'
                        }`}>{user.points}</span>
                )}
                {!isScrolled && (
                    <span className={`text-[10px] font-medium ${user.points <= 50 ? 'text-red-600/70' : user.points <= 100 ? 'text-orange-600/70' : 'text-amber-600/70'
                        }`}>积分</span>
                )}
            </button>
            </CommercialGuard>

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
                                        <CommercialGuard module="points">
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black border border-indigo-100/50">
                                            LV. {user.vipLevel}
                                        </span>
                                        </CommercialGuard>
                                    )}
                                </div>
                            </div>

                            {/* 菜单项部分 */}
                            <div className="p-1.5">
                                <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">个人中心</div>
                                <MenuButton icon={<User size={16} />} label="资料设置" onClick={() => { setIsOpen(false); onProfileClick?.(); }} />
                                <CommercialGuard module="points"><MenuButton icon={<History size={16} />} label="积分明细" onClick={() => { setIsOpen(false); onPointsClick?.(); }} /></CommercialGuard>
                                <CommercialGuard module="points"><MenuButton icon={<ShoppingBag size={16} />} label="我的订单" onClick={() => { setIsOpen(false); onOrdersClick?.(); }} /></CommercialGuard>
                                <CommercialGuard module="checkin"><MenuButton icon={<CalendarCheck size={16} />} label="每日签到" onClick={() => { setIsOpen(false); onCheckInClick?.(); }} highlight /></CommercialGuard>
                                <CommercialGuard module="invite"><MenuButton icon={<Gift size={16} />} label="邀请有礼" onClick={() => { setIsOpen(false); onInviteClick?.(); }} /></CommercialGuard>

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
// 角色与VIP等级严格对应关系
const ROLE_VIP_MAP: Record<string, number> = {
    'USER': 0,
    'BASIC': 1,
    'PROFESSIONAL': 2,
    'PREMIUM': 3,
    'ENTERPRISE': 4,
    'ADMIN': 9,
    'SUPER_ADMIN': 10
};

const UserRoleTag: React.FC<{ user: any, isAdmin: boolean, isSuperAdmin: boolean, compact?: boolean }> = ({ user, isAdmin, isSuperAdmin, compact }) => {
    // 计算VIP等级（根据角色）
    const vipLevel = ROLE_VIP_MAP[user.role] ?? user.vipLevel ?? 0;

    // VIP等级徽章样式
    const getVipStyle = (level: number) => {
        if (level >= 10) return "bg-amber-200 text-amber-800 border-amber-300";
        if (level >= 9) return "bg-rose-100 text-rose-600 border-rose-200";
        if (level >= 4) return "bg-indigo-100 text-indigo-600 border-indigo-200";
        if (level >= 3) return "bg-amber-100 text-amber-600 border-amber-200";
        if (level >= 2) return "bg-violet-100 text-violet-600 border-violet-200";
        if (level >= 1) return "bg-blue-100 text-blue-600 border-blue-200";
        return "bg-slate-100 text-slate-500 border-slate-200";
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black whitespace-nowrap ${getVipStyle(vipLevel)} ${compact ? 'text-[9px] py-0' : ''}`}>
            Lv{vipLevel}
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
