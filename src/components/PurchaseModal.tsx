// src/components/PurchaseModal.tsx
// 购买弹窗组件：订单创建和支付模拟

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, CreditCard, Loader2, Check, Coins, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as OrdersApi from '../api/orders';
import { Product } from '../api/product';
import { useAuth } from '../contexts/AuthContext';

interface PurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSuccess?: (newBalance: number) => void;
}

type Step = 'confirm' | 'paying' | 'success' | 'error';

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
    isOpen,
    onClose,
    product,
    onSuccess
}) => {
    const { refreshUser } = useAuth();
    const queryClient = useQueryClient();
    const [step, setStep] = useState<Step>('confirm');
    const [orderId, setOrderId] = useState<string | null>(null);
    const [newBalance, setNewBalance] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string>('');

    // 创建订单
    const createOrderMutation = useMutation({
        mutationFn: (productId: string) => OrdersApi.createOrder(productId),
        onSuccess: async (data) => {
            setOrderId(data.orderId);
            // 自动触发支付
            payOrderMutation.mutate(data.orderId);
        },
        onError: (error: any) => {
            setErrorMsg(error.message || '创建订单失败');
            setStep('error');
        }
    });

    // 模拟支付
    const payOrderMutation = useMutation({
        mutationFn: (orderId: string) => OrdersApi.payOrder(orderId, 'success'),
        onSuccess: (data) => {
            if (data.success) {
                setNewBalance(data.newBalance || 0);
                setStep('success');
                // 刷新用户信息
                refreshUser();
                // 刷新相关查询
                queryClient.invalidateQueries({ queryKey: ['user'] });
            } else {
                setErrorMsg(data.message || '支付失败');
                setStep('error');
            }
        },
        onError: (error: any) => {
            setErrorMsg(error.message || '支付失败');
            setStep('error');
        }
    });

    const handlePurchase = () => {
        if (!product) return;
        setStep('paying');
        createOrderMutation.mutate(product.id);
    };

    const handleClose = () => {
        if (step === 'success' && onSuccess) {
            onSuccess(newBalance);
        }
        // 重置状态
        setStep('confirm');
        setOrderId(null);
        setNewBalance(0);
        setErrorMsg('');
        onClose();
    };

    if (!isOpen || !product) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white relative">
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                <ShoppingCart className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">确认购买</h3>
                                <p className="text-blue-100 text-sm mt-0.5">{product.name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {step === 'confirm' && (
                            <div className="space-y-6">
                                {/* 商品信息 */}
                                <div className="bg-slate-50 rounded-2xl p-5">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-slate-500 text-sm font-medium">商品名称</span>
                                        <span className="font-bold text-slate-800">{product.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-slate-500 text-sm font-medium">包含积分</span>
                                        <div className="flex items-center gap-1 text-amber-600 font-bold">
                                            <Coins size={16} />
                                            <span>{product.points}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                        <span className="text-slate-500 text-sm font-medium">应付金额</span>
                                        <div className="flex items-baseline gap-1">
                                            {product.originalPrice && product.originalPrice > product.price && (
                                                <span className="text-slate-400 text-sm line-through">¥{product.originalPrice}</span>
                                            )}
                                            <span className="text-2xl font-black text-blue-600">¥{product.price}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 购买按钮 */}
                                <button
                                    onClick={handlePurchase}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] shadow-xl shadow-blue-500/25"
                                >
                                    <CreditCard size={20} />
                                    <span>立即支付</span>
                                </button>

                                <p className="text-center text-xs text-slate-400">
                                    点击支付即表示同意《服务条款》
                                </p>
                            </div>
                        )}

                        {step === 'paying' && (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-800 mb-1">正在处理支付...</p>
                                    <p className="text-sm text-slate-500">请稍候，正在模拟支付流程</p>
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-8 flex flex-col items-center justify-center gap-4"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.1 }}
                                    className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg"
                                >
                                    <Check className="w-10 h-10 text-white" strokeWidth={3} />
                                </motion.div>
                                <div className="text-center">
                                    <p className="text-xl font-black text-slate-800 mb-2">🎉 支付成功</p>
                                    <p className="text-slate-500 text-sm mb-4">
                                        积分已到账，当前余额
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-amber-50 rounded-2xl">
                                        <Sparkles className="w-5 h-5 text-amber-500" />
                                        <span className="text-2xl font-black text-amber-600">{newBalance}</span>
                                        <span className="text-amber-500 text-sm font-medium">积分</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="mt-4 px-10 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                                >
                                    完成
                                </button>
                            </motion.div>
                        )}

                        {step === 'error' && (
                            <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                                    <X className="w-8 h-8 text-red-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-slate-800 mb-1">支付失败</p>
                                    <p className="text-sm text-red-500">{errorMsg}</p>
                                </div>
                                <button
                                    onClick={() => setStep('confirm')}
                                    className="mt-4 px-8 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                                >
                                    重试
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
