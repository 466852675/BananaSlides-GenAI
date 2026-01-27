// src/components/CheckInModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Gift, Trophy, CheckCircle2, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCheckInStatus, performCheckIn, CheckInStatus } from '../api/growth';
import { useToast } from './Toast';

interface CheckInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (pointsGained: number) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [status, setStatus] = useState<CheckInStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [gainedPoints, setGainedPoints] = useState(0);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchStatus();
        }
    }, [isOpen]);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const data = await getCheckInStatus();
            setStatus(data);
        } catch (err) {
            addToast('获取签到状态失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!status?.canCheckIn || checkingIn) return;

        try {
            setCheckingIn(true);
            const res = await performCheckIn();
            setGainedPoints(res.points);
            setShowSuccess(true);

            // Refresh status
            await fetchStatus();

            if (onSuccess) onSuccess(res.points);
        } catch (err: any) {
            addToast(err.message || '签到失败', 'error');
        } finally {
            setCheckingIn(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
                {/* Header with Background */}
                <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">每日签到</h3>
                            <p className="text-blue-100 text-sm mt-0.5">坚持签到，领取更多积分奖励</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-slate-400 text-sm">正在同步签到状态...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Streak Info */}
                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">连续签到</p>
                                        <p className="text-lg font-bold text-slate-800">{status?.streak || 0} 天</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-medium">今日可领</p>
                                    <div className="flex items-center gap-1 text-blue-600 font-bold justify-end">
                                        <Coins size={14} />
                                        <span>{status?.rewardToday || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Weekly Progress */}
                            <div className="grid grid-cols-7 gap-2">
                                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                                    const isCompleted = (status?.streak || 0) >= day;
                                    const isToday = (status?.streak || 0) + (status?.canCheckIn ? 1 : 0) === day;
                                    const isBonus = day === 3 || day === 7;

                                    return (
                                        <div key={day} className="flex flex-col items-center gap-2">
                                            <div
                                                className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-300
                                                    ${isCompleted ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}
                                                    ${isToday && status?.canCheckIn ? 'ring-2 ring-blue-600 ring-offset-2 scale-105 bg-blue-50' : ''}
                                                `}
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 size={18} />
                                                ) : isBonus ? (
                                                    <Gift size={18} className={isToday ? 'text-blue-600 animate-bounce' : 'text-slate-300'} />
                                                ) : (
                                                    <span className="text-xs font-bold">{day}</span>
                                                )}

                                                {isBonus && !isCompleted && (
                                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" />
                                                )}
                                            </div>
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                                {day === 7 ? '礼包' : `D${day}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleCheckIn}
                                disabled={!status?.canCheckIn || checkingIn}
                                className={`w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3
                                    ${status?.canCheckIn
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                                `}
                            >
                                {checkingIn ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>签到中...</span>
                                    </>
                                ) : status?.canCheckIn ? (
                                    <>
                                        <SparklesIcon className="w-5 h-5" />
                                        <span>立即签到</span>
                                    </>
                                ) : (
                                    <span>明日再来</span>
                                )}
                            </button>

                            <p className="text-center text-xs text-slate-400">
                                连续签到 3 天和 7 天可获得额外惊喜礼包积分
                            </p>
                        </div>
                    )}
                </div>

                {/* Success Animation Overlay */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-white/95 z-[2] flex flex-col items-center justify-center p-8 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0.5, rotate: -45 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg mb-6"
                            >
                                <Coins size={48} className="text-white animate-pulse" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">签到成功！</h2>
                            <p className="text-slate-500 mb-8 px-4">
                                恭喜你获得 <span className="text-blue-600 font-bold">{gainedPoints}</span> 积分奖励
                            </p>
                            <button
                                onClick={() => {
                                    setShowSuccess(false);
                                    onClose();
                                }}
                                className="px-10 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                            >
                                收下奖励
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const SparklesIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
);
