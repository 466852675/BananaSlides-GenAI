
import React, { useEffect, useState } from 'react';
import {
    Users,
    Gift,
    UserPlus,
    TrendingUp,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import * as AdminAPI from '../../api/admin';

export const GrowthStats: React.FC = () => {
    const [stats, setStats] = useState<AdminAPI.GrowthStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await AdminAPI.getGrowthStats();
                setStats(data);
            } catch (err) {
                console.error('Failed to load growth stats', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="今日签到"
                    value={stats?.todayCheckIns || 0}
                    subValue={`累计 ${stats?.totalCheckIns || 0}`}
                    icon={<Calendar className="text-blue-500" size={20} />}
                />
                <MetricCard
                    label="今日拉新"
                    value={stats?.todayReferrals || 0}
                    subValue={`转化率 12.5%`}
                    icon={<UserPlus className="text-emerald-500" size={20} />}
                />
                <MetricCard
                    label="分发积分"
                    value="2.4k"
                    subValue="+15% vs yesterday"
                    icon={<TrendingUp className="text-violet-500" size={20} />}
                />
                <MetricCard
                    label="活跃系数"
                    value="0.84"
                    subValue="Very Healthy"
                    icon={<Users className="text-amber-500" size={20} />}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">签到与活跃趋势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Check-in Activity</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.timeline || []}>
                                <defs>
                                    <linearGradient id="colorCheck" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        background: 'rgba(255,255,255,0.9)'
                                    }}
                                />
                                <Area type="monotone" dataKey="checkIns" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCheck)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/60 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">拉新趋势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">New Referrals & Signups</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.timeline || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        background: 'rgba(255,255,255,0.9)'
                                    }}
                                />
                                <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={3} dot={false} />
                                <Line type="monotone" dataKey="referrals" stroke="#3b82f6" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-500">新注册</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-[10px] font-bold text-slate-500">邀请成功</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MetricCard: React.FC<{ label: string; value: string | number; subValue: string; icon: React.ReactNode }> = ({ label, value, subValue, icon }) => (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-white/60 shadow-sm group hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-violet-50 transition-colors">
                {icon}
            </div>
        </div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
        <div className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
            <ArrowUpRight size={10} className="text-emerald-500" />
            {subValue}
        </div>
    </div>
);
