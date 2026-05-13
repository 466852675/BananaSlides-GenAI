// src/components/PointsGuard.tsx
// 积分预警守卫组件 - 实现分级预警策略

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Crown, Coins, X, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCommercial } from '../hooks/useCommercial';

interface PointsGuardProps {
    /** 预警阈值，默认 50 */
    warnThreshold?: number;
    /** 购买回调 */
    onPurchase?: () => void;
    /** 是否启用预警 */
    enabled?: boolean;
}

type AlertLevel = 'warning' | 'critical' | 'none';
type UserTier = 'normal' | 'pro' | 'enterprise';

export const PointsGuard: React.FC<PointsGuardProps> = ({
    warnThreshold = 50,
    onPurchase,
    enabled = true
}) => {
    const { user, isAuthenticated } = useAuth();
    const [alertLevel, setAlertLevel] = useState<AlertLevel>('none');
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const { isModuleDisabled } = useCommercial();

    // 判断用户层级
    const getUserTier = (): UserTier => {
        if (!user) return 'normal';
        // 管理员视为 Pro
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            return 'pro';
        }
        // vipLevel >= 1 视为 Pro 用户
        if (user.vipLevel && user.vipLevel >= 1) {
            return 'pro';
        }
        // 企业用户判断 (未来扩展)
        return 'normal';
    };

    // 监听积分变化
    useEffect(() => {
        if (!enabled || !isAuthenticated || !user) {
            setAlertLevel('none');
            return;
        }

        const points = user.points || 0;

        if (points <= 0) {
            setAlertLevel('critical');
            setShowModal(true);
            setDismissed(false);
        } else if (points <= warnThreshold) {
            setAlertLevel('warning');
            if (!dismissed) {
                setShowModal(true);
            }
        } else {
            setAlertLevel('none');
            setShowModal(false);
        }
    }, [user?.points, enabled, isAuthenticated, warnThreshold, dismissed]);

    const userTier = getUserTier();

    // 获取提示内容
    const getAlertContent = () => {
        if (alertLevel === 'critical') {
            return {
                title: '积分已耗尽',
                description: '您的积分余额为 0，无法继续使用 AI 生成功能。',
                cta: '立即充值',
                icon: AlertTriangle,
                gradient: 'from-red-500 to-orange-500',
                canClose: false
            };
        }

        if (userTier === 'pro') {
            return {
                title: '本月额度紧缺',
                description: `您的积分余额仅剩 ${user?.points ?? 0} 分，建议购买积分加油包继续创作。`,
                cta: '购买加油包',
                icon: Coins,
                gradient: 'from-amber-500 to-orange-500',
                canClose: true
            };
        }

        // 普通用户
        return {
            title: '体验分即将耗尽',
            description: `您的积分余额仅剩 ${user?.points ?? 0} 分，升级专业版解锁无限创作。`,
            cta: '升级 Pro 会员',
            icon: Crown,
            gradient: 'from-violet-500 to-purple-600',
            canClose: true
        };
    };

    const content = getAlertContent();
    const IconComponent = content.icon;

    const handleDismiss = () => {
        if (content.canClose) {
            setDismissed(true);
            setShowModal(false);
        }
    };

    const handlePurchase = () => {
        onPurchase?.();
        if (content.canClose) {
            setShowModal(false);
        }
    };

    // [商业化] 关闭时隐藏积分预警
    if (isModuleDisabled('points')) {
        return null;
    }

    if (!showModal || alertLevel === 'none') return null;

    return (
        <AnimatePresence>
            {showModal && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={content.canClose ? handleDismiss : undefined}
                        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] ${!content.canClose ? 'cursor-not-allowed' : ''}`}
                    />

                    {/* 弹窗内容 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', duration: 0.4 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md pointer-events-auto">
                            {/* 头部 */}
                            <div className={`bg-gradient-to-br ${content.gradient} p-6 text-white relative overflow-hidden`}>
                                {/* 装饰元素 */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-12 -mb-12" />

                                {content.canClose && (
                                    <button
                                        onClick={handleDismiss}
                                        className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                )}

                                <div className="relative flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                        <IconComponent size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{content.title}</h2>
                                        <p className="text-white/80 text-sm mt-1">{content.description}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 内容区 */}
                            <div className="p-6">
                                {/* 权益展示 */}
                                <div className="space-y-3 mb-6">
                                    <FeatureItem icon={Sparkles} text="无限 AI 生成次数" />
                                    <FeatureItem icon={Zap} text="优先使用最新模型" />
                                    <FeatureItem icon={Crown} text="专属客服支持" />
                                </div>

                                {/* CTA 按钮 */}
                                <button
                                    onClick={handlePurchase}
                                    className={`w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r ${content.gradient} hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2 group`}
                                >
                                    {content.cta}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {content.canClose && (
                                    <button
                                        onClick={handleDismiss}
                                        className="w-full mt-3 py-3 text-slate-500 hover:text-slate-700 font-medium transition-colors"
                                    >
                                        稍后再说
                                    </button>
                                )}

                                {!content.canClose && (
                                    <p className="text-center text-slate-400 text-sm mt-4">
                                        积分为 0 时无法关闭此窗口
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// 权益项组件
const FeatureItem: React.FC<{ icon: React.FC<{ size?: number }>; text: string }> = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-3 text-slate-600">
        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
            <Icon size={16} />
        </div>
        <span className="font-medium">{text}</span>
    </div>
);

export default PointsGuard;
