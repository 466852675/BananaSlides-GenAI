import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
    ShieldAlert,
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
import { AdminPageHeader } from './shared';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [riskLevelFilter, setRiskLevelFilter] = useState<string>('');
    const [auditDialog, setAuditDialog] = useState<{
        isOpen: boolean;
        action: 'approve' | 'reject' | null;
        adminNote: string;
        isBatch: boolean;
        ids: string[];
    }>({
        isOpen: false,
        action: null,
        adminNote: '',
        isBatch: false,
        ids: []
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
        queryKey: ['admin-refunds', page, statusFilter, startDate, endDate, keyword, minAmount, maxAmount, channelFilter, hasNoteFilter, riskLevelFilter],
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
            riskLevel: riskLevelFilter || undefined,
        }),
    });

    const auditMutation = useMutation({
        mutationFn: ({ id, approved, remark }: { id: string; approved: boolean; remark: string }) =>
            RefundApi.auditRefund(id, approved, remark),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setAuditDialog({ isOpen: false, action: null, adminNote: '', isBatch: false, ids: [] });
            setSelectedIds(new Set());
            setSelectAll(false);
            toast.success('审核处理成功');
        },
        onError: (error: any) => {
            toast.error(`审核失败: ${error.message}`);
        }
    });

    const batchApproveMutation = useMutation({
        mutationFn: async ({ ids, remark }: { ids: string[]; remark: string }) => {
            const results = await Promise.all(
                ids.map(id => RefundApi.auditRefund(id, true, remark || '批量通过'))
            );
            const successCount = results.filter(r => r.success).length;
            return { successCount, failedCount: ids.length - successCount };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setSelectedIds(new Set());
            setSelectAll(false);
            setAuditDialog({ isOpen: false, action: null, adminNote: '', isBatch: false, ids: [] });
            toast.success(`批量通过成功：${data.successCount}笔`);
        },
        onError: (error: any) => {
            toast.error(`批量通过失败: ${error.message}`);
        }
    });

    const batchRejectMutation = useMutation({
        mutationFn: async ({ ids, remark }: { ids: string[]; remark: string }) => {
            const results = await Promise.all(
                ids.map(id => RefundApi.auditRefund(id, false, remark || '批量拒绝'))
            );
            const successCount = results.filter(r => r.success).length;
            return { successCount, failedCount: ids.length - successCount };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            queryClient.invalidateQueries({ queryKey: ['refund-stats'] });
            setSelectedIds(new Set());
            setSelectAll(false);
            setAuditDialog({ isOpen: false, action: null, adminNote: '', isBatch: false, ids: [] });
            toast.success(`批量拒绝成功：${data.successCount}笔`);
        },
        onError: (error: any) => {
            toast.error(`批量拒绝失败: ${error.message}`);
        }
    });

    const handleAudit = (action: 'approve' | 'reject', isBatch = false, item?: RefundApi.RefundRequest) => {
        const ids = isBatch ? Array.from(selectedIds) : (item ? [item.id] : []);
        if (ids.length === 0) return;
        setAuditDialog({ isOpen: true, action, adminNote: '', isBatch, ids });
    };

    const confirmAudit = () => {
        if (!auditDialog.action || auditDialog.ids.length === 0) return;

        if (auditDialog.isBatch) {
            if (auditDialog.action === 'approve') {
                batchApproveMutation.mutate({ ids: auditDialog.ids, remark: auditDialog.adminNote });
            } else {
                batchRejectMutation.mutate({ ids: auditDialog.ids, remark: auditDialog.adminNote });
            }
        } else {
            auditMutation.mutate({
                id: auditDialog.ids[0],
                approved: auditDialog.action === 'approve',
                remark: auditDialog.adminNote
            });
        }
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
        setRiskLevelFilter('');
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
            {/* Header */}
            <AdminPageHeader
                icon={<RotateCcw size={24} />}
                title="退款管理"
                description="审核和处理用户退款申请，管理退款全生命周期。"
                gradient="from-violet-600 to-indigo-600"
                shadowColor="shadow-violet-500/20"
                extraInfo={`Total Refunded: ¥${(stats?.totalAmount || 0).toLocaleString()}`}
            />

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-1 min-w-max">
                    <div className="relative group w-48 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="搜索单号/订单/用户..."
                            value={keyword}
                            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
                        />
                    </div>

                    {/* 风险等级筛选 */}
                    <div className="relative flex-shrink-0">
                        <ShieldAlert className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${riskLevelFilter ? 'text-rose-500' : 'text-slate-400'}`} size={14} />
                        <select
                            value={riskLevelFilter}
                            onChange={(e) => { setRiskLevelFilter(e.target.value); setPage(1); }}
                            className={`pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[100px] ${riskLevelFilter ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-slate-600'}`}
                        >
                            <option value="">风险等级</option>
                            <option value="HIGH">高风险 ({'>'}=70)</option>
                            <option value="MEDIUM">中风险 (30-69)</option>
                            <option value="LOW">低风险 ({'<'}30)</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    {/* 日期聚合岛 */}
                    <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl flex-shrink-0 border border-slate-200/50">
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[100px]"
                            />
                        </div>
                        <span className="text-slate-400 font-bold text-[10px]">→</span>
                        <div className="relative group">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="pl-2 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[100px]"
                            />
                        </div>
                    </div>

                    {/* 金额聚合岛 */}
                    <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl flex-shrink-0 border border-slate-200/50">
                        <div className="relative group">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="number"
                                placeholder="Min ¥"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="pl-6 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[70px]"
                            />
                        </div>
                        <span className="text-slate-400 font-bold text-[10px]">:</span>
                        <div className="relative group">
                            <input
                                type="number"
                                placeholder="Max ¥"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="pl-2 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[70px]"
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


                    <button
                        onClick={handleReset}
                        className="px-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center group flex-shrink-0"
                        title="重置筛选"
                    >
                        <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* 状态快捷标签 (Status Tabs) - 迁移至列表上方 */}
            <div className="flex items-center gap-4">
                <div className="flex items-center p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                    {[
                        { id: '', label: '全部', icon: <RotateCcw size={14} />, count: stats?.totalRefunds ?? 0 },
                        { id: 'PENDING', label: '待审核', icon: <Clock size={14} />, count: stats?.pendingRefunds ?? 0, color: 'text-amber-500', bgColor: 'bg-amber-100' },
                        { id: 'MANUAL_REQUIRED', label: '需人工', icon: <Shield size={14} />, count: stats?.manualRequiredRefunds ?? 0, color: 'text-purple-500', bgColor: 'bg-purple-100' },
                        { id: 'FAILED', label: '退款失败', icon: <AlertCircle size={14} />, count: stats?.failedRefunds ?? 0, color: 'text-red-500', bgColor: 'bg-red-100' },
                        { id: 'PROCESSING', label: '处理中', icon: <RefreshCcw size={14} />, count: stats?.processingRefunds ?? 0 },
                        { id: 'COMPLETED', label: '已完成', icon: <CheckCircle size={14} />, count: stats?.completedRefunds ?? 0, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
                        { id: 'REJECTED', label: '已拒绝', icon: <XCircle size={14} />, count: stats?.rejectedRefunds ?? 0, color: 'text-rose-500', bgColor: 'bg-rose-100' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                            className={`
                                relative px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2.5
                                ${statusFilter === tab.id
                                    ? 'bg-white text-violet-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-102'
                                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                                }
                            `}
                        >
                            <span className={statusFilter === tab.id ? 'text-violet-500' : 'text-slate-400'}>
                                {tab.icon}
                            </span>
                            {tab.label}
                            {typeof tab.count === 'number' && (
                                <span className={`
                                    px-1.5 py-0.5 rounded-md text-[10px] font-black
                                    ${statusFilter === tab.id
                                        ? 'bg-violet-50 text-violet-600'
                                        : `${tab.bgColor || 'bg-slate-200'} ${tab.color || 'text-slate-600'}`
                                    }
                                `}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/*灵动操作栏 (Dynamic Contextual Ribbon) */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 16 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-3 text-white shadow-lg shadow-indigo-500/15 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none" />
                            <div className="relative z-10 flex items-center gap-4 pl-1">
                                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/10">
                                    <Zap size={16} className="text-amber-300 fill-amber-300 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-sm font-black tracking-tight">已选中 {selectedIds.size} 项退款申请</span>
                                        <span className="px-1.5 py-0.5 bg-white/10 rounded-md text-[9px] font-black uppercase tracking-widest border border-white/10">Batch</span>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedIds(new Set()); setSelectAll(false); }}
                                        className="text-[10px] text-indigo-100 hover:text-white font-bold transition-colors flex items-center gap-1 mt-0.5 group"
                                    >
                                        一键取消并重置
                                    </button>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center gap-2 w-full sm:w-auto pr-1">
                                <button
                                    onClick={() => handleAudit('reject', true)}
                                    disabled={batchRejectMutation.isPending}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 bg-white/5 hover:bg-rose-500/30 text-white border border-white/10 rounded-xl text-[11px] font-black transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <XCircle size={14} className="opacity-70" />
                                    拒绝
                                </button>
                                <button
                                    onClick={() => handleAudit('approve', true)}
                                    disabled={batchApproveMutation.isPending}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-white text-indigo-600 rounded-xl text-[11px] font-black hover:bg-white/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    <CheckCircle size={14} strokeWidth={3} />
                                    通过
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">RFD#</span>
                                                        <p className="text-[10px] text-slate-400 font-mono font-bold">{refund.refundNo}</p>
                                                        <span className="text-[10px] text-slate-200 mx-0.5">|</span>
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
                                                    <span className={`text-[13px] font-black leading-tight ${refund.amount >= 500 ? 'text-rose-600' : 'text-violet-600'}`}>
                                                        ¥{refund.amount.toFixed(2)}
                                                    </span>
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
                                                {refund.status !== 'PENDING' && refund.remark && (
                                                    <div className="mt-1 max-w-[120px]">
                                                        <p className="text-[9px] text-slate-400 line-clamp-1 italic" title={refund.remark}>
                                                            “{refund.remark}”
                                                        </p>
                                                    </div>
                                                )}
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
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleAudit('approve', false, refund)}
                                                                className="p-1.5 bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg transition-all shadow-sm"
                                                                title="通过"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleAudit('reject', false, refund)}
                                                                className="p-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all shadow-sm"
                                                                title="拒绝"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDrawerRefundId(refund.id)}
                                                                className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm"
                                                                title="详情"
                                                            >
                                                                <Eye size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDrawerRefundId(refund.id)}
                                                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm"
                                                            title="查看详情"
                                                        >
                                                            <Eye size={14} />
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


            {/* Audit Dialog */}
            <ConfirmDialog
                isOpen={auditDialog.isOpen}
                onCancel={() => setAuditDialog({ isOpen: false, action: null, adminNote: '', isBatch: false, ids: [] })}
                onConfirm={confirmAudit}
                title={auditDialog.isBatch
                    ? (auditDialog.action === 'approve' ? `批量同意退款 (${auditDialog.ids.length}笔)` : `批量拒绝退款 (${auditDialog.ids.length}笔)`)
                    : (auditDialog.action === 'approve' ? '确认同意退款' : '确认拒绝退款')
                }
                message={
                    auditDialog.isBatch
                        ? (auditDialog.action === 'approve'
                            ? `确定要批量同意这 ${auditDialog.ids.length} 笔退款申请吗？系统将自动执行原路退款。`
                            : `确定要批量拒绝这 ${auditDialog.ids.length} 笔退款申请吗？`)
                        : (auditDialog.action === 'approve'
                            ? `同意退款后，系统将自动处理退款，款项将原路返回给用户。是否继续？`
                            : '拒绝退款后，用户将收到拒绝通知。')
                }
                confirmText={auditDialog.action === 'approve' ? '确认同意' : '确认拒绝'}
                cancelText="取消"
                type={auditDialog.action === 'approve' ? 'info' : 'danger'}
                showInput={true}
                inputValue={auditDialog.adminNote}
                onInputChange={(value) => setAuditDialog(prev => ({ ...prev, adminNote: value }))}
                inputPlaceholder={auditDialog.action === 'approve' ? '可选：添加通过备注...' : '请输入拒绝原因 (必填)...'}
                isLoading={auditMutation.isPending || batchApproveMutation.isPending || batchRejectMutation.isPending}
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
