import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { Order } from '../../api/admin';
import { Loader2, Search, CheckCircle, XCircle, RefreshCcw, AlertCircle, Eye } from 'lucide-react';

export const OrderManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');

    // Fetch orders
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-orders', page, statusFilter, typeFilter],
        queryFn: () => AdminApi.getOrders({
            page,
            pageSize: 20,
            status: statusFilter || undefined,
            type: typeFilter || undefined
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">已支付</span>;
            case 'PENDING': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待支付</span>;
            case 'REFUNDED': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">已退款</span>;
            case 'FAILED': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">失败</span>;
            default: return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" /></div>;
    if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2"><AlertCircle size={20} /> 加载失败: {(error as any).message}</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">订单管理</h2>
                <div className="flex gap-2">
                    <select
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">全部状态</option>
                        <option value="PAID">已支付</option>
                        <option value="PENDING">待支付</option>
                        <option value="REFUNDED">已退款</option>
                        <option value="FAILED">失败</option>
                    </select>
                    <select
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">全部类型</option>
                        <option value="points">积分充值</option>
                        <option value="subscription">会员订阅</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                        <tr>
                            <th className="px-4 py-3">订单号</th>
                            <th className="px-4 py-3">用户</th>
                            <th className="px-4 py-3">类型</th>
                            <th className="px-4 py-3">金额</th>
                            <th className="px-4 py-3">内容</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">时间</th>
                            <th className="px-4 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data?.orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}...</td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{order.user?.nickname || '未知用户'}</span>
                                        <span className="text-xs text-gray-400">{order.user?.email}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {order.type === 'points' ? '积分充值' : '会员订阅'}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                    ¥{order.amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                    {order.points > 0 ? `+${order.points} 积分` : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    {getStatusBadge(order.status)}
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-xs">
                                    {new Date(order.createdAt).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {order.status === 'PAID' && (
                                        <button
                                            onClick={() => handleRefund(order)}
                                            className="text-red-600 hover:text-red-800 text-xs font-medium hover:underline disabled:opacity-50"
                                            disabled={refundMutation.isPending}
                                        >
                                            退款
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {(!data?.orders || data.orders.length === 0) && (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                    暂无订单数据
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
                <span className="text-xs text-gray-500">
                    共 {data?.pagination.total || 0} 条记录
                </span>
                <div className="flex gap-2">
                    <button
                        className="px-3 py-1 border border-gray-200 rounded text-xs hover:bg-white disabled:opacity-50"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        上一页
                    </button>
                    <span className="px-2 py-1 text-xs text-gray-600">
                        {page} / {data?.pagination.totalPages || 1}
                    </span>
                    <button
                        className="px-3 py-1 border border-gray-200 rounded text-xs hover:bg-white disabled:opacity-50"
                        disabled={page >= (data?.pagination.totalPages || 1)}
                        onClick={() => setPage(p => p + 1)}
                    >
                        下一页
                    </button>
                </div>
            </div>
        </div>
    );
};
