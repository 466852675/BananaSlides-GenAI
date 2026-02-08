// ============================================================
// [智能决策座舱] 退款详情抽屉组件
// ============================================================

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    CreditCard,
    TrendingUp,
    Activity,
    Zap,
    Shield,
    AlertOctagon,
    ChevronRight,
    Package,
    Calendar,
    Coins,
    FileText,
    Sparkles,
    BarChart3,
    RotateCcw,
    RefreshCcw,
    LayoutDashboard,
    UserCircle2,
    History,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAdminRefundDetail, auditRefund, retryRefund, syncRefundStatus, AdminRefundDetailAggregated } from '../../../api/refund';
import { RefundTimeline } from './RefundTimeline';
import { ConfirmDialog } from '../../ConfirmDialog';
import { AdminDrawer } from '../shared';

// ============================================================
// 类型定义
// ============================================================

interface RefundDetailDrawerProps {
    refundId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onAuditSuccess?: () => void;
}

// ============================================================
// 子组件：AI 智能建议面板
// ============================================================

const AiSuggestionPanel: React.FC<{ suggestion: AdminRefundDetailAggregated['aiSuggestion'] }> = ({ suggestion }) => {
    const confidenceConfig = {
        HIGH: { color: 'emerald', icon: CheckCircle2, label: '高置信度', variant: 'info' as const },
        MEDIUM: { color: 'amber', icon: AlertTriangle, label: '中置信度', variant: 'warning' as const },
        LOW: { color: 'rose', icon: AlertOctagon, label: '低置信度', variant: 'danger' as const },
    };
    const config = confidenceConfig[suggestion.confidence];
    const Icon = config.icon;

    return (
        <AdminDrawer.Card variant={config.variant} className="border-2">
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0`}>
                    <Sparkles className={`text-${config.color}-500`} size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">AI 智能审核建议</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black bg-${config.color}-100 text-${config.color}-700 flex items-center gap-1 uppercase tracking-tighter`}>
                            <Icon size={12} />
                            {config.label}
                        </span>
                    </div>
                    <p className={`text-lg font-black text-${config.color}-600 mb-2`}>{suggestion.verdict}</p>
                    <p className="text-xs text-slate-500 leading-relaxed font-bold">{suggestion.explanation}</p>
                </div>
            </div>
        </AdminDrawer.Card>
    );
};

// ============================================================
// 子组件：行为时光轴
// ============================================================

const BehaviorTimeline: React.FC<{ behavior: AdminRefundDetailAggregated['behaviorContext'] }> = ({ behavior }) => {
    const [showAll, setShowAll] = useState(false);
    const displayItems = showAll ? behavior.consumptionHistory : behavior.consumptionHistory.slice(0, 5);

    return (
        <AdminDrawer.Section title="行为特征溯源" description="Recent behavioral context & footprints" icon={Activity}>
            <AdminDrawer.Card>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">24h 内操作</span>
                        </div>
                        <p className={`text-2xl font-black ${behavior.last24hActivityCount >= 10 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {behavior.last24hActivityCount} <span className="text-xs text-slate-400">Times</span>
                        </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">24h 内消耗</span>
                        </div>
                        <p className="text-2xl font-black text-slate-800">
                            {behavior.last24hConsumedPoints} <span className="text-xs text-slate-400">Pts</span>
                        </p>
                    </div>
                </div>

                {displayItems.length > 0 ? (
                    <div className="space-y-3">
                        {displayItems.map((item, index) => (
                            <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-400">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{item.action || 'Unknown'}</span>
                                        <span className="text-xs font-black text-rose-500 shrink-0">-{item.points} Pts</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate font-bold">{item.description || 'No description'}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                                        {format(new Date(item.timestamp), 'MM-dd HH:mm', { locale: zhCN })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {behavior.consumptionHistory.length > 5 && (
                            <button
                                onClick={() => setShowAll(!showAll)}
                                className="w-full py-2 mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-1"
                            >
                                {showAll ? 'Collapse' : `View All ${behavior.consumptionHistory.length} Records`}
                                <ChevronRight size={14} className={`transition-transform duration-300 ${showAll ? '-rotate-90' : 'rotate-90'}`} />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <Activity size={32} className="mx-auto mb-2 text-slate-200" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No consumption records</p>
                    </div>
                )}
            </AdminDrawer.Card>
        </AdminDrawer.Section>
    );
};

// ============================================================
// 主组件：退款详情抽屉
// ============================================================

export const RefundDetailDrawer: React.FC<RefundDetailDrawerProps> = ({
    refundId,
    isOpen,
    onClose,
    onAuditSuccess,
}) => {
    const [auditRemark, setAuditRemark] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditConfirmState, setAuditConfirmState] = useState<{
        isOpen: boolean;
        action: 'approve' | 'reject' | null;
    }>({
        isOpen: false,
        action: null,
    });

    // 获取退款详情
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['adminRefundDetail', refundId],
        queryFn: () => getAdminRefundDetail(refundId!),
        enabled: !!refundId && isOpen,
    });

    // 审核操作
    const handleAuditExecution = async () => {
        const action = auditConfirmState.action;
        if (!refundId || !action) return;
        setIsAuditing(true);
        try {
            const result = await auditRefund(refundId, action === 'approve', auditRemark);
            if (result.success) {
                setAuditConfirmState({ isOpen: false, action: null });
                onAuditSuccess?.();
                onClose();
                toast.success('审核处理成功');
            }
        } catch (error: any) {
            console.error('审核失败:', error);
            toast.error(`审核失败: ${error.message}`);
        } finally {
            setIsAuditing(false);
        }
    };

    // 手动重试退款
    const handleRetry = async () => {
        if (!refundId) return;
        setIsAuditing(true);
        try {
            const result = await retryRefund(refundId);
            if (result.success) {
                refetch();
                onAuditSuccess?.();
                toast.success('已发起重新退款');
            } else {
                toast.error(`重试失败: ${result.message}`);
            }
        } catch (error: any) {
            console.error('重试失败:', error);
            toast.error(`重试发生错误: ${error.message}`);
        } finally {
            setIsAuditing(false);
        }
    };

    // 同步退款状态
    const handleSync = async () => {
        if (!refundId) return;
        setIsAuditing(true);
        try {
            const result = await syncRefundStatus(refundId);
            if (result.success) {
                refetch();
                onAuditSuccess?.();
                toast.success('状态同步成功');
            } else {
                toast.error(`同步失败: ${result.message}`);
            }
        } catch (error: any) {
            console.error('同步失败:', error);
            toast.error(`同步发生错误: ${error.message}`);
        } finally {
            setIsAuditing(false);
        }
    };

    const auditFooter = data?.refund?.status ? (
        <div className="space-y-4">
            {data.refund.status === 'PENDING' ? (
                <>
                    <div className="relative group">
                        <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <textarea
                            value={auditRemark}
                            onChange={(e) => setAuditRemark(e.target.value)}
                            placeholder="输入审核备注（可选）..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all placeholder:text-slate-400 min-h-[80px] resize-none"
                            rows={2}
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setAuditConfirmState({ isOpen: true, action: 'reject' })}
                            disabled={isAuditing}
                            className="flex-1 px-6 py-3.5 rounded-2xl border-2 border-slate-100 text-rose-500 font-black text-[10px] tracking-widest uppercase hover:bg-rose-50 hover:border-rose-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <XCircle size={16} strokeWidth={3} />
                            拒绝退款申请
                        </button>
                        <button
                            onClick={() => setAuditConfirmState({ isOpen: true, action: 'approve' })}
                            disabled={isAuditing}
                            className="flex-1 px-6 py-3.5 rounded-2xl bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={16} strokeWidth={3} />
                            批准原路退款
                        </button>
                    </div>
                </>
            ) : data.refund.status === 'FAILED' ? (
                <div className="flex gap-3">
                    <button
                        onClick={handleRetry}
                        disabled={isAuditing}
                        className="flex-1 px-6 py-3.5 rounded-2xl bg-rose-500 text-white font-black text-[10px] tracking-widest uppercase hover:bg-rose-600 transition-all disabled:opacity-50 shadow-xl shadow-rose-200 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} strokeWidth={3} />
                        异常手工重试
                    </button>
                    <button
                        onClick={handleSync}
                        disabled={isAuditing}
                        className="flex-1 px-6 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-[10px] tracking-widest uppercase hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <RefreshCcw size={16} strokeWidth={3} />
                        同步第三方状态
                    </button>
                </div>
            ) : data.refund.status === 'PROCESSING' ? (
                <button
                    onClick={handleSync}
                    disabled={isAuditing}
                    className="w-full px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                >
                    <RefreshCcw size={16} strokeWidth={3} />
                    同步实时支付状态
                </button>
            ) : (
                <div className="text-center py-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        Process Terminated · Status: {
                            data.refund.status === 'COMPLETED' ? 'Refunded' :
                                data.refund.status === 'REJECTED' ? 'Rejected' :
                                    data.refund.status
                        }
                    </span>
                </div>
            )}
        </div>
    ) : null;

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="智能决策座舱"
            description="Decision Intelligence Hub & Audit Pipeline"
            width="wide"
            footer={auditFooter}
            headerExtra={
                data?.refund && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${data.refund.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        data.refund.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                            data.refund.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                data.refund.status === 'FAILED' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                    'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                        {data.refund.status}
                    </span>
                )
            }
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-indigo-600 border-t-transparent" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Initializing cockpit...</p>
                </div>
            ) : error ? (
                <div className="p-8 text-center flex flex-col items-center">
                    <AlertOctagon size={48} className="text-rose-500 mb-4 opacity-50" />
                    <p className="text-sm font-black text-slate-600 uppercase tracking-widest">Initialization Failed</p>
                    <button onClick={() => refetch()} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Retry</button>
                </div>
            ) : data ? (
                <div className="space-y-6">
                    {/* User Identity Section */}
                    <AdminDrawer.HeadCard
                        title={data.userProfile.nickname || data.userProfile.email || 'Anonymous'}
                        description={data.userProfile.email || 'No email attached'}
                        icon={UserCircle2}
                        variant="dark"
                    >
                        <div className="grid grid-cols-4 gap-3 mt-6">
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                                <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-tighter">Account Age</p>
                                <p className="text-sm font-black text-white">{data.userProfile.accountAgeDays} D</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                                <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-tighter">VIP Level</p>
                                <p className="text-sm font-black text-white">Lv.{data.userProfile.vipLevel}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                                <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-tighter">Points</p>
                                <p className="text-sm font-black text-white">{data.userProfile.currentPoints}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-center">
                                <p className="text-[9px] text-white/40 font-black uppercase mb-1 tracking-tighter">Risk Score</p>
                                <p className={`text-sm font-black ${data.userProfile.riskScore >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {data.userProfile.riskScore}
                                </p>
                            </div>
                        </div>
                    </AdminDrawer.HeadCard>

                    {/* AI Suggestion - Critical */}
                    <AiSuggestionPanel suggestion={data.aiSuggestion} />

                    {/* Request Details */}
                    <AdminDrawer.Section title="退款申请详情" description="Order & request verification" icon={FileText}>
                        <AdminDrawer.Card className="space-y-4">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                <AdminDrawer.KeyValue label="退款流水号" value={data.refund.refundNo} />
                                <AdminDrawer.KeyValue label="关联订单号" value={data.order.orderNo} />
                                <AdminDrawer.KeyValue label="申请金额" value={`¥${data.refund.amount.toFixed(2)}`} valueClassName="text-rose-600 font-black" />
                                <AdminDrawer.KeyValue label="申请时间" value={format(new Date(data.refund.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })} />
                            </div>
                            <div className="pt-4 border-t border-slate-50">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5 tracking-widest">
                                        <MessageSquare size={12} className="text-indigo-500" /> 用户申诉理由
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-bold italic">
                                        "{data.refund.reason || 'No reason provided'}"
                                    </p>
                                    {data.refund.description && (
                                        <p className="text-[11px] text-slate-400 mt-2 font-medium">{data.refund.description}</p>
                                    )}
                                </div>
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* Equity Audit */}
                    <AdminDrawer.Section title="资产核销分析" description="Order consumption & residual value" icon={LayoutDashboard}>
                        <AdminDrawer.Card>
                            <div className="mb-6">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                                    <span className="text-slate-400">Consumed Value</span>
                                    <span className="text-slate-700">¥{data.equityAudit.consumedValue.toFixed(2)} / ¥{data.equityAudit.orderAmount.toFixed(2)}</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-1000 shadow-sm"
                                        style={{ width: `${Math.min(100, (data.equityAudit.consumedValue / data.equityAudit.orderAmount) * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-2 uppercase">
                                    <span>{((data.equityAudit.consumedValue / data.equityAudit.orderAmount) * 100).toFixed(1)}% Consumed</span>
                                    <span className="text-emerald-500">Suggested Refund: ¥{data.equityAudit.suggestedRefundAmount.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <AdminDrawer.Card className="text-center py-4 bg-slate-50/50" noPadding>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Points Granted</p>
                                    <p className="text-lg font-black text-slate-800">{data.equityAudit.pointsGranted}</p>
                                </AdminDrawer.Card>
                                <AdminDrawer.Card className="text-center py-4 bg-slate-50/50" noPadding>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Points Used</p>
                                    <p className="text-lg font-black text-slate-800">{data.equityAudit.totalConsumedPoints}</p>
                                </AdminDrawer.Card>
                                <AdminDrawer.Card className="text-center py-4 bg-slate-50/50" noPadding>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Projects Built</p>
                                    <p className="text-lg font-black text-slate-800">{data.equityAudit.projectsCreatedAfterOrder}</p>
                                </AdminDrawer.Card>
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* Risk Assessment */}
                    <AdminDrawer.Section title="合规性风险雷达" description="Security protocols & compliance" icon={Shield}>
                        <AdminDrawer.Card variant={data.riskRadar.riskLevel === 'HIGH' ? 'danger' : data.riskRadar.riskLevel === 'MEDIUM' ? 'warning' : 'info'}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center`}>
                                        <Shield size={18} className={data.riskRadar.riskLevel === 'HIGH' ? 'text-rose-500' : 'text-indigo-500'} />
                                    </div>
                                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Risk Level: {data.riskRadar.riskLevel}</span>
                                </div>
                                {data.riskRadar.canAutoApprove && (
                                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg uppercase tracking-widest">Auto-Approvable</span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {data.riskRadar.riskFactors.map((factor, i) => (
                                    <div key={i} className="flex items-center gap-2 p-3 bg-white/60 rounded-xl border border-white/50 text-[11px] font-bold text-slate-600">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                        {factor}
                                    </div>
                                ))}
                                {data.riskRadar.riskFactors.length === 0 && (
                                    <div className="text-center py-4">
                                        <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">No risk factors identified</p>
                                    </div>
                                )}
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* Behavior Tracker */}
                    <BehaviorTimeline behavior={data.behaviorContext} />

                    {/* Timeline */}
                    <AdminDrawer.Section title="审核流水线 (Logs)" icon={History}>
                        <RefundTimeline history={data.auditHistory} />
                    </AdminDrawer.Section>
                </div>
            ) : null}

            <ConfirmDialog
                isOpen={auditConfirmState.isOpen}
                onCancel={() => setAuditConfirmState({ isOpen: false, action: null })}
                onConfirm={handleAuditExecution}
                title={auditConfirmState.action === 'approve' ? '确认批准退款申请' : '确认拒绝退款申请'}
                message={auditConfirmState.action === 'approve'
                    ? '您确定要批准这笔退款吗？资金将尝试通过原支付渠道退回，且不可撤销。'
                    : '您确定要拒绝这笔退款吗？请确保已载入明确的说明文档。'
                }
                confirmText={auditConfirmState.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                type={auditConfirmState.action === 'approve' ? 'info' : 'danger'}
                isLoading={isAuditing}
            />
        </AdminDrawer>
    );
};

// Help helper for icon used in reason section but missed in main imports
const MessageSquare = ({ size, className }: { size: number, className: string }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;

export default RefundDetailDrawer;
