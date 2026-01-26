// src/components/admin/AdminHeader.tsx
// 管理后台头部

import React, { useState, useEffect } from 'react';
import { Bell, Search, Maximize2, Minimize } from 'lucide-react';
import { UserWidget } from '../auth/UserWidget';

interface AdminHeaderProps {
    title: string;
    subtitle?: string;
    onBack: () => void;
    onProfileClick: () => void;
    onPointsClick: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, onBack, onProfileClick, onPointsClick }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
            {/* 左侧：标题 */}
            <div>
                <h1 className="text-xl font-bold text-slate-800">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500">{subtitle}</p>
                )}
            </div>

            {/* 右侧：搜索和用户信息 */}
            <div className="flex items-center gap-4">
                {/* 搜索框 */}
                <div className="relative hidden lg:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜索..."
                        className="w-64 pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                    />
                </div>

                {/* 通知按钮 */}
                <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* 用户信息 - 复用主应用的 UserWidget */}
                <UserWidget
                    mode="admin"
                    onAdminClick={onBack}
                    compact={false}
                    onProfileClick={onProfileClick}
                    onPointsClick={onPointsClick}
                    isFullscreen={isFullscreen}
                    toggleFullscreen={toggleFullscreen}
                />
            </div>
        </header>
    );
};

export default AdminHeader;
