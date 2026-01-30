// src/components/TopUpModal.tsx
// 快捷充值弹窗：提供套餐选择，衔接支付流程

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ShoppingBag, Zap, Crown, Users, AlertCircle } from 'lucide-react';
import { Product, getProducts } from '../api/admin';
import { LeadFormModal } from './LeadFormModal';
import { useQuery } from '@tanstack/react-query';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectProduct: (product: Product) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
    isOpen,
    onClose,
    onSelectProduct
}) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [showLeadForm, setShowLeadForm] = useState(false);

    // 动态获取产品列表
    const { data: products = [], isLoading, isError } = useQuery({
        queryKey: ['products', 'topup'],
        queryFn: getProducts,
        staleTime: 60000, // 1 minute cache
        enabled: isOpen, // Only fetch when open
    });

    // 过滤并处理产品数据
    const displayProducts = React.useMemo(() => {
        if (!products.length) return [];

        // 简单策略：按 type 分类展示，过滤掉隐藏商品
        // TODO: 后续需增加 billingCycle 过滤逻辑 (目前假设所有 VIP 商品都展示)
        return products
            .filter(p => p.displayType !== 'hidden')
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [products]);

    // 辅助函数：解析 features JSON
    const getFeatures = (product: Product): string[] => {
        const feat = product.features;
        if (Array.isArray(feat)) return feat as string[];
        if (typeof feat === 'string') {
            try {
                return JSON.parse(feat);
            } catch (e) {
                // 如果是普通字符串，尝试按换行符分割
                if (feat.includes('\n')) {
                    return feat.split('\n').filter(Boolean);
                }
                return [feat];
            }
        }
        return [];
    };

    // 辅助函数：获取图标
    const getProductIcon = (type: string, name: string) => {
        if (type === 'VIP_MONTHLY' || (name && (name.includes('会员') || name.includes('版')))) {
            if (name.includes('企业') || name.includes('Enterprise')) return <Users size={24} className="text-white" />;
            if (name.includes('尊享') || name.includes('Exclusive')) return <Crown size={24} className="text-white" />;
            if (name.includes('专业') || name.includes('Pro')) return <Crown size={24} className="text-white/80" />;
            return <Zap size={24} className="text-white" />;
        }
        return <ShoppingBag size={24} className="text-white" />;
    };

    // 辅助函数：获取颜色
    const getProductColor = (type: string, name: string, index: number) => {
        if (name.includes('企业')) return 'from-slate-800 to-black'; // 企业版黑金感
        if (name.includes('尊享')) return 'from-indigo-600 to-purple-700'; // 尊享版紫靛色
        if (name.includes('专业')) return 'from-blue-500 to-indigo-600'; // 专业版蓝色
        if (name.includes('基础')) return 'from-emerald-400 to-teal-500'; // 基础版绿色

        return 'from-amber-400 to-orange-500'; // 积分包默认橙色
    };

    if (!isOpen) return null;

    return (
        <>
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
                                {/* 价格切换器 (暂时保留UI，逻辑需后续完善) */}
                                <div className="inline-flex items-center p-1 bg-slate-200/50 rounded-xl opacity-50 pointer-events-none" title="暂只支持月付">
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
                        <div className="p-6 overflow-y-auto custom-scrollbar min-h-[400px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                                    <div className="animate-spin text-indigo-500"><ShoppingBag size={32} /></div>
                                    <p className="text-sm font-medium">正在加载商品...</p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4 text-rose-500">
                                    <AlertCircle size={32} />
                                    <p className="text-sm font-medium">加载失败，请稍后重试</p>
                                </div>
                            ) : displayProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                                    <ShoppingBag size={32} />
                                    <p className="text-sm font-medium">暂无上架商品</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {displayProducts.map((product, index) => {
                                        const tags = Array.isArray(product.tags) ? product.tags : (typeof product.tags === 'string' ? (product.tags as string).split(',') : []);
                                        const isPopular = tags.some(t => t.includes('推荐') || t.includes('HOT')) || product.name?.includes('专业');
                                        const features = getFeatures(product);
                                        const isEnterprise = product.roleToGrant === 'ENTERPRISE' || product.type === 'ENTERPRISE' || product.displayType === 'contact_sales';

                                        return (
                                            <div
                                                key={product.id}
                                                className={`relative rounded-2xl border-2 p-5 transition-all cursor-pointer hover:shadow-xl group flex flex-col
                                                    ${isPopular
                                                        ? 'border-indigo-500 bg-indigo-50/10'
                                                        : 'border-slate-100 hover:border-indigo-100 bg-white'}`}
                                                onClick={() => {
                                                    if (isEnterprise) {
                                                        setShowLeadForm(true);
                                                    } else {
                                                        onSelectProduct(product);
                                                    }
                                                }}
                                            >
                                                {isPopular && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1 z-10">
                                                        <Zap size={10} fill="currentColor" /> 最受欢迎
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getProductColor(product.type, product.name, index)} flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white`}>
                                                        {getProductIcon(product.type, product.name)}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-baseline justify-end gap-1">
                                                            {product.originalPrice && (
                                                                <span className="text-xs text-slate-400 line-through">¥{product.originalPrice}</span>
                                                            )}
                                                            <span className="text-2xl font-black text-slate-800">¥{product.price}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase">
                                                            {product.type === 'POINTS_PACKAGE' ? '一次性' : '/ 月'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <h4 className="text-lg font-black text-slate-800 mb-2 truncate" title={product.name}>{product.name}</h4>
                                                <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2" title={String(features[0] || '')}>{features[0] || '解锁更多权益'}</p>

                                                <div className="space-y-2 mb-6 flex-1">
                                                    {features.slice(0, 4).map((feat, i) => (
                                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                                                            <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
                                                            <span className="line-clamp-1">{feat}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mt-auto
                                                        ${isPopular
                                                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                                                            : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600'
                                                        } group-hover:scale-[1.02]`}
                                                >
                                                    {isEnterprise ? '联系销售' : '立即购买'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center shrink-0">
                            <p className="text-xs text-slate-400">
                                支付成功后积分实时到账，若是会员权益将在重新登录后刷新
                            </p>
                        </div>
                    </motion.div>
                </div>
            </AnimatePresence>

            <LeadFormModal isOpen={showLeadForm} onClose={() => setShowLeadForm(false)} />
        </>
    );
};
