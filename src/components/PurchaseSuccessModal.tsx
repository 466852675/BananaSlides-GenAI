// src/components/PurchaseSuccessModal.tsx
// 购买成功弹窗组件 - 带有动画效果的成功反馈

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, PartyPopper, Gift, X } from 'lucide-react';

interface PurchaseSuccessModalProps {
    /** 是否显示 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 购买的商品名称 */
    productName?: string;
    /** 获得的积分数量 */
    pointsGranted?: number;
    /** 跳转回调 */
    onContinue?: () => void;
}

export const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
    isOpen,
    onClose,
    productName = '商品',
    pointsGranted = 0,
    onContinue
}) => {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // 自动关闭
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleContinue = () => {
        onContinue?.();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                    />

                    {/* 彩纸效果 */}
                    <AnimatePresence>
                        {showConfetti && (
                            <div className="fixed inset-0 z-[101] pointer-events-none overflow-hidden">
                                {[...Array(30)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{
                                            opacity: 1,
                                            y: -20,
                                            x: Math.random() * window.innerWidth,
                                            rotate: 0,
                                            scale: 0.5 + Math.random() * 0.5
                                        }}
                                        animate={{
                                            opacity: 0,
                                            y: window.innerHeight + 50,
                                            x: Math.random() * window.innerWidth,
                                            rotate: Math.random() * 720 - 360
                                        }}
                                        transition={{
                                            duration: 2 + Math.random() * 2,
                                            delay: Math.random() * 0.5,
                                            ease: 'easeOut'
                                        }}
                                        className={`absolute w-3 h-3 rounded-sm ${['bg-violet-500', 'bg-pink-500', 'bg-yellow-400', 'bg-green-400', 'bg-blue-400'][i % 5]
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>

                    {/* 弹窗内容 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: 'spring', duration: 0.5 }}
                        className="fixed inset-0 z-[102] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm pointer-events-auto">
                            {/* 头部成功动画区 */}
                            <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-white text-center overflow-hidden">
                                {/* 装饰元素 */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -ml-12 -mb-12" />

                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <X size={20} />
                                </button>

                                {/* 成功图标动画 */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                    className="relative mx-auto w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4"
                                >
                                    <CheckCircle size={40} className="text-white" strokeWidth={2.5} />
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.5, 0] }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="absolute inset-0 bg-white/30 rounded-full"
                                    />
                                </motion.div>

                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-2xl font-bold mb-2"
                                >
                                    购买成功！
                                </motion.h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-white/80"
                                >
                                    {productName}
                                </motion.p>
                            </div>

                            {/* 内容区 */}
                            <div className="p-6">
                                {/* 积分到账提示 */}
                                {pointsGranted > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 mb-4"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white">
                                            <Gift size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm text-slate-500">积分已到账</div>
                                            <div className="text-lg font-bold text-amber-600">+{pointsGranted} 分</div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* CTA 按钮 */}
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    onClick={handleContinue}
                                    className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-lg hover:shadow-violet-500/30 transition-all flex items-center justify-center gap-2 group"
                                >
                                    <Sparkles size={18} />
                                    继续创作
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>

                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="text-center text-slate-400 text-sm mt-4"
                                >
                                    感谢您的支持，祝您创作愉快！
                                </motion.p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default PurchaseSuccessModal;
