// src/components/admin/AdminDashboard.tsx
// 管理后台控制台页面

import React, { useEffect, useState } from 'react';
import {
    Users,
    Receipt,
    Folder,
    TrendingUp,
    TrendingDown,
    Coins,
    Activity,
    Sparkles
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';

interface Stats {
    users: { total: number; today: number; active: number; disabled: number };
    orders: { total: number; today: number; totalRevenue: number; todayRevenue: number };
    projects: { total: number; today: number };
}

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSystemStats();
            setStats(data);
        } catch (err: any) {
            setError(err.message || '加载统计数据失败');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-red-600">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="relative mb-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Overview</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Welcome back, Super Admin</p>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="text-white" size={24} />}
                    label="总用户数"
                    value={stats?.users.total || 0}
                    subValue={`今日新增 +${stats?.users.today || 0}`}
                    gradient="from-blue-500 to-cyan-500"
                    shadowColor="shadow-blue-500/30"
                />
                <StatCard
                    icon={<Activity className="text-white" size={24} />}
                    label="活跃用户"
                    value={stats?.users.active || 0}
                    subValue={`已禁用 ${stats?.users.disabled || 0}`}
                    gradient="from-emerald-500 to-teal-500"
                    shadowColor="shadow-emerald-500/30"
                />
                <StatCard
                    icon={<Folder className="text-white" size={24} />}
                    label="项目总数"
                    value={stats?.projects.total || 0}
                    subValue={`今日新建 +${stats?.projects.today || 0}`}
                    gradient="from-violet-500 to-purple-500"
                    shadowColor="shadow-violet-500/30"
                />
                <StatCard
                    icon={<Coins className="text-white" size={24} />}
                    label="订单总额"
                    value={`¥${stats?.orders.totalRevenue?.toFixed(2) || '0.00'}`}
                    subValue={`今日 ¥${stats?.orders.todayRevenue?.toFixed(2) || '0.00'}`}
                    gradient="from-amber-500 to-orange-500"
                    shadowColor="shadow-amber-500/30"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="text-violet-500" size={20} />
                                快捷操作中心
                            </h3>
                            <button className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full hover:bg-violet-100 transition-colors">
                                查看全部
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                            <QuickAction label="用户管理" icon={<Users size={24} />} color="blue" />
                            <QuickAction label="订单查询" icon={<Receipt size={24} />} color="amber" />
                            <QuickAction label="积分配置" icon={<Coins size={24} />} color="violet" />
                            <QuickAction label="系统维护" icon={<Activity size={24} />} color="rose" />
                        </div>
                    </div>

                    {/* Placeholder for Chart or more data */}
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20 mix-blend-overlay" />

                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-2">数据增长趋势</h3>
                            <p className="text-violet-100 text-sm mb-6">过去 7 天的系统活跃度分析</p>

                            {/* Simple CSS Chart Placeholder */}
                            <div className="h-48 flex items-end gap-2 justify-between px-2">
                                {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                                    <div key={i} className="w-full bg-white/20 rounded-t-lg relative group transition-all duration-300 hover:bg-white/30" style={{ height: `${h}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-violet-600 text-xs font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h * 12}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-violet-200 mt-4 font-medium opacity-70">
                                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Panel (1/3 width) */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 h-fit">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" size={20} />
                        系统健康度
                    </h3>
                    <div className="space-y-6">
                        <StatusItem label="服务状态" status="正常运行" subLabel="Uptime: 99.9%" icon={<Activity size={18} />} color="emerald" />
                        <StatusItem label="数据库" status="连接稳定" subLabel="Latency: 24ms" icon={<Folder size={18} />} color="blue" />
                        <StatusItem label="AI 引擎" status="响应极速" subLabel="Gemini Pro" icon={<Sparkles size={18} />} color="violet" />

                        <div className="pt-6 border-t border-slate-100 mt-6">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Storage Usage</div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                                    <div className="h-full w-[45%] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-slate-600">
                                    <span>452 GB Used</span>
                                    <span>1 TB Total</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 统计卡片组件
interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    subValue?: string;
    gradient: string;
    shadowColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, gradient, shadowColor }) => (
    <div className={`bg-white rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${shadowColor} border border-slate-100/50`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg text-white transform group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            {/* Sparkle decoration */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity`} />
        </div>

        <div>
            <div className="text-2xl font-black text-slate-800 tracking-tight mb-1">{value}</div>
            <div className="text-sm font-medium text-slate-500">{label}</div>
            {subValue && (
                <div className="text-xs font-bold text-emerald-500 mt-3 flex items-center gap-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                    <TrendingUp size={10} />
                    {subValue}
                </div>
            )}
        </div>
    </div>
);

// 快捷操作按钮
const QuickAction: React.FC<{ label: string; icon: React.ReactNode; color: 'blue' | 'violet' | 'amber' | 'rose' }> = ({ label, icon, color }) => {
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-blue-500/30',
        violet: 'bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white hover:shadow-violet-500/30',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white hover:shadow-amber-500/30',
        rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-rose-500/30',
    };

    return (
        <button className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colorStyles[color]}`}>
            <div className="p-3 bg-white rounded-xl shadow-sm border border-black/5">
                {icon}
            </div>
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </button>
    );
};

// 状态指示器
const StatusItem: React.FC<{ label: string; status: string; subLabel: string; icon: React.ReactNode; color: string }> = ({ label, status, subLabel, icon, color }) => {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        blue: 'bg-blue-50 text-blue-600 ring-blue-100',
        violet: 'bg-violet-50 text-violet-600 ring-violet-100',
    };

    return (
        <div className="flex items-center gap-4 group cursor-default">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-4 transition-all duration-300 group-hover:ring-8 ${colors[color] || colors.emerald}`}>
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                    <span className="font-bold text-slate-700 text-sm">{label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{status}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">{subLabel}</div>
            </div>
        </div>
    );
};

export default AdminDashboard;
