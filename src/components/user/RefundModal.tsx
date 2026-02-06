import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle, CheckCircle, RefreshCcw, Coins, Calendar, Shield } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as RefundApi from '../../api/refund';
import * as OrdersApi from '../../api/orders';
import { toast } from 'react-hot-toast';

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: OrdersApi.Order | null;
    onSuccess?: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
    const [reason, setReason] = useState('');
    const [step, setStep] = useState<'check' | 'form' | 'success'>('check');

    const { data: eligibility, isLoading: isChecking } = useQuery({
        queryKey: ['refundEligibility', order?.id],
        queryFn: () => RefundApi.checkRefundEligibility(order!.id),
        enabled: isOpen && !!order && step === 'check',
    });

    const refundMutation = useMutation({
        mutationFn: () => RefundApi.applyRefund(order!.id, reason),
        onSuccess: (data) => {
            toast.success(data.message || '退款申请已提交');
            setStep('success');
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.message || '退款申请失败');
        },
    });

    const handleSubmit = () => {
        if (!reason.trim()) {
            toast.error('请填写退款原因');
            return;
        }
        refundMutation.mutate();
    };

    const handleClose = () => {
        setReason('');
        setStep('check');
        refundMutation.reset();
        onClose();
    };

    if (!isOpen || !order) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                >
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                    <RefreshCcw className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">申请退款</h3>
                                    <p className="text-orange-100 text-xs mt-0.5">订单号: {order.orderNo}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="p-5">
                        {step === 'check' && (
                            <>
                                {isChecking ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                                        <p className="text-slate-500 text-sm">正在检查退款资格...</p>
                                    </div>
                                ) : eligibility?.eligible ? (
                                    <div className="space-y-4">
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-green-800">符合退款条件</p>
                                                <p className="text-sm text-green-600 mt-1">
                                                    您的订单符合退款条件，可申请全额退款 ¥{order.finalPrice}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-sm flex items-center gap-2">
                                                    <Coins size={14} />
                                                    商品名称
                                                </span>
                                                <span className="font-medium text-slate-800">{order.productName}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-sm flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    支付时间
                                                </span>
                                                <span className="font-medium text-slate-800">
                                                    {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                                <span className="text-slate-500 text-sm">退款金额</span>
                                                <span className="font-bold text-orange-600 text-lg">¥{order.finalPrice}</span>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                                            <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-medium text-blue-800 text-sm">退款政策</p>
                                                <ul className="text-xs text-blue-600 mt-1 space-y-1">
                                                    <li>• 支付后 7 天内可申请退款</li>
                                                    <li>• 未创建项目或未生成内容的订单可全额退款</li>
                                                    <li>• 退款将在 1-3 个工作日内原路返回</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setStep('form')}
                                            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-95"
                                        >
                                            继续申请退款
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold text-red-800">不符合退款条件</p>
                                                <p className="text-sm text-red-600 mt-1">
                                                    {eligibility?.reason || '该订单不符合退款条件'}
                                                </p>
                                            </div>
                                        </div>

                                        {eligibility?.hasCreatedProjects && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                                <p className="text-sm text-amber-800">
                                                    <span className="font-bold">提示：</span>
                                                    您已使用该订单创建的积分生成了内容，根据退款政策，此类订单无法退款。
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleClose}
                                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                        >
                                            关闭
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {step === 'form' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        退款原因 <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="请简要说明退款原因，这将帮助我们改进服务..."
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none h-32 text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">{reason.length}/200 字</p>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-slate-700 mb-2">退款详情</p>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">退款金额</span>
                                        <span className="font-bold text-orange-600">¥{order.finalPrice}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('check')}
                                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                    >
                                        返回
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={refundMutation.isPending || !reason.trim()}
                                        className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {refundMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                提交中...
                                            </>
                                        ) : (
                                            '确认申请'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                </div>
                                <h4 className="text-xl font-bold text-slate-800 mb-2">申请已提交</h4>
                                <p className="text-slate-500 text-sm mb-6">
                                    您的退款申请已成功提交，我们将在 1-3 个工作日内处理并原路退回款项。
                                </p>
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-95"
                                >
                                    知道了
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
