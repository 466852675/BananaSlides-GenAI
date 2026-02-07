import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as RefundApi from '@/api/refund';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '../../ConfirmDialog';
import { RefundUserCard } from './RefundUserCard';
import { RefundAmountCard } from './RefundAmountCard';
import { RefundOrderCard } from './RefundOrderCard';
import { RefundTimeline } from './RefundTimeline';
import { RefundRiskBadge } from './RefundRiskBadge';
import { RefundSuggestion } from './RefundSuggestion';

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING: { label: '待审核', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    PROCESSING: { label: '处理中', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    COMPLETED: { label: '已退款', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    REJECTED: { label: '已拒绝', color: 'text-rose-600', bgColor: 'bg-rose-50' },
    FAILED: { label: '退款失败', color: 'text-red-600', bgColor: 'bg-red-50' },
    MANUAL_REQUIRED: { label: '需人工处理', color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

interface RefundDetailPageProps {
    refundId: string;
    onBack: () => void;
}

export const RefundDetailPage: React.FC<RefundDetailPageProps> = ({ refundId, onBack }) => {
    const queryClient = useQueryClient();
    const [auditDialog, setAuditDialog] = useState<{
        isOpen: boolean;
        action: 'approve' | 'reject' | null;
        adminNote: string;
    }>({
        isOpen: false,
        action: null,
        adminNote: '',
    });

    // 获取增强版退款详情
    const { data: result, isLoading, error } = useQuery({
        queryKey: ['admin-refund-detail', refundId],
        queryFn: () => RefundApi.getAdminRefundDetail(refundId),
        enabled: !!refundId,
    });

    // 审核退款 mutation
    const auditMutation = useMutation({
        mutationFn: ({ action, adminNote }: { action: 'approve' | 'reject'; adminNote: string }) =>
            RefundApi.auditRefund(refundId, action, adminNote),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-refund-detail', refundId] });
            queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
            setAuditDialog({ isOpen: false, action: null, adminNote: '' });
        },
    });

    const handleAudit = (action: 'approve' | 'reject') => {
        setAuditDialog({ isOpen: true, action, adminNote: '' });
    };

    const confirmAudit = () => {
        if (!auditDialog.action) return;
        auditMutation.mutate({
            action: auditDialog.action,
            adminNote: auditDialog.adminNote,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-violet-500" />
            </div>
        );
    }

    if (error || !result) {
        return (
            <div className="text-center py-20">
                <p className="text-rose-500">加载失败，请稍后重试</p>
                <button onClick={onBack} className="mt-4 text-violet-500 hover:text-violet-600">
                    返回列表
                </button>
            </div>
        );
    }

    // 从新 API 响应结构映射数据到旧组件期望的格式
    const { refund, order, userProfile, riskRadar, aiSuggestion } = result;
    const status = statusConfig[refund.status] || statusConfig.PENDING;

    // 映射用户数据到 RefundUserProfile 格式
    const user = {
        id: userProfile.id,
        email: userProfile.email || undefined,
        nickname: userProfile.nickname || undefined,
        vipLevel: `Lv.${userProfile.vipLevel}`,
        createdAt: new Date(Date.now() - userProfile.accountAgeDays * 24 * 60 * 60 * 1000).toISOString(),
        totalOrders: 0, // 暂无数据
        totalSpent: userProfile.totalPointsUsed * 0.1, // 估算
        refundCount: result.refundHistory?.totalRequests || 0,
    };

    // 映射订单数据到 RefundOriginalOrder 格式
    const originalOrder = {
        id: order.id,
        orderNo: order.orderNo,
        productName: order.productName,
        productType: order.productType,
        finalPrice: order.finalPrice,
        amount: order.finalPrice,
        paidAt: order.paidAt || order.createdAt,
        status: order.status,
        paymentMethod: 'unknown',
    };

    // 映射风险评估数据
    const riskAssessment = {
        level: riskRadar.riskLevel,
        score: riskRadar.riskFactors.length * 25,
        factors: riskRadar.riskFactors,
        autoApprove: riskRadar.canAutoApprove,
        suggestion: aiSuggestion.verdict,
    };

    // 暂无审核历史数据，使用空数组
    const auditHistory: any[] = [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">退款详情</h2>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                退款单号: {refund.refundNo}
                            </p>
                        </div>
                    </div>
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${status.color} ${status.bgColor}`}>
                        {status.label}
                    </span>
                </div>
            </div>

            {/* 3列布局 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧列 - 金额和用户 */}
                <div className="space-y-6">
                    <RefundAmountCard
                        refundAmount={refund.amount}
                        originalOrderAmount={originalOrder.amount}
                    />
                    <RefundUserCard user={user} />
                </div>

                {/* 中间列 - 订单和时间线 */}
                <div className="space-y-6">
                    <RefundOrderCard order={originalOrder} />
                    <RefundTimeline history={auditHistory} />
                </div>

                {/* 右侧列 - 风险、建议和操作 */}
                <div className="space-y-6">
                    <RefundRiskBadge assessment={riskAssessment} />
                    <RefundSuggestion suggestion={aiSuggestion.verdict} />

                    {/* 操作按钮 */}
                    {refund.status === 'PENDING' && (
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">审核操作</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleAudit('approve')}
                                    disabled={auditMutation.isPending}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    同意退款
                                </button>
                                <button
                                    onClick={() => handleAudit('reject')}
                                    disabled={auditMutation.isPending}
                                    className="w-full py-3 px-4 bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <X size={18} />
                                    拒绝退款
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 退款原因 */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-3">退款原因</h3>
                        <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-700 font-medium">
                            {refund.reason}
                        </div>
                        {refund.description && (
                            <p className="mt-2 text-xs text-slate-500">{refund.description}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* 审核确认弹窗 */}
            <ConfirmDialog
                isOpen={auditDialog.isOpen}
                onCancel={() => setAuditDialog({ isOpen: false, action: null, adminNote: '' })}
                onConfirm={confirmAudit}
                title={auditDialog.action === 'approve' ? '确认同意退款' : '确认拒绝退款'}
                message={
                    auditDialog.action === 'approve'
                        ? `同意退款后，系统将自动处理退款，¥${refund.amount.toFixed(2)} 将原路返回给用户。是否继续？`
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
