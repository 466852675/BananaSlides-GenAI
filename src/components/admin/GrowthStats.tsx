
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 签到总览 */}
                <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                        <Calendar size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/10">
                                <Calendar size={20} className="text-white" />
                            </div>
                            <span className="font-bold text-white/90">今日签到</span>
                        </div>
                        <div className="text-4xl font-black mb-2 tracking-tight">{stats?.checkIn.today || 0}</div>
                        <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                            <span>累计: {stats?.checkIn.total || 0}</span>
                            <span className="w-1 h-1 rounded-full bg-white/50" />
                            <span>本周: {stats?.checkIn.weekly || 0}</span>
                        </div>
                    </div>
                </div>

                {/* 活跃用户 */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Users size={80} className="text-blue-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <TrendingUp size={20} />
                            </div>
                            <span className="font-bold text-slate-600">连续签到</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                            {stats?.checkIn.activeStreakUsers || 0}
                        </div>
                        <div className="flex items-center gap-1 text-emerald-500 text-sm font-bold bg-emerald-50 w-fit px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} />
                            <span>活跃用户</span>
                        </div>
                    </div>
                </div>

                {/* 拉新数据 */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <UserPlus size={80} className="text-indigo-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <UserPlus size={20} />
                            </div>
                            <span className="font-bold text-slate-600">今日拉新</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                            {stats?.referral.today || 0}
                        </div>
                        <div className="text-sm font-bold text-slate-400">
                            累计邀请: {stats?.referral.total || 0} 人
                        </div>
                    </div>
                </div>

                {/* 发放奖励 */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                        <Gift size={80} className="text-amber-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                <Gift size={20} />
                            </div>
                            <span className="font-bold text-slate-600">累计奖励</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                            {stats?.checkIn.totalRewards || 0}
                        </div>
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">Points Distributed</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">签到趋势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Check-in Activity</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.trend || []}>
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
                                        background: 'rgba(255,255,255,0.9)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCheck)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">拉新趋势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">New Referrals & Signups</p>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                        background: 'rgba(255,255,255,0.9)',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}
                                />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
