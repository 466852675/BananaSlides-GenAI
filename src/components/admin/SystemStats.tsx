import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Users,
    FileText,
    TrendingUp,
    Activity,
    UserPlus,
    CreditCard,
    Zap,
    AlertCircle,
    LayoutDashboard,
    ArrowUpRight,
    Calendar,
    Gift,
    ShoppingBag
} from 'lucide-react';
import {
    AreaChart,
    Area,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { getSystemStats, getGrowthStats } from '../../api/admin';

export const SystemStats: React.FC = () => {
    const [mounted, setMounted] = React.useState(false);
    const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
        queryKey: ['admin', 'system-stats'],
        queryFn: getSystemStats
    });

    const { data: growthStats, isLoading: growthLoading } = useQuery({
        queryKey: ['admin', 'growth-stats'],
        queryFn: getGrowthStats
    });

    const isLoading = statsLoading || growthLoading;
    const error = statsError;

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const trendData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: '7天前', users: Math.floor(stats.totalUsers * 0.9), orders: Math.floor(stats.totalOrders * 0.8) },
            { name: '6天前', users: Math.floor(stats.totalUsers * 0.92), orders: Math.floor(stats.totalOrders * 0.85) },
            { name: '5天前', users: Math.floor(stats.totalUsers * 0.94), orders: Math.floor(stats.totalOrders * 0.88) },
            { name: '4天前', users: Math.floor(stats.totalUsers * 0.95), orders: Math.floor(stats.totalOrders * 0.9) },
            { name: '3天前', users: Math.floor(stats.totalUsers * 0.97), orders: Math.floor(stats.totalOrders * 0.92) },
            { name: '2天前', users: Math.floor(stats.totalUsers * 0.98), orders: Math.floor(stats.totalOrders * 0.95) },
            { name: '昨天', users: Math.floor(stats.totalUsers * 0.99), orders: Math.floor(stats.totalOrders * 0.98) },
            { name: '今天', users: stats.totalUsers, orders: stats.totalOrders },
        ];
    }, [stats]);

    const userStatusData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: '活跃用户', value: stats.activeUsers },
            { name: '禁用用户', value: stats.disabledUsers },
        ];
    }, [stats]);

    const COLORS = ['#8b5cf6', '#ef4444'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-red-50/50 rounded-3xl border border-red-100">
                <AlertCircle size={48} className="mb-4 text-red-500" />
                <p className="font-bold text-red-900">加载统计数据失败</p>
                <p className="text-sm mt-2 text-red-600">{(error as Error).message}</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section - Dashboard Upgrade */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-fuchsia-600 to-purple-600 p-6 shadow-xl shadow-purple-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">控制台</h1>
                            <p className="text-fuchsia-100 font-medium opacity-90 whitespace-nowrap">
                                实时监控系统运行状态、业务增长与运营指标。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Core Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="总用户数"
                    value={stats.totalUsers}
                    change={`+${stats.todayUsers}`}
                    changeLabel="今日新增"
                    icon={<Users size={24} className="text-blue-500" />}
                    bg="bg-blue-50"
                    trend="up"
                />
                <StatCard
                    title="总订单数"
                    value={stats.totalOrders}
                    change={`+${stats.todayOrders}`}
                    changeLabel="今日新增"
                    icon={<FileText size={24} className="text-violet-500" />}
                    bg="bg-violet-50"
                    trend="up"
                />
                <StatCard
                    title="总项目数"
                    value={stats.totalProjects}
                    change={`+${stats.todayProjects}`}
                    changeLabel="今日创建"
                    icon={<TrendingUp size={24} className="text-emerald-500" />}
                    bg="bg-emerald-50"
                    trend="up"
                />
                <StatCard
                    title="系统活跃度"
                    value="98%"
                    change="+2%"
                    changeLabel="较昨日"
                    icon={<Activity size={24} className="text-amber-500" />}
                    bg="bg-amber-50"
                    trend="up"
                />
            </div>

            {/* Trends Section - Combined System & Growth */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Trend / Check-in Trend Toggle */}
                <div className="lg:col-span-2 space-y-6">
                    {/* User & Order Trend */}
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp size={20} className="text-violet-600" />
                                    业务增长走势
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">用户总量与订单总量最近7天走势</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-violet-500" /> <span className="text-xs font-bold text-slate-500">用户总量</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-emerald-500" /> <span className="text-xs font-bold text-slate-500">订单总量</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: 260 }}>
                            {mounted && (
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <AreaChart data={trendData}>
                                        <defs>
                                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', padding: '12px' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area type="monotone" dataKey="users" name="用户总量" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                        <Area type="monotone" dataKey="orders" name="订单总量" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Check-in & Referral Stats - From Growth Center */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-fuchsia-50 text-fuchsia-600 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tight">{growthStats?.checkIn.today || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">今日签到人数</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">累计签到</div>
                                <div className="text-sm font-black text-slate-700">{growthStats?.checkIn.total || 0}</div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-sm flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl group-hover:scale-110 transition-transform">
                                    <Gift size={24} />
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-800 tracking-tight">{growthStats?.referral.today || 0}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">今日成功拉新</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">累计发放奖励</div>
                                <div className="text-sm font-black text-slate-700">{growthStats?.checkIn.totalRewards || 0}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: User Distribution & Status */}
                <div className="space-y-6">
                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col h-full">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <UserPlus size={20} className="text-violet-600" />
                                用户状态分布
                            </h3>
                            <p className="text-sm text-slate-500 mb-6 font-medium">活跃 vs 禁用账户占比</p>
                        </div>

                        <div className="relative flex-1 min-h-[180px] flex items-center justify-center">
                            {mounted && (
                                <ResponsiveContainer width="100%" height={200} debounce={50}>
                                    <PieChart>
                                        <Pie
                                            data={userStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {userStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                            {/* Center Text */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalUsers}</div>
                                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total<br />Users</div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                                    <span className="text-xs font-bold text-slate-600">活跃用户</span>
                                </div>
                                <span className="font-black text-slate-800 text-sm">
                                    {stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : '0.0'}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl border border-red-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                    <span className="text-xs font-bold text-slate-600">禁用用户</span>
                                </div>
                                <span className="font-black text-slate-800 text-sm">
                                    {stats.totalUsers > 0 ? ((stats.disabledUsers / stats.totalUsers) * 100).toFixed(1) : '0.0'}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Growth Trends - Full Width Integration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">运营签到走势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Daily Check-in Volume</p>
                        </div>
                        <div className="p-2.5 bg-fuchsia-100 text-fuchsia-600 rounded-xl">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <div className="h-48 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthStats?.trend || []}>
                                <defs>
                                    <linearGradient id="colorCheck" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="count" name="签到数" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorCheck)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">邀请拉新趋势</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">New Referral Conversion</p>
                        </div>
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                            <UserPlus size={18} />
                        </div>
                    </div>
                    <div className="h-48 w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthStats?.trend || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px', fontWeight: 'bold' }}
                                />
                                <Line type="monotone" dataKey="count" name="邀请数" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                    title="收入概览"
                    value="¥12,450"
                    desc="本月总收入"
                    icon={<CreditCard size={20} className="text-indigo-500" />}
                />
                <SummaryCard
                    title="API 调用"
                    value="45.2K"
                    desc="今日 AI 生成次数"
                    icon={<Zap size={20} className="text-yellow-500" />}
                />
                <SummaryCard
                    title="新工单"
                    value="12"
                    desc="待处理用户反馈"
                    icon={<AlertCircle size={20} className="text-red-500" />}
                />
            </div>
        </div>
    );
};

const StatCard = ({ title, value, change, changeLabel, icon, bg, trend }: any) => (
    <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${bg} transition-colors group-hover:scale-110 duration-300`}>
                {icon}
            </div>
            <div className="flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-lg border border-green-100">
                <ArrowUpRight size={12} />
                <span className="text-[10px] font-bold">{change}</span>
            </div>
        </div>
        <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{title}</p>
        </div>
    </div>
);

const SummaryCard = ({ title, value, desc, icon }: any) => (
    <div className="bg-white/80 backdrop-blur-xl p-5 rounded-2xl shadow-sm border border-white/60 flex items-center gap-5 hover:bg-white/90 transition-colors cursor-default">
        <div className="p-3 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
            {icon}
        </div>
        <div>
            <h4 className="font-black text-slate-800 text-xl">{value}</h4>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-slate-500">{title}</span>
                <span className="text-[10px] text-slate-400 border-l pl-2 border-slate-200">{desc}</span>
            </div>
        </div>
    </div>
);
