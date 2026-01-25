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
    Activity
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
        <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="text-blue-500" />}
                    label="总用户数"
                    value={stats?.users.total || 0}
                    subValue={`今日新增 +${stats?.users.today || 0}`}
                    bgColor="bg-blue-50"
                />
                <StatCard
                    icon={<Activity className="text-green-500" />}
                    label="活跃用户"
                    value={stats?.users.active || 0}
                    subValue={`已禁用 ${stats?.users.disabled || 0}`}
                    bgColor="bg-green-50"
                />
                <StatCard
                    icon={<Folder className="text-violet-500" />}
                    label="项目总数"
                    value={stats?.projects.total || 0}
                    subValue={`今日新建 +${stats?.projects.today || 0}`}
                    bgColor="bg-violet-50"
                />
                <StatCard
                    icon={<Coins className="text-amber-500" />}
                    label="订单总额"
                    value={`¥${stats?.orders.totalRevenue?.toFixed(2) || '0.00'}`}
                    subValue={`今日 ¥${stats?.orders.todayRevenue?.toFixed(2) || '0.00'}`}
                    bgColor="bg-amber-50"
                />
            </div>

            {/* 快捷操作 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">快捷操作</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <QuickAction label="用户管理" icon={<Users size={18} />} />
                        <QuickAction label="订单管理" icon={<Receipt size={18} />} />
                        <QuickAction label="积分规则" icon={<Coins size={18} />} />
                        <QuickAction label="系统设置" icon={<Activity size={18} />} />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">系统状态</h3>
                    <div className="space-y-3">
                        <StatusItem label="后端服务" status="正常" />
                        <StatusItem label="数据库连接" status="正常" />
                        <StatusItem label="AI 服务" status="正常" />
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
    bgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, bgColor }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
                {icon}
            </div>
            <div>
                <div className="text-sm text-slate-500">{label}</div>
                <div className="text-2xl font-bold text-slate-800">{value}</div>
                {subValue && (
                    <div className="text-xs text-slate-400 mt-0.5">{subValue}</div>
                )}
            </div>
        </div>
    </div>
);

// 快捷操作按钮
const QuickAction: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => (
    <button className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium">
        {icon}
        {label}
    </button>
);

// 状态指示器
const StatusItem: React.FC<{ label: string; status: string }> = ({ label, status }) => (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="flex items-center gap-1.5 text-sm text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {status}
        </span>
    </div>
);

export default AdminDashboard;
