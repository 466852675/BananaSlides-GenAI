import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as RefundApi from '../../api/refund';
import {
    Loader2,
    Search,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCcw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Calendar,
    User,
    DollarSign,
    Eye,
    Check,
    X,
    ArrowLeft
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    PENDING: { 
        label: '待审核', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        icon: <AlertCircle size={16} /> 
    },
    PROCESSING: { 
        label: '处理中', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        icon: <RefreshCcw size={16} className="animate-spin" /> 
    },
    COMPLETED: { 
        label: '已退款', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        icon: <CheckCircle size={16} /> 
    },
    REJECTED: { 
        label: '已拒绝', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        icon: <XCircle size={16} /> 
    },
    FAILED: { 
        label: '退款失败', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        icon: <AlertCircle size={16} /> 
    },
    MANUAL_REQUIRED: { 
        label: '需人工处理', 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50',
        icon: <AlertCircle size={16} /> 
    },
};

export const RefundManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedRefund, setSelectedRefund] = useState<RefundApi.RefundRequest | null>(null);
    const [auditDialog, setAuditDialog] = useState<{
        isOpen: boolean;
        action: 'approve' | 'reject' | null;
        adminNote: string;
    }>({
        isOpen: false,
        action: null,
        adminNote: ''
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['refund-stats'],
        queryFn: RefundApi.getRefundStats,
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-refunds', page, statusFilter, startDate, endDate],
        queryFn: () => RefundApi.getAdminRefunds({
            page,
            limit: 10,
            status: statusFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        }),
    });

    const auditMutation = useMutation({
        mutationFn: ({ id, action, adminNote }: { id: string; action: 'approve' | 'reject'; adminNote: string }) =>
            RefundApi.auditRefund(id, action, adminNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setAuditDialog({ isOpen: false, action: null, adminNote: '' });
            setSelectedRefund(null);
        },
    });

    const handleAudit = (action: 'approve' | 'reject') => {
        if (!selectedRefund) return;
        setAuditDialog({ isOpen: true, action, adminNote: '' });
    };

    const confirmAudit = () => {
        if (!selectedRefund || !auditDialog.action) return;
        auditMutation.mutate({
            id: selectedRefund.id,
            action: auditDialog.action,
            adminNote: auditDialog.adminNote
        });
    };

    const handleReset = () => {
        setPage(1);
        setStatusFilter('');
        setStartDate('');
        setEndDate('');
    };

    const refunds = data?.items || [];
    const pagination = data?.pagination;

    if (selectedRefund) {
        const status = statusConfig[selectedRefund.status] || statusConfig.PENDING;
        return (
            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => setSelectedRefund(null)}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>返回列表</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-800">退款详情</h2>
                                <span className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 ${status.color} ${status.bgColor}`}>
                                    {status.icon}
                                    {status.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-500">订单号</label>
                                        <p className="font-medium text-slate-800">{selectedRefund.orderNo}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">商品名称</label>
                                        <p className="font-medium text-slate-800">{selectedRefund.productName}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-500">退款金额</label>
                                        <p className="font-bold text-orange-600 text-xl">¥{selectedRefund.amount}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-slate-500">申请时间</label>
                                        <p className="font-medium text-slate-800">
                                            {new Date(selectedRefund.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                    {selectedRefund.processedAt && (
                                        <div>
                                            <label className="text-sm text-slate-500">处理时间</label>
                                            <p className="font-medium text-slate-800">
                                                {new Date(selectedRefund.processedAt).toLocaleString('zh-CN')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <label className="text-sm text-slate-500 mb-2 block">退款原因</label>
                                <div className="bg-slate-50 rounded-xl p-4 text-slate-700">
                                    {selectedRefund.reason}
                                </div>
                            </div>

                            {selectedRefund.adminNote && (
                                <div className="mt-6">
                                    <label className="text-sm text-slate-500 mb-2 block">客服备注</label>
                                    <div className="bg-blue-50 rounded-xl p-4 text-blue-800">
                                        {selectedRefund.adminNote}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4">操作</h3>
                            
                            {selectedRefund.status === 'PENDING' ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => handleAudit('approve')}
                                        disabled={auditMutation.isPending}
                                        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Check size={18} />
                                        同意退款
                                    </button>
                                    <button
                                        onClick={() => handleAudit('reject')}
                                        disabled={auditMutation.isPending}
                                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <X size={18} />
                                        拒绝退款
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-slate-500">该退款申请已处理</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                            <h3 className="font-bold mb-4">退款统计</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-indigo-100">今日退款</span>
                                    <span className="font-bold">{stats?.todayRefunds || 0} 笔</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-indigo-100">待审核</span>
                                    <span className="font-bold">{stats?.pendingRefunds || 0} 笔</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-white/20">
                                    <span className="text-indigo-100">累计退款金额</span>
                                    <span className="font-bold">¥{stats?.totalAmount || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={auditDialog.isOpen}
                    onCancel={() => setAuditDialog({ isOpen: false, action: null, adminNote: '' })}
                    onConfirm={confirmAudit}
                    title={auditDialog.action === 'approve' ? '确认同意退款' : '确认拒绝退款'}
                    message={
                        auditDialog.action === 'approve'
                            ? `同意退款后，系统将自动处理退款，¥${selectedRefund.amount} 将原路返回给用户。是否继续？`
                            : '拒绝退款后，用户将收到拒绝通知。'
                    }
                    confirmText={auditDialog.action === 'approve' ? '确认同意' : '确认拒绝'}
                    cancelText="取消"
                    type={auditDialog.action === 'approve' ? 'info' : 'danger'}
                    showInput={true}
                    inputValue={auditDialog.adminNote}
                    onInputChange={(value) => setAuditDialog(prev => ({ ...prev, adminNote: value }))}
                    inputPlaceholder={auditDialog.action === 'approve' ? '可选：添加备注信息...' : '请输入拒绝原因...'}
                />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">退款管理</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                    <p className="text-sm text-slate-500 mb-1">总退款数</p>
                    <p className="text-2xl font-bold text-slate-800">{stats?.totalRefunds || 0}</p>
                </div>
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                    <p className="text-sm text-amber-600 mb-1">待审核</p>
                    <p className="text-2xl font-bold text-amber-700">{stats?.pendingRefunds || 0}</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                    <p className="text-sm text-green-600 mb-1">已完成</p>
                    <p className="text-2xl font-bold text-green-700">{stats?.completedRefunds || 0}</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">今日退款</p>
                    <p className="text-2xl font-bold text-blue-700">{stats?.todayRefunds || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-slate-700 mb-1">状态筛选</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                            <option value="">全部状态</option>
                            <option value="PENDING">待审核</option>
                            <option value="PROCESSING">处理中</option>
                            <option value="COMPLETED">已退款</option>
                            <option value="REJECTED">已拒绝</option>
                            <option value="FAILED">退款失败</option>
                            <option value="MANUAL_REQUIRED">需人工处理</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">开始日期</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">结束日期</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                    >
                        重置筛选
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">订单信息</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">退款金额</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">状态</th>
                                <th className="px-4 py-3 text-left text-sm font-bold text-slate-700">申请时间</th>
                                <th className="px-4 py-3 text-right text-sm font-bold text-slate-700">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center">
                                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : refunds.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-16 text-center text-slate-500">
                                        暂无退款记录
                                    </td>
                                </tr>
                            ) : (
                                refunds.map((refund) => {
                                    const status = statusConfig[refund.status] || statusConfig.PENDING;
                                    return (
                                        <tr key={refund.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-slate-800">{refund.productName}</p>
                                                    <p className="text-xs text-slate-400">{refund.orderNo}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-bold text-slate-800">¥{refund.amount}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${status.color} ${status.bgColor}`}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {new Date(refund.createdAt).toLocaleString('zh-CN')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => setSelectedRefund(refund)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Eye size={14} />
                                                    查看
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200">
                        <p className="text-sm text-slate-500">
                            共 {pagination.total} 条记录，第 {page} / {pagination.totalPages} 页
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
