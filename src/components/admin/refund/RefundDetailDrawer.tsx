// ============================================================
// [智能决策座舱] 退款详情抽屉组件
// ============================================================

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
    X,
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
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAdminRefundDetail, auditRefund, retryRefund, syncRefundStatus, AdminRefundDetailAggregated } from '../../../api/refund';

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
        HIGH: { color: 'emerald', icon: CheckCircle2, label: '高置信度' },
        MEDIUM: { color: 'amber', icon: AlertTriangle, label: '中置信度' },
        LOW: { color: 'rose', icon: AlertOctagon, label: '低置信度' },
    };
    const config = confidenceConfig[suggestion.confidence];
    const Icon = config.icon;

    return (
        <div className={`bg-gradient-to-br from-${config.color}-50 to-${config.color}-100/50 rounded-2xl p-6 border border-${config.color}-200`}>
            <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-${config.color}-500 flex items-center justify-center shadow-lg shadow-${config.color}-200`}>
                    <Sparkles className="text-white" size={24} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-slate-800">AI 智能建议</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-${config.color}-100 text-${config.color}-700 flex items-center gap-1`}>
                            <Icon size={12} />
                            {config.label}
                        </span>
                    </div>
                    <p className={`text-lg font-black text-${config.color}-700 mb-2`}>{suggestion.verdict}</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{suggestion.explanation}</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// 子组件：资产核销仪表盘
// ============================================================

const EquityDashboard: React.FC<{ equity: AdminRefundDetailAggregated['equityAudit'] }> = ({ equity }) => {
    const consumedPercentage = equity.orderAmount > 0
        ? Math.min(100, (equity.consumedValue / equity.orderAmount) * 100)
        : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
                    <BarChart3 className="text-white" size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800">资产核销仪表盘</h4>
                    <p className="text-xs text-slate-400">Equity Audit Dashboard</p>
                </div>
            </div>

            {/* 进度条 */}
            <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">已消耗价值</span>
                    <span className="font-bold text-slate-700">¥{equity.consumedValue.toFixed(2)} / ¥{equity.orderAmount.toFixed(2)}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${consumedPercentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{consumedPercentage.toFixed(1)}% 已消耗</span>
                    <span>{(100 - consumedPercentage).toFixed(1)}% 可退</span>
                </div>
            </div>

            {/* 数据卡片 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Coins size={16} className="text-amber-500" />
                        <span className="text-xs text-slate-500">积分授予</span>
                    </div>
                    <p className="text-xl font-black text-slate-800">{equity.pointsGranted}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-rose-500" />
                        <span className="text-xs text-slate-500">已消耗积分</span>
                    </div>
                    <p className="text-xl font-black text-slate-800">{equity.totalConsumedPoints}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Package size={16} className="text-blue-500" />
                        <span className="text-xs text-slate-500">创建项目数</span>
                    </div>
                    <p className="text-xl font-black text-slate-800">{equity.projectsCreatedAfterOrder}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard size={16} className="text-emerald-500" />
                        <span className="text-xs text-emerald-600">建议退款额</span>
                    </div>
                    <p className="text-xl font-black text-emerald-600">¥{equity.suggestedRefundAmount.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// 子组件：风险雷达
// ============================================================

const RiskRadar: React.FC<{ radar: AdminRefundDetailAggregated['riskRadar'] }> = ({ radar }) => {
    const levelConfig = {
        LOW: { color: 'emerald', label: '低风险', icon: Shield, bg: 'from-emerald-50 to-green-50' },
        MEDIUM: { color: 'amber', label: '中风险', icon: AlertTriangle, bg: 'from-amber-50 to-yellow-50' },
        HIGH: { color: 'rose', label: '高风险', icon: AlertOctagon, bg: 'from-rose-50 to-red-50' },
    };
    const config = levelConfig[radar.riskLevel];
    const Icon = config.icon;

    return (
        <div className={`bg-gradient-to-br ${config.bg} rounded-2xl border border-${config.color}-200 p-6`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${config.color}-500 flex items-center justify-center`}>
                        <Icon className="text-white" size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">风险雷达</h4>
                        <p className="text-xs text-slate-400">Risk Assessment</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold bg-${config.color}-100 text-${config.color}-700`}>
                    {config.label}
                </span>
            </div>

            {/* 自动审批状态 */}
            <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${radar.canAutoApprove ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {radar.canAutoApprove ? (
                    <>
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700">符合自动审批条件</span>
                    </>
                ) : (
                    <>
                        <XCircle size={18} className="text-slate-500" />
                        <span className="text-sm font-bold text-slate-600">需人工审核</span>
                    </>
                )}
            </div>

            {/* 风险因素列表 */}
            {radar.riskFactors.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">风险因素</p>
                    {radar.riskFactors.map((factor, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white/60 rounded-lg border border-slate-200">
                            <AlertTriangle size={14} className={`text-${config.color}-500`} />
                            <span className="text-sm text-slate-700">{factor}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4">
                    <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-emerald-600 font-medium">无风险因素，用户信用良好</p>
                </div>
            )}
        </div>
    );
};

// ============================================================
// 子组件：行为时光轴
// ============================================================

const BehaviorTimeline: React.FC<{ behavior: AdminRefundDetailAggregated['behaviorContext'] }> = ({ behavior }) => {
    const [showAll, setShowAll] = useState(false);
    const displayItems = showAll ? behavior.consumptionHistory : behavior.consumptionHistory.slice(0, 5);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                        <Activity className="text-white" size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800">行为特征溯源</h4>
                        <p className="text-xs text-slate-400">Behavioral Context</p>
                    </div>
                </div>
                {behavior.hasHighFrequencyActivity && (
                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 flex items-center gap-1">
                        <Zap size={12} />
                        高频活动
                    </span>
                )}
            </div>

            {/* 24h 活动统计 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={14} className="text-blue-500" />
                        <span className="text-xs text-blue-600">24h 内操作次数</span>
                    </div>
                    <p className={`text-2xl font-black ${behavior.last24hActivityCount >= 10 ? 'text-rose-600' : 'text-blue-700'}`}>
                        {behavior.last24hActivityCount}
                    </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Coins size={14} className="text-blue-500" />
                        <span className="text-xs text-blue-600">24h 内消耗积分</span>
                    </div>
                    <p className="text-2xl font-black text-blue-700">{behavior.last24hConsumedPoints}</p>
                </div>
            </div>

            {/* 消费历史时间线 */}
            {displayItems.length > 0 ? (
                <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">消费历史</p>
                    {displayItems.map((item, index) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 text-xs font-bold text-slate-500">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="text-sm font-bold text-slate-700 truncate">{item.action || '未知操作'}</span>
                                    <span className="text-xs font-bold text-rose-500 shrink-0">-{item.points}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">{item.description || '无描述'}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {format(new Date(item.timestamp), 'MM-dd HH:mm', { locale: zhCN })}
                                </p>
                            </div>
                        </div>
                    ))}
                    {behavior.consumptionHistory.length > 5 && (
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
                        >
                            {showAll ? '收起' : `展开全部 ${behavior.consumptionHistory.length} 条记录`}
                            <ChevronRight size={16} className={`transition-transform ${showAll ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="text-center py-6 text-slate-400">
                    <Activity size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无消费记录</p>
                </div>
            )}
        </div>
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

    // 获取退款详情
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['adminRefundDetail', refundId],
        queryFn: () => getAdminRefundDetail(refundId!),
        enabled: !!refundId && isOpen,
    });

    // 锁定 body 滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // 审核操作
    const handleAudit = async (action: 'approve' | 'reject') => {
        if (!refundId) return;
        setIsAuditing(true);
        try {
            const result = await auditRefund(refundId, action === 'approve', auditRemark);
            if (result.success) {
                onAuditSuccess?.();
                onClose();
            }
        } catch (error) {
            console.error('审核失败:', error);
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
            } else {
                alert(`重试失败: ${result.message}`);
            }
        } catch (error) {
            console.error('重试失败:', error);
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
            } else {
                alert(`同步失败: ${result.message}`);
            }
        } catch (error) {
            console.error('同步失败:', error);
        } finally {
            setIsAuditing(false);
        }
    };

    if (!isOpen) return null;

    const drawerContent = (
        <div className="fixed inset-0 z-[200] flex justify-end overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">智能决策座舱</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Decision Intelligence Hub</span>
                                {data?.refund && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase ${data.refund.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                        data.refund.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                            data.refund.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                data.refund.status === 'FAILED' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                                    'bg-slate-50 text-slate-500 border-slate-200'
                                        }`}>
                                        {data.refund.status === 'PENDING' ? '待审核' :
                                            data.refund.status === 'COMPLETED' ? '已完成' :
                                                data.refund.status === 'REJECTED' ? '已拒绝' :
                                                    data.refund.status === 'FAILED' ? '退款失败' :
                                                        data.refund.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center text-rose-500">
                            <AlertOctagon size={48} className="mx-auto mb-4 opacity-50" />
                            <p>加载失败，请重试</p>
                        </div>
                    ) : data && data.userProfile && data.aiSuggestion && data.refund && data.order && data.equityAudit && data.riskRadar && data.behaviorContext && data.refundHistory ? (
                        <div className="p-6 space-y-6">
                            {/* AI 建议面板 */}
                            <AiSuggestionPanel suggestion={data.aiSuggestion} />

                            {/* 用户信息卡片 */}
                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold">{data.userProfile.nickname || data.userProfile.email || '未知用户'}</h4>
                                            <p className="text-sm text-slate-400">{data.userProfile.email || '无邮箱'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">账龄</p>
                                        <p className="text-lg font-bold">{data.userProfile.accountAgeDays} 天</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-xs text-slate-400 mb-1">VIP 等级</p>
                                        <p className="text-lg font-bold">Lv.{data.userProfile.vipLevel}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-xs text-slate-400 mb-1">当前积分</p>
                                        <p className="text-lg font-bold">{data.userProfile.currentPoints}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-xs text-slate-400 mb-1">总退款次数</p>
                                        <p className="text-lg font-bold">{data.refundHistory.totalRequests}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-xs text-slate-400 mb-1">风险分</p>
                                        <p className={`text-lg font-bold ${data.userProfile.riskScore >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {data.userProfile.riskScore}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 订单信息 */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                                        <FileText className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">退款申请信息</h4>
                                        <p className="text-xs text-slate-400">{data.refund.refundNo}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">商品名称</p>
                                        <p className="text-sm font-medium text-slate-800">{data.order.productName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">申请金额</p>
                                        <p className="text-sm font-bold text-rose-600">¥{data.refund.amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">申请时间</p>
                                        <p className="text-sm text-slate-700">
                                            {format(new Date(data.refund.createdAt), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">订单号</p>
                                        <p className="text-sm text-slate-700">{data.order.orderNo}</p>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                                    <p className="text-xs text-slate-400 mb-1">退款原因</p>
                                    <p className="text-sm text-slate-700">{data.refund.reason}</p>
                                    {data.refund.description && (
                                        <p className="text-xs text-slate-500 mt-2">{data.refund.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* 资产核销仪表盘 */}
                            <EquityDashboard equity={data.equityAudit} />

                            {/* 风险雷达 */}
                            <RiskRadar radar={data.riskRadar} />

                            {/* 行为时光轴 */}
                            <BehaviorTimeline behavior={data.behaviorContext} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <AlertTriangle size={48} className="mb-4 opacity-50" />
                            <p className="text-sm">数据不完整，请刷新重试</p>
                            <button
                                onClick={() => refetch()}
                                className="mt-3 px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                重新加载
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer - 审核操作区 / 异常恢复区 */}
                {data?.refund?.status && (
                    <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
                        {data.refund.status === 'PENDING' ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">审核备注</label>
                                    <textarea
                                        value={auditRemark}
                                        onChange={(e) => setAuditRemark(e.target.value)}
                                        placeholder="输入审核备注（可选）..."
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none text-sm resize-none"
                                        rows={2}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAudit('reject')}
                                        disabled={isAuditing}
                                        className="flex-1 px-6 py-3 rounded-xl border-2 border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={18} />
                                        拒绝退款
                                    </button>
                                    <button
                                        onClick={() => handleAudit('approve')}
                                        disabled={isAuditing}
                                        className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold hover:from-emerald-600 hover:to-green-600 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={18} />
                                        批准退款
                                    </button>
                                </div>
                            </>
                        ) : data.refund.status === 'FAILED' ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRetry}
                                    disabled={isAuditing}
                                    className="flex-1 px-6 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors disabled:opacity-50 shadow-lg shadow-rose-200 flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={18} />
                                    重新发起退款
                                </button>
                                <button
                                    onClick={handleSync}
                                    disabled={isAuditing}
                                    className="flex-1 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw size={18} />
                                    同步最新状态
                                </button>
                            </div>
                        ) : data.refund.status === 'PROCESSING' ? (
                            <button
                                onClick={handleSync}
                                disabled={isAuditing}
                                className="w-full px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                <RefreshCcw size={18} />
                                同步支付状态
                            </button>
                        ) : (
                            <div className="text-center py-2 text-xs text-slate-400 font-medium">
                                该流程已结束，当前状态：{
                                    data.refund.status === 'COMPLETED' ? '已退款' :
                                        data.refund.status === 'REJECTED' ? '已拒绝' :
                                            data.refund.status
                                }
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return ReactDOM.createPortal(drawerContent, document.body);
};

export default RefundDetailDrawer;
