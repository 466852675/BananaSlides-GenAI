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
    Sparkles,
    Bot,
    TrendingUp,
    Sliders,
    MessageSquare,
    RefreshCcw,
    Database,
    Trash2
} from 'lucide-react';

export type AdminPage = 'dashboard' | 'users' | 'orders' | 'refunds' | 'leads' | 'points-rules' | 'roles' | 'ai-engine' | 'growth' | 'resources' | 'settings';

interface AdminSidebarProps {
    currentPage: AdminPage;
    onPageChange: (page: AdminPage) => void;
    onBack: () => void;
}

const menuItems: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '控制台', icon: <LayoutDashboard size={18} /> },
    { id: 'users', label: '用户管理', icon: <Users size={18} /> },
    { id: 'orders', label: '订单管理', icon: <Receipt size={18} /> },
    { id: 'refunds', label: '退款管理', icon: <RefreshCcw size={18} /> },
    { id: 'leads', label: '销售线索', icon: <MessageSquare size={18} /> },
    { id: 'points-rules', label: '积分规则', icon: <Coins size={18} /> },
    { id: 'growth', label: '产品管理', icon: <TrendingUp size={18} /> },
    { id: 'roles', label: '角色权限', icon: <Shield size={18} /> },
    { id: 'ai-engine', label: '模型引擎', icon: <Bot size={18} /> },
    { id: 'resources', label: '资源管理', icon: <Database size={18} /> },
    { id: 'settings', label: '系统设置', icon: <Settings size={18} /> },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentPage, onPageChange, onBack }) => {
    return (
        <aside className="w-72 bg-slate-900/95 backdrop-blur-xl text-white flex flex-col h-full border-r border-white/5 relative overflow-hidden transition-all duration-300 shadow-2xl shadow-black/20">
            {/* Ambient Glow Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-10%] right-[-20%] w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />

            {/* Logo */}
            <div
                className="p-6 relative z-10"
            >
                <div
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() => window.location.href = '/'}
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-105 transition-transform duration-500">
                        <Sparkles size={24} className="text-white drop-shadow-md" />
                    </div>
                    <div>
                        <div className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">智能PPT创作平台</div>
                        <div className="text-[10px] font-bold text-violet-300 uppercase tracking-widest bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 inline-block mt-1">管理后台</div>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5 relative z-10 custom-scrollbar">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2">Main Menu</div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onPageChange(item.id)}
                        className={`w-full group flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${currentPage === item.id
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/50 translate-x-1'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {/* Active Indicator Glow */}
                        {currentPage === item.id && (
                            <div className="absolute inset-0 bg-white/20 blur-md opacity-50" />
                        )}

                        <span className={`relative z-10 transition-transform duration-300 ${currentPage === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                            {item.icon}
                        </span>
                        <span className="relative z-10 font-bold tracking-wide">{item.label}</span>

                        {currentPage === item.id && (
                            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 relative z-10">
                <button
                    onClick={onBack}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 hover:border-violet-500/50 bg-white/5 hover:bg-violet-600/10 text-slate-300 hover:text-white transition-all text-sm font-medium group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    返回创作室
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;
