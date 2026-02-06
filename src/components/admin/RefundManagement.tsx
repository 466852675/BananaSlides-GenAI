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
    ArrowLeft,
    RotateCcw,
    Shield,
    Clock,
    Receipt,
    SquareCheck,
    Trash2,
    MoreHorizontal
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    PENDING: { 
        label: '待审核', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        icon: <AlertCircle size={14} /> 
    },
    PROCESSING: { 
        label: '处理中', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        icon: <RefreshCcw size={14} className="animate-spin" /> 
    },
    COMPLETED: { 
        label: '已退款', 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50',
        icon: <CheckCircle size={14} /> 
    },
    REJECTED: { 
        label: '已拒绝', 
        color: 'text-rose-600', 
        bgColor: 'bg-rose-50',
        icon: <XCircle size={14} /> 
    },
    FAILED: { 
        label: '退款失败', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
        icon: <AlertCircle size={14} /> 
    },
    MANUAL_REQUIRED: { 
        label: '需人工处理', 
        color: 'text-purple-600', 
        bgColor: 'bg-purple-50',
        icon: <Shield size={14} /> 
    },
};

export const RefundManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [keyword, setKeyword] = useState('');
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

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['refund-stats'],
        queryFn: RefundApi.getRefundStats,
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-refunds', page, statusFilter, startDate, endDate, keyword],
        queryFn: () => RefundApi.getAdminRefunds({
            page,
            limit: 10,
            status: statusFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            keyword: keyword || undefined,
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
            setSelectedIds(new Set());
            setSelectAll(false);
        },
    });

    const batchApproveMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.all(
                ids.map(id => RefundApi.auditRefund(id, 'approve', '批量通过'))
            );
            const successCount = results.filter(r => r.success).length;
            return { successCount, failedCount: ids.length - successCount };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setSelectedIds(new Set());
            setSelectAll(false);
            alert(`批量通过成功：${data.successCount}笔`);
        },
    });

    const batchRejectMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const results = await Promise.all(
                ids.map(id => RefundApi.auditRefund(id, 'reject', '批量拒绝'))
            );
            const successCount = results.filter(r => r.success).length;
            return { successCount, failedCount: ids.length - successCount };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setSelectedIds(new Set());
            setSelectAll(false);
            alert(`批量拒绝成功：${data.successCount}笔`);
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
        setKeyword('');
        setSelectedIds(new Set());
        setSelectAll(false);
    };

    const handleSelectRow = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        setSelectAll(selectedIds.size === refunds.length);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds(new Set());
            setSelectAll(false);
        } else {
            setSelectedIds(new Set(refunds.map(r => r.id)));
            setSelectAll(true);
        }
    };

    const refunds = data?.items || [];
    const pagination = data?.pagination;

    // 详情视图
    if (selectedRefund) {
        const status = statusConfig[selectedRefund.status] || statusConfig.PENDING;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setSelectedRefund(null)}
                                className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight mb-1">退款详情</h2>
                                <p className="text-indigo-100 font-medium opacity-90 whitespace-nowrap">
                                    订单号: {selectedRefund.orderNo}
                                </p>
                            </div>
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${status.color} ${status.bgColor} shadow-sm`}>
                            {status.icon}
                            {status.label}
                        </span>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100/60 bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Receipt size={18} className="text-violet-500" />
                                    退款信息
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">商品名称</label>
                                            <p className="text-sm font-bold text-slate-800 mt-1">{selectedRefund.productName}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">退款金额</label>
                                            <p className="text-2xl font-black text-violet-600 mt-1">¥{selectedRefund.amount.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">申请时间</label>
                                            <p className="text-sm font-bold text-slate-800 mt-1">
                                                {new Date(selectedRefund.createdAt).toLocaleString('zh-CN')}
                                            </p>
                                        </div>
                                        {selectedRefund.processedAt && (
                                            <div>
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">处理时间</label>
                                                <p className="text-sm font-bold text-slate-800 mt-1">
                                                    {new Date(selectedRefund.processedAt).toLocaleString('zh-CN')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">退款原因</label>
                                    <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-medium">
                                        {selectedRefund.reason}
                                    </div>
                                </div>

                                {selectedRefund.adminNote && (
                                    <div className="mt-4">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">客服备注</label>
                                        <div className="mt-2 p-4 bg-blue-50 rounded-xl text-sm text-blue-800 font-medium border border-blue-100">
                                            {selectedRefund.adminNote}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Actions */}
                    <div className="space-y-6">
                        {/* Action Card */}
                        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100/60 bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <Shield size={16} className="text-violet-500" />
                                    审核操作
                                </h3>
                            </div>
                            <div className="p-6">
                                {selectedRefund.status === 'PENDING' ? (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleAudit('approve')}
                                            disabled={auditMutation.isPending}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Check size={18} />
                                            同意退款
                                        </button>
                                        <button
                                            onClick={() => handleAudit('reject')}
                                            disabled={auditMutation.isPending}
                                            className="w-full py-3 px-4 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <X size={18} />
                                            拒绝退款
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${statusConfig[selectedRefund.status]?.bgColor || 'bg-slate-100'}`}>
                                            {statusConfig[selectedRefund.status]?.icon || <AlertCircle size={24} className="text-slate-400" />}
                                        </div>
                                        <p className="text-slate-500 font-medium">该退款申请已{statusConfig[selectedRefund.status]?.label || '处理'}</p>
                                        <p className="text-xs text-slate-400 mt-1">无需进一步操作</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <RefreshCcw size={18} />
                                退款统计
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-indigo-100 text-sm">今日退款</span>
                                    <span className="font-bold text-lg">{stats?.todayRefunds || 0} <span className="text-sm font-normal text-indigo-200">笔</span></span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-indigo-100 text-sm">待审核</span>
                                    <span className="font-bold text-lg text-amber-300">{stats?.pendingRefunds || 0} <span className="text-sm font-normal text-indigo-200">笔</span></span>
                                </div>
                                <div className="pt-3 border-t border-white/20">
                                    <div className="flex justify-between items-center">
                                        <span className="text-indigo-100 text-sm">累计退款金额</span>
                                        <span className="font-bold text-xl">¥{(stats?.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Dialog */}
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

    // List View
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">退款管理</h2>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                审核和处理用户退款申请，管理退款流程。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-1 min-w-max">
                    <div className="relative group w-48 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="搜索订单/用户..."
                            value={keyword}
                            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="relative flex-shrink-0">
                        <AlertCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[100px]"
                        >
                            <option value="">全部状态</option>
                            <option value="PENDING">待审核</option>
                            <option value="PROCESSING">处理中</option>
                            <option value="COMPLETED">已退款</option>
                            <option value="REJECTED">已拒绝</option>
                            <option value="FAILED">退款失败</option>
                            <option value="MANUAL_REQUIRED">需人工处理</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                        <span className="text-slate-300 font-bold text-[10px]">-</span>
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                    </div>

                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
                            <span className="text-xs font-bold text-slate-600">已选 {selectedIds.size} 项</span>
                            <button
                                onClick={() => batchApproveMutation.mutate(Array.from(selectedIds))}
                                disabled={batchApproveMutation.isPending}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all disabled:opacity-50"
                            >
                                <Check size={12} />
                                批量通过
                            </button>
                            <button
                                onClick={() => batchRejectMutation.mutate(Array.from(selectedIds))}
                                disabled={batchRejectMutation.isPending}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all disabled:opacity-50"
                            >
                                <X size={12} />
                                批量拒绝
                            </button>
                            <button
                                onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-all"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        className="px-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center group flex-shrink-0"
                        title="重置筛选"
                    >
                        <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[520px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="text-center px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 focus:ring-2 focus:ring-violet-500"
                                    />
                                </th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">订单信息</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">退款金额</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">状态</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">申请时间</th>
                                <th className="text-right text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <div className="relative mx-auto w-12 h-12">
                                            <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                                            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : refunds.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-16 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                                            <RefreshCcw size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-slate-500 font-medium">暂无退款记录</p>
                                    </td>
                                </tr>
                            ) : (
                                refunds.map((refund) => {
                                    const status = statusConfig[refund.status] || statusConfig.PENDING;
                                    const isSelected = selectedIds.has(refund.id);
                                    return (
                                        <tr key={refund.id} className={`group hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-100/20' : ''}`}>
                                            <td className="text-center px-3 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(refund.id)}
                                                    className="w-4 h-4 rounded border-slate-300 focus:ring-2 focus:ring-violet-500"
                                                />
                                            </td>
                                            <td className="px-3 py-3">
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800">{refund.productName}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{refund.orderNo}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="text-[14px] font-black text-violet-600">¥{refund.amount.toFixed(2)}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${status.color} ${status.bgColor} border-opacity-20`}>
                                                    {status.icon}
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col whitespace-nowrap leading-tight">
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                        <Calendar size={10} />
                                                        {new Date(refund.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 pl-3.5">
                                                        {new Date(refund.createdAt).toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {refund.status === 'PENDING' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRefund(refund);
                                                                    setAuditDialog({ isOpen: true, action: 'approve', adminNote: '' });
                                                                }}
                                                                disabled={auditMutation.isPending}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                                                            >
                                                                <Check size={12} />
                                                                同意
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRefund(refund);
                                                                    setAuditDialog({ isOpen: true, action: 'reject', adminNote: '' });
                                                                }}
                                                                disabled={auditMutation.isPending}
                                                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                                                            >
                                                                <X size={12} />
                                                                拒绝
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSelectedRefund(refund)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors"
                                                        >
                                                            <Eye size={12} />
                                                            查看
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30">
                        <div className="text-sm text-slate-500 font-medium">
                            显示第 <span className="font-bold text-slate-800">{(page - 1) * 10 + 1}</span> 到 <span className="font-bold text-slate-800">{Math.min(page * 10, pagination.total || 0)}</span> 条，共 <span className="font-bold text-slate-800">{pagination.total || 0}</span> 条
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
                                {page} / {pagination.totalPages || 1}
                            </span>
                            <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                disabled={page >= (pagination.totalPages || 1)}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Dialog */}
            <ConfirmDialog
                isOpen={auditDialog.isOpen}
                onCancel={() => setAuditDialog({ isOpen: false, action: null, adminNote: '' })}
                onConfirm={confirmAudit}
                title={auditDialog.action === 'approve' ? '确认同意退款' : '确认拒绝退款'}
                message={
                    auditDialog.action === 'approve'
                        ? `同意退款后，系统将自动处理退款，款项将原路返回给用户。是否继续？`
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
};

export default RefundManagement;
