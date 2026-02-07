import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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
    MoreHorizontal,
    Wallet,
    FileText,
    MessageSquare,
    Zap,
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';
import { RefundDetailDrawer } from './refund/RefundDetailDrawer';

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
    // 退款金额范围筛选
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    // 申请渠道筛选
    const [channelFilter, setChannelFilter] = useState<string>('');
    // 是否有备注筛选
    const [hasNoteFilter, setHasNoteFilter] = useState<string>('');
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
    // [智能决策座舱] 详情抽屉状态
    const [drawerRefundId, setDrawerRefundId] = useState<string | null>(null);

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['refund-stats'],
        queryFn: RefundApi.getRefundStats,
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-refunds', page, statusFilter, startDate, endDate, keyword, minAmount, maxAmount, channelFilter, hasNoteFilter],
        queryFn: () => RefundApi.getAdminRefunds({
            page,
            limit: 10,
            status: statusFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            keyword: keyword || undefined,
            minAmount: minAmount ? parseFloat(minAmount) : undefined,
            maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
            channel: channelFilter || undefined,
            hasNote: hasNoteFilter === 'yes' ? true : hasNoteFilter === 'no' ? false : undefined,
        }),
    });

    const auditMutation = useMutation({
        mutationFn: ({ id, approved, remark }: { id: string; approved: boolean; remark: string }) =>
            RefundApi.auditRefund(id, approved, remark),
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
                ids.map(id => RefundApi.auditRefund(id, true, '批量通过'))
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
                ids.map(id => RefundApi.auditRefund(id, false, '批量拒绝'))
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
            approved: auditDialog.action === 'approve',
            remark: auditDialog.adminNote
        });
    };

    const handleReset = () => {
        setPage(1);
        setStatusFilter('');
        setStartDate('');
        setEndDate('');
        setKeyword('');
        setMinAmount('');
        setMaxAmount('');
        setChannelFilter('');
        setHasNoteFilter('');
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

                    {/* 退款金额范围筛选 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative group">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="number"
                                placeholder="最小金额"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="pl-6 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[80px]"
                            />
                        </div>
                        <span className="text-slate-300 font-bold text-[10px]">-</span>
                        <div className="relative group">
                            <input
                                type="number"
                                placeholder="最大金额"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="pl-2 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none hover:bg-white transition-all w-[80px]"
                            />
                        </div>
                    </div>

                    {/* 申请渠道筛选 */}
                    <div className="relative flex-shrink-0">
                        <Wallet className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <select
                            value={channelFilter}
                            onChange={(e) => { setChannelFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[90px]"
                        >
                            <option value="">全部渠道</option>
                            <option value="wechat">微信</option>
                            <option value="alipay">支付宝</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={8} />
                        </div>
                    </div>

                    {/* 是否有备注筛选 */}
                    <div className="relative flex-shrink-0">
                        <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <select
                            value={hasNoteFilter}
                            onChange={(e) => { setHasNoteFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[90px]"
                        >
                            <option value="">备注状态</option>
                            <option value="yes">有备注</option>
                            <option value="no">无备注</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={8} />
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
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">用户信息</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">订单/商品</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">金额/渠道</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">风控</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">状态</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">申请时间</th>
                                <th className="text-right text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="relative mx-auto w-12 h-12">
                                            <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                                            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : refunds.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
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
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-sm overflow-hidden">
                                                        {refund.userNickname ? (
                                                            <span className="text-[10px] font-black">{refund.userNickname.charAt(0).toUpperCase()}</span>
                                                        ) : (
                                                            <User size={14} />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-black text-slate-800 truncate leading-tight">
                                                            {refund.userNickname || (refund.userEmail ? refund.userEmail.replace(/(.{2}).+(.{2})@/, "$1***$2@") : '未知用户')}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 truncate leading-tight">{refund.userEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">{refund.productName}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-[10px] text-slate-400 font-mono">{refund.orderNo}</p>
                                                    </div>
                                                    <div className="mt-1 flex items-start gap-1 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                                                        <MessageSquare size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                                        <span className="text-[10px] text-slate-500 line-clamp-1" title={refund.reason}>{refund.reason}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-violet-600 leading-tight">¥{refund.amount.toFixed(2)}</span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {refund.paymentMethod === 'wechat' ? (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                                                <Wallet size={10} />
                                                                <span className="text-[9px] font-bold">微信</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                                                <Wallet size={10} />
                                                                <span className="text-[9px] font-bold">支付宝</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {refund.riskLevel === 'HIGH' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100 text-[10px] font-black">
                                                            <Shield size={10} />
                                                            HIGH RISK
                                                        </span>
                                                    ) : refund.riskLevel === 'MEDIUM' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100 text-[10px] font-black">
                                                            <Shield size={10} />
                                                            MEDIUM
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black">
                                                            <SquareCheck size={10} />
                                                            SAFE
                                                        </span>
                                                    )}
                                                    <span className="text-[9px] text-slate-400 pl-1 font-bold">Score: {refund.userRiskScore ?? '--'}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border ${status.color} ${status.bgColor} border-opacity-20 whitespace-nowrap`}>
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
                                                <div className="flex items-center justify-end gap-1 transition-all">
                                                    {refund.status === 'PENDING' ? (
                                                        <button
                                                            onClick={() => setDrawerRefundId(refund.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-all shadow-sm shadow-violet-200 text-xs font-bold"
                                                        >
                                                            <Zap size={13} fill="currentColor" />
                                                            去处理
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDrawerRefundId(refund.id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all border border-slate-200 text-xs font-medium"
                                                        >
                                                            <Eye size={13} />
                                                            详情
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
                {pagination && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30">
                        {/* 统计信息 - 始终显示 */}
                        <div className="text-sm text-slate-500 font-medium">
                            显示第 <span className="font-bold text-slate-800">{(page - 1) * 10 + 1}</span> 到 <span className="font-bold text-slate-800">{Math.min(page * 10, pagination.total || 0)}</span> 条，共 <span className="font-bold text-slate-800">{pagination.total || 0}</span> 条
                        </div>
                        {/* 分页控件 - 多页时才显示 */}
                        {pagination.totalPages > 1 && (
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
                        )}
                    </div>
                )}
            </div>

            {/* Refund Detail Side Drawer */}
            {selectedRefund && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedRefund(null)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                    <RotateCcw size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">退款申请详情</h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Refund Request details</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${statusConfig[selectedRefund.status]?.color} ${statusConfig[selectedRefund.status]?.bgColor} border-current/10`}>
                                            {statusConfig[selectedRefund.status]?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedRefund(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32 custom-scrollbar">
                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                                <div className="relative z-10">
                                    <div className="text-xs font-bold text-indigo-100 uppercase tracking-[0.2em] mb-4 opacity-70">Transaction Summary</div>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-4xl font-black tracking-tighter">¥{selectedRefund.amount.toFixed(2)}</span>
                                        <span className="text-indigo-200 text-sm font-bold tracking-widest uppercase">Refund Amount</span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 mt-6">
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 min-w-[140px]">
                                            <div className="text-[10px] text-indigo-200 font-bold uppercase mb-1">Order No</div>
                                            <div className="text-sm font-mono font-bold tracking-tight">{selectedRefund.orderNo}</div>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 min-w-[140px]">
                                            <div className="text-[10px] text-indigo-200 font-bold uppercase mb-1">Product</div>
                                            <div className="text-sm font-bold tracking-tight">{selectedRefund.productName}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info Sections */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Details */}
                                <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                            <Receipt size={18} strokeWidth={2.5} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">申请详情 (Request)</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">支付方式</span>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs font-black text-slate-700 border border-slate-100">
                                                <Wallet size={14} className="text-slate-400" />
                                                {selectedRefund.paymentMethod === 'wechat' ? '微信支付' : '支付宝'}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">申请时间</span>
                                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs font-black text-slate-700 border border-slate-100">
                                                <Clock size={14} className="text-slate-400" />
                                                {new Date(selectedRefund.createdAt).toLocaleString('zh-CN')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status History */}
                                <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                                            <Shield size={18} strokeWidth={2.5} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">审核状态 (Process)</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">当前状态</span>
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border ${statusConfig[selectedRefund.status]?.bgColor} ${statusConfig[selectedRefund.status]?.color} border-current/10`}>
                                                {statusConfig[selectedRefund.status]?.icon}
                                                {statusConfig[selectedRefund.status]?.label}
                                            </div>
                                        </div>
                                        {selectedRefund.processedAt && (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">处理时间</span>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs font-black text-slate-700 border border-slate-100">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {new Date(selectedRefund.processedAt).toLocaleString('zh-CN')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Reason & Notes */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                            <FileText size={18} strokeWidth={2.5} />
                                        </div>
                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">退款原因 (Reason)</h4>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-700 font-medium leading-relaxed border border-slate-100">
                                        {selectedRefund.reason}
                                    </div>
                                </div>

                                {selectedRefund.remark && (
                                    <div className="bg-blue-50/50 rounded-[2rem] border border-blue-100 p-8 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-sm">
                                                <MessageSquare size={16} />
                                            </div>
                                            <h4 className="text-[11px] font-black text-blue-800 uppercase tracking-widest">客服审核备注 (Admin Feedback)</h4>
                                        </div>
                                        <div className="p-4 bg-white rounded-2xl text-sm text-blue-900 font-bold leading-relaxed border border-blue-200 shadow-sm">
                                            {selectedRefund.remark}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer - Sticky */}
                        <div className="px-8 py-6 border-t border-slate-100 bg-white/80 backdrop-blur-xl flex items-center gap-4 shrink-0 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] sticky bottom-0 z-10 rounded-t-[2.5rem]">
                            {selectedRefund.status === 'PENDING' ? (
                                <>
                                    <button
                                        onClick={() => handleAudit('reject')}
                                        disabled={auditMutation.isPending}
                                        className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-600 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                                    >
                                        <X size={18} />
                                        拒绝退款
                                    </button>
                                    <button
                                        onClick={() => handleAudit('approve')}
                                        disabled={auditMutation.isPending}
                                        className="flex-[2] py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-emerald-500/25 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} strokeWidth={3} />
                                        同意并立即原路退回
                                    </button>
                                </>
                            ) : (
                                <div className="flex items-center gap-3 text-slate-400 font-black uppercase tracking-widest text-xs w-full justify-center py-2">
                                    <Shield size={18} className="text-slate-400" />
                                    <span>工单已处理 (Closed) - 查看详情完毕</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

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

            {/* [智能决策座舱] 退款详情抽屉 */}
            <RefundDetailDrawer
                refundId={drawerRefundId}
                isOpen={!!drawerRefundId}
                onClose={() => setDrawerRefundId(null)}
                onAuditSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['adminRefunds'] });
                    setDrawerRefundId(null);
                }}
            />
        </div>
    );
};

export default RefundManagement;
