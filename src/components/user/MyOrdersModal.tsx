// src/components/user/MyOrdersModal.tsx
// 我的订单弹窗：订单记录查看 + 充值入口

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Loader2, CheckCircle, XCircle, Clock, Plus, Coins, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as OrdersApi from '../../api/orders';
import { PurchaseModal } from '../PurchaseModal';
import { Product, getProducts } from '../../api/product';

interface MyOrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTopUp?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    PENDING: { label: '待支付', color: 'text-amber-600 bg-amber-50', icon: <Clock size={14} /> },
    PAID: { label: '已完成', color: 'text-green-600 bg-green-50', icon: <CheckCircle size={14} /> },
    CANCELLED: { label: '已取消', color: 'text-slate-500 bg-slate-100', icon: <XCircle size={14} /> },
    REFUNDED: { label: '已退款', color: 'text-red-500 bg-red-50', icon: <XCircle size={14} /> },
};

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({ isOpen, onClose, onTopUp }) => {
    const [showPurchase, setShowPurchase] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // 获取订单列表
    const { data: ordersData, isLoading, refetch } = useQuery({
        queryKey: ['myOrders'],
        queryFn: () => OrdersApi.getMyOrders(1, 20),
        enabled: isOpen,
    });

    // 获取商品列表（用于充值入口）
    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
        enabled: isOpen,
    });

    const handlePurchase = (product: Product) => {
        setSelectedProduct(product);
        setShowPurchase(true);
    };

    const handlePurchaseSuccess = () => {
        setShowPurchase(false);
        setSelectedProduct(null);
        refetch(); // 刷新订单列表
    };

    if (!isOpen) return null;

    const orders = ordersData?.items || [];

    return (
        <>
            <AnimatePresence>
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold">我的订单</h3>
                                        <p className="text-indigo-200 text-xs mt-0.5">共 {orders.length} 条记录</p>
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

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-slate-500 text-sm">加载中...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                        <ShoppingBag className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500">暂无订单记录</p>
                                    <p className="text-slate-400 text-sm">购买套餐后订单将显示在这里</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map((order) => {
                                        const status = statusConfig[order.status] || statusConfig.PENDING;
                                        return (
                                            <div
                                                key={order.id}
                                                className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-bold text-slate-800">{order.productName}</p>
                                                        <p className="text-xs text-slate-400 mt-0.5">订单号: {order.orderNo}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${status.color}`}>
                                                        {status.icon}
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <div className="flex items-center gap-2 text-amber-600">
                                                        <Coins size={14} />
                                                        <span className="font-bold">+{order.quantity} 积分</span>
                                                    </div>
                                                    <span className="text-slate-800 font-black">¥{order.finalPrice}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-2">
                                                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer - 充值入口 */}
                        <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex-shrink-0 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mb-0.5">
                                    <ShoppingBag size={12} />
                                    <span>账户余额</span>
                                </p>
                                <p className="text-xs text-slate-400">充值通过安全加密支付</p>
                            </div>
                            <button
                                onClick={() => onTopUp?.()}
                                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0"
                            >
                                <Plus size={16} strokeWidth={3} />
                                立即充值
                            </button>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* 购买弹窗 */}
            <PurchaseModal
                isOpen={showPurchase}
                onClose={() => setShowPurchase(false)}
                product={selectedProduct}
                onSuccess={handlePurchaseSuccess}
            />
        </>
    );
};
