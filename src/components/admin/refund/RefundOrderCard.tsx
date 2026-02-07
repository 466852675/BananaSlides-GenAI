import React from 'react';
import { ShoppingBag, Calendar, CreditCard, FileText, ArrowRight } from 'lucide-react';
import type { RefundOriginalOrder } from '@/api/refund';

interface RefundOrderCardProps {
    order: RefundOriginalOrder;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    PENDING: { label: '待支付', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    PAID: { label: '已支付', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    CANCELLED: { label: '已取消', color: 'text-slate-600', bgColor: 'bg-slate-100' },
    REFUNDED: { label: '已退款', color: 'text-violet-600', bgColor: 'bg-violet-100' },
    FAILED: { label: '失败', color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

const paymentMethodConfig: Record<string, { label: string; icon: string }> = {
    wechat: { label: '微信支付', icon: '💬' },
    alipay: { label: '支付宝', icon: '💳' },
    credit_card: { label: '银行卡', icon: '🏦' },
    points: { label: '积分兑换', icon: '⭐' },
};

export const RefundOrderCard: React.FC<RefundOrderCardProps> = ({ order }) => {
    const status = statusConfig[order.status] || statusConfig.PENDING;
    const paymentMethod = paymentMethodConfig[order.paymentMethod || ''] || { label: order.paymentMethod || '未知', icon: '💰' };
    const paidAt = order.paidAt ? new Date(order.paidAt).toLocaleString('zh-CN') : '未支付';

    return (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ShoppingBag size={18} className="text-violet-500" />
                原始订单
            </h3>

            <div className="space-y-3">
                {/* 订单号 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">订单号</span>
                    <span className="text-sm font-mono text-slate-700">{order.orderNo}</span>
                </div>

                {/* 商品名称 */}
                <div className="flex items-start justify-between">
                    <span className="text-sm text-slate-500">商品</span>
                    <span className="text-sm font-bold text-slate-800 text-right max-w-[60%]">
                        {order.productName}
                    </span>
                </div>

                {/* 订单金额 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">订单金额</span>
                    <span className="text-sm font-bold text-slate-800">¥{order.amount.toFixed(2)}</span>
                </div>

                {/* 支付方式 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">支付方式</span>
                    <span className="text-sm font-medium text-slate-700">
                        {paymentMethod.icon} {paymentMethod.label}
                    </span>
                </div>

                {/* 支付时间 */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">支付时间</span>
                    <span className="text-sm font-medium text-slate-700">{paidAt}</span>
                </div>

                {/* 订单状态 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm text-slate-500">状态</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${status.color} ${status.bgColor}`}>
                        {status.label}
                    </span>
                </div>

                {/* 产品类型标签 */}
                <div className="flex items-center gap-2 pt-2">
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                        {order.productType === 'points' ? '积分商品' : '付费产品'}
                    </span>
                </div>
            </div>
        </div>
    );
};
