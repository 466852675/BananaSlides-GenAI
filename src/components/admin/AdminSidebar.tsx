// src/components/admin/AdminSidebar.tsx
// 管理后台侧边栏

import React from 'react';
import {
    LayoutDashboard,
    Users,
    Receipt,
    Coins,
    Shield,
    Settings,
    ArrowLeft,
    Sparkles
} from 'lucide-react';

export type AdminPage = 'dashboard' | 'users' | 'orders' | 'points-rules' | 'roles' | 'settings';

interface AdminSidebarProps {
    currentPage: AdminPage;
    onPageChange: (page: AdminPage) => void;
    onBack: () => void;
}

const menuItems: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '控制台', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: '用户管理', icon: <Users size={18} /> },
    { id: 'orders', label: '订单管理', icon: <Receipt size={18} /> },
    { id: 'points-rules', label: '积分规则', icon: <Coins size={18} /> },
    { id: 'roles', label: '角色权限', icon: <Shield size={18} /> },
    { id: 'settings', label: '系统设置', icon: <Settings size={18} /> },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPage, onPageChange, onBack }) => {
    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-lg">BananaSlides</div>
                        <div className="text-xs text-slate-400">管理后台</div>
                    </div>
                </div>
            </div>

            {/* 菜单 */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPageChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${currentPage === item.id
                                ? 'bg-violet-600 text-white'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        {item.icon}
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* 返回按钮 */}
            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    返回创作室
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
