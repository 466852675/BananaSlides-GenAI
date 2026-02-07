import React from 'react';
import { User, Mail, Calendar, CreditCard, Star, ShoppingBag } from 'lucide-react';
import type { RefundUserProfile } from '@/api/refund';

interface RefundUserCardProps {
    user: RefundUserProfile;
}

const vipLevelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    USER: { label: '普通用户', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    BASIC: { label: 'Basic', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    PROFESSIONAL: { label: 'Pro', color: 'text-violet-600', bgColor: 'bg-violet-100' },
    PREMIUM: { label: 'VIP', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    ENTERPRISE: { label: '企业版', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    ADMIN: { label: '管理员', color: 'text-rose-600', bgColor: 'bg-rose-100' },
    SUPER_ADMIN: { label: '超级管理员', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export const RefundUserCard: React.FC<RefundUserCardProps> = ({ user }) => {
    const vipConfig = vipLevelConfig[user.vipLevel] || vipLevelConfig.USER;
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const refundCountColor = user.refundCount > 0 ? 'text-rose-600' : 'text-emerald-600';

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <User size={18} className="text-violet-500" />
                用户画像
            </h3>
            
            <div className="space-y-3">
                {/* 用户名和VIP */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.nickname?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{user.nickname || '未知用户'}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${vipConfig.color} ${vipConfig.bgColor}`}>
                        {vipConfig.label}
                    </span>
                </div>

                {/* 邮箱 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Mail size={12} /> 邮箱
                    </span>
                    <span className="text-sm font-mono text-slate-600">{user.email || '---'}</span>
                </div>

                {/* 注册时长 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Calendar size={12} /> 注册时长
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                        {accountAge} 天
                    </span>
                </div>

                {/* 历史订单 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <ShoppingBag size={12} /> 历史订单
                    </span>
                    <span className="text-sm font-bold text-slate-800">{user.totalOrders} 笔</span>
                </div>

                {/* 累计消费 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <CreditCard size={12} /> 累计消费
                    </span>
                    <span className="text-sm font-bold text-violet-600">¥{user.totalSpent.toFixed(2)}</span>
                </div>

                {/* 退款次数 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Star size={12} /> 退款次数
                    </span>
                    <span className={`text-sm font-bold ${refundCountColor}`}>
                        {user.refundCount} 次
                    </span>
                </div>
            </div>
        </div>
    );
};
