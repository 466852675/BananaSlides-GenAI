import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, RefreshCcw, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as RefundApi from '../../api/refund';

interface RefundHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    PENDING: { 
        label: '待审核', 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        icon: <Clock size={14} /> 
    },
    PROCESSING: { 
        label: '处理中', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50',
        icon: <RefreshCcw size={14} className="animate-spin" /> 
    },
    COMPLETED: { 
        label: '已退款', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50',
        icon: <CheckCircle size={14} /> 
    },
    REJECTED: { 
        label: '已拒绝', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50',
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
        icon: <AlertCircle size={14} /> 
    },
};

export const RefundHistoryModal: React.FC<RefundHistoryModalProps> = ({ isOpen, onClose }) => {
    const [page, setPage] = useState(1);
    const [selectedRefund, setSelectedRefund] = useState<RefundApi.RefundRequest | null>(null);

    const { data: refundsData, isLoading } = useQuery({
        queryKey: ['myRefunds', page],
        queryFn: () => RefundApi.getMyRefunds(page, 10),
        enabled: isOpen,
    });

    if (!isOpen) return null;

    const refunds = refundsData?.items || [];
    const pagination = refundsData?.pagination;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                >
                    {!selectedRefund ? (
                        <>
                            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-5 text-white flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                            <RefreshCcw className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">退款记录</h3>
                                            <p className="text-slate-300 text-xs mt-0.5">
                                                共 {pagination?.total || 0} 条记录
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                                        <p className="text-slate-500 text-sm">加载中...</p>
                                    </div>
                                ) : refunds.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                            <RefreshCcw className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <p className="text-slate-500">暂无退款记录</p>
                                        <p className="text-slate-400 text-sm">申请的退款将显示在这里</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {refunds.map((refund) => {
                                            const status = statusConfig[refund.status] || statusConfig.PENDING;
                                            return (
                                                <div
                                                    key={refund.id}
                                                    onClick={() => setSelectedRefund(refund)}
                                                    className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 hover:border-slate-300 cursor-pointer transition-all hover:shadow-md"
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{refund.productName}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">订单号: {refund.orderNo}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${status.color} ${status.bgColor}`}>
                                                            {status.icon}
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-slate-400">
                                                            申请时间: {new Date(refund.createdAt).toLocaleString('zh-CN')}
                                                        </span>
                                                        <span className="font-bold text-slate-800">¥{refund.amount}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {pagination && pagination.totalPages > 1 && (
                                    <div className="flex justify-center items-center gap-2 mt-6">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                                        >
                                            上一页
                                        </button>
                                        <span className="text-sm text-slate-500">
                                            {page} / {pagination.totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                            disabled={page === pagination.totalPages}
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors"
                                        >
                                            下一页
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-slate-700 to-slate-800 p-5 text-white flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedRefund(null)}
                                        className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div>
                                        <h3 className="text-lg font-bold">退款详情</h3>
                                        <p className="text-slate-300 text-xs mt-0.5">订单号: {selectedRefund.orderNo}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-4">
                                    {(() => {
                                        const status = statusConfig[selectedRefund.status] || statusConfig.PENDING;
                                        return (
                                            <div className={`${status.bgColor} border border-${status.color.replace('text-', '')}/20 rounded-xl p-4 flex items-center gap-3`}>
                                                <div className={`${status.color}`}>
                                                    {status.icon}
                                                </div>
                                                <div>
                                                    <p className={`font-bold ${status.color}`}>{status.label}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        申请时间: {new Date(selectedRefund.createdAt).toLocaleString('zh-CN')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">商品名称</span>
                                            <span className="font-medium text-slate-800">{selectedRefund.productName}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">退款金额</span>
                                            <span className="font-bold text-orange-600 text-lg">¥{selectedRefund.amount}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 text-sm">退款原因</span>
                                        </div>
                                        <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                                            {selectedRefund.reason}
                                        </p>
                                    </div>

                                    {selectedRefund.adminNote && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <p className="text-sm font-medium text-blue-800 mb-1">客服备注</p>
                                            <p className="text-sm text-blue-600">{selectedRefund.adminNote}</p>
                                        </div>
                                    )}

                                    {selectedRefund.processedAt && (
                                        <div className="text-xs text-slate-400 text-center">
                                            处理时间: {new Date(selectedRefund.processedAt).toLocaleString('zh-CN')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
