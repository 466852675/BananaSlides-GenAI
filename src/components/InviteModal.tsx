// src/components/InviteModal.tsx
// 邀请有礼弹窗组件

import React from 'react';
import ReactDOM from 'react-dom';
import { X, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReferralCard } from './ReferralCard';

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* 弹窗内容 */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg pointer-events-auto">
                            {/* 头部 */}
                            <div className="bg-gradient-to-br from-purple-600 to-violet-700 p-6 text-white relative">
                                <button
                                    onClick={onClose}
                                    className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                        <Gift size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">邀请好友得积分</h2>
                                        <p className="text-white/80 text-sm">分享链接，双方皆可获赠积分奖励</p>
                                    </div>
                                </div>
                            </div>

                            {/* 内容 */}
                            <div className="p-6">
                                <ReferralCard onViewDetails={() => alert('邀请记录功能开发中，敬请期待！')} />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
