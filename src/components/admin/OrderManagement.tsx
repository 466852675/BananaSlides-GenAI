import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { Order } from '../../api/admin';
import {
    Loader2,
    Search,
    CheckCircle,
    XCircle,
    AlertCircle,
    ShoppingBag,
    Filter,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Calendar,
    User,
    RefreshCcw
} from 'lucide-react';

export const OrderManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [keyword, setKeyword] = useState('');

    // Fetch orders
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-orders', page, statusFilter, typeFilter, keyword],
        queryFn: () => AdminApi.getOrders({
            page,
            pageSize: 20,
            status: statusFilter || undefined,
            type: typeFilter || undefined,
            keyword: keyword || undefined
        }),
    });

    // Refund mutation
    const refundMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            AdminApi.refundOrder(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            alert('退款成功');
        },
        onError: (err: any) => {
            alert(`退款失败: ${err.message}`);
        }
    });

    const handleRefund = (order: Order) => {
        const reason = prompt('请输入退款原因:');
        if (reason) {
            refundMutation.mutate({ id: order.id, reason });
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            'PAID': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'PENDING': 'bg-amber-50 text-amber-600 border-amber-100',
            'REFUNDED': 'bg-slate-50 text-slate-500 border-slate-200',
            'FAILED': 'bg-rose-50 text-rose-600 border-rose-100'
        };
        const labels: Record<string, string> = {
            'PAID': '已支付',
            'PENDING': '待支付',
            'REFUNDED': '已退款',
            'FAILED': '支付失败'
        };
        return (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 w-fit ${styles[status] || 'bg-slate-50 text-slate-600'}`}>
                {status === 'PAID' && <CheckCircle size={12} />}
                {status === 'REFUNDED' && <RefreshCcw size={12} />}
                {status === 'FAILED' && <XCircle size={12} />}
                {labels[status] || status}
            </div>
        );
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-80">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h3 className="text-lg font-bold">无法加载订单数据</h3>
            <p className="text-sm opacity-80 mt-2">{(error as any).message}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex items-center gap-6">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                        <ShoppingBag size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight mb-2">订单管理</h2>
                        <p className="text-blue-100 font-medium opacity-90 whitespace-nowrap">
                            查看所有充值与订阅记录，处理退款申请。
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/60 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="搜索订单号或用户..."
                        value={keyword}
                        onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                    />
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[140px]"
                        >
                            <option value="">全部状态</option>
                            <option value="PAID">已支付</option>
                            <option value="PENDING">待支付</option>
                            <option value="REFUNDED">已退款</option>
                            <option value="FAILED">失败</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={12} />
                        </div>
                    </div>

                    <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                            className="pl-10 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[140px]"
                        >
                            <option value="">全部类型</option>
                            <option value="points">积分充值</option>
                            <option value="subscription">会员订阅</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={12} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100/60 bg-slate-50/50">
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">订单号</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">用户</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">类型</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">金额</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">内容</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">状态</th>
                                <th className="text-left text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">时间</th>
                                <th className="text-right text-xs font-black text-slate-400 uppercase tracking-wider px-6 py-4">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {data?.orders.map((order) => (
                                <tr key={order.id} className="group hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                            {order.id.slice(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">
                                                    {order.user?.nickname || '未知用户'}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">
                                                    {order.user?.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded border ${order.type === 'points'
                                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                                            : 'bg-violet-50 text-violet-600 border-violet-100'
                                            }`}>
                                            {order.type === 'points' ? '积分充值' : '会员订阅'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-black text-slate-800">
                                            ¥{order.amount.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-medium text-slate-600">
                                            {order.points > 0 ? `+${order.points} PTS` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Calendar size={12} />
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="text-[10px] text-slate-400 pl-4.5">
                                            {new Date(order.createdAt).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {order.status === 'PAID' && (
                                            <button
                                                onClick={() => handleRefund(order)}
                                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                disabled={refundMutation.isPending}
                                            >
                                                {refundMutation.isPending ? '处理中...' : '退款'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {(!data?.orders || data.orders.length === 0) && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">暂无订单数据</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30">
                    <div className="text-sm text-slate-500 font-medium">
                        共 <span className="font-bold text-slate-800">{data?.pagination.total || 0}</span> 条记录
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                            {page} / {data?.pagination.totalPages || 1}
                        </span>
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            disabled={page >= (data?.pagination.totalPages || 1)}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
