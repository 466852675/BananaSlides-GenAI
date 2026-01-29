// src/components/ReferralCard.tsx
import React, { useState } from 'react';
import { Share2, Copy, Check, Users, Gift, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface ReferralCardProps {
    className?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ className = '' }) => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);

    const referralCode = user?.inviteCode || '------';
    const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

    const handleCopy = (text: string, type: 'link' | 'code') => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setCopiedType(type);
            // 使用原生方式显示复制成功反馈
            setTimeout(() => {
                setCopied(false);
                setCopiedType(null);
            }, 2000);
        });
    };

    return (
        <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden ${className}`}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
                        <Share2 size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">邀请好友，共享好礼</h4>
                        <p className="text-white/70 text-xs">每成功邀请一位新用户，双方均可得 200 积分</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Share Link */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">我的邀请链接</span>
                            <button
                                onClick={() => handleCopy(referralLink, 'link')}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-xs truncate font-medium text-white/90 bg-black/10 px-2 py-1.5 rounded-lg border border-black/5 italic">
                            {referralLink}
                        </p>
                    </div>

                    {/* Referral Code */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">我的专属邀请码</span>
                            <button
                                onClick={() => handleCopy(referralCode, 'code')}
                                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-2xl font-black tracking-[0.2em] text-center py-0.5">
                            {referralCode}
                        </p>
                    </div>
                </div>

                {/* Rewards Info */}
                <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-500 bg-slate-200 overflow-hidden">
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="avatar" />
                                </div>
                            ))}
                        </div>
                        <span className="text-xs font-medium text-white/80">已邀请 0 位好友</span>
                    </div>
                    <button className="flex items-center gap-2 text-xs font-bold hover:gap-3 transition-all">
                        <span>查看明细</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
