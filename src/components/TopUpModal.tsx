// src/components/TopUpModal.tsx
// 快捷充值弹窗：提供套餐选择，衔接支付流程

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShoppingBag, Zap, Crown, Users } from 'lucide-react';
import { Product } from '../api/admin'; // 或 '../api/product'

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProduct: (product: any) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
    isOpen,
    onClose,
    onSelectProduct
}) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    // 静态产品定义 (与 LandingPage 4档位匹配，展示3个付费项)
    const products = [
        {
            id: 'static-basic',
            type: 'VIP_MONTHLY',
            name: '基础版',
            price: billingCycle === 'yearly' ? 59 : 69,
            originalPrice: billingCycle === 'yearly' ? 69 : 89,
            points: 1000,
            description: '个人进阶，解锁无水印导出',
            features: ['赠送 1000 积分/月', '使用标准版 AI 模型', '无水印导出', '全格式支持'],
            icon: <Zap size={24} className="text-white" />,
            color: 'from-emerald-400 to-teal-500',
            popular: false
        },
        {
            id: 'static-pro',
            type: 'VIP_MONTHLY',
            name: '专业版',
            price: billingCycle === 'yearly' ? 109 : 129,
            originalPrice: billingCycle === 'yearly' ? 129 : 159,
            points: 3000,
            description: '高频创作，解锁旗舰级 AI 能力',
            features: ['赠送 3000 积分/月', '旗舰版 AI 模型', '极速生成通道', '逻辑生成美化'],
            icon: <Crown size={24} className="text-white" />,
            color: 'from-blue-500 to-indigo-600',
            popular: true
        },
        {
            id: 'static-enterprise',
            type: 'VIP_MONTHLY',
            name: '企业版',
            price: billingCycle === 'yearly' ? 259 : 299,
            originalPrice: billingCycle === 'yearly' ? 299 : 359,
            points: 8000,
            description: '为规模化演示生产量身定制',
            features: ['赠送 8000 积分/月', '全员享用旗舰 AI', '团队协作空间', 'API 自动化支持'],
            icon: <Users size={24} className="text-white" />,
            color: 'from-purple-500 to-pink-600',
            popular: false
        }
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden relative max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">套餐充值</h3>
                                <p className="text-slate-500 text-xs font-medium">选择适合您的方案，即刻升级体验</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* 价格切换器 */}
                            <div className="inline-flex items-center p-1 bg-slate-200/50 rounded-xl">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    月付
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${billingCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    年付 <span className="text-[9px] text-green-600 bg-green-100 px-1 rounded transform scale-90">-25%</span>
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    className={`relative rounded-2xl border-2 p-5 transition-all cursor-pointer hover:shadow-xl group
                                        ${product.popular
                                            ? 'border-indigo-500 bg-indigo-50/10'
                                            : 'border-slate-100 hover:border-indigo-100 bg-white'}`}
                                    onClick={() => onSelectProduct(product)}
                                >
                                    {product.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                                            <Zap size={10} fill="currentColor" /> 最受欢迎
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center shadow-lg shadow-indigo-500/20`}>
                                            {product.icon}
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-baseline justify-end gap-1">
                                                <span className="text-xs text-slate-400 line-through">¥{product.originalPrice || Math.round(product.price * 1.3)}</span>
                                                <span className="text-2xl font-black text-slate-800">¥{product.price}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{product.type === 'POINTS_PACK' ? '一次性' : (billingCycle === 'yearly' ? '/ 月 (年付)' : '/ 月')}</div>
                                        </div>
                                    </div>

                                    <h4 className="text-lg font-black text-slate-800 mb-2">{product.name}</h4>
                                    <p className="text-xs text-slate-500 mb-4 h-8">{product.description}</p>

                                    <div className="space-y-2 mb-6">
                                        {product.features.map((feat, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                                                <span>{feat}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2
                                            ${product.popular
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600'
                                            } group-hover:scale-[1.02]`}
                                    >
                                        立即购买
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400">
                            支付成功后积分实时到账，若是会员权益将在重新登录后刷新
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
