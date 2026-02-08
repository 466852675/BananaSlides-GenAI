import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Clock, CheckCircle, XCircle, RefreshCcw, AlertTriangle, User, Box, DollarSign, Shield, CreditCard, Activity, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as AdminApi from '../../../api/admin';
import { AdminStatusBadge, AdminDrawer } from '../shared';

interface OrderDetailDrawerProps {
    orderId: string | null;
    isOpen: boolean;
    onClose: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({ orderId, isOpen, onClose }) => {

    const { data: order, isLoading } = useQuery({
        queryKey: ['admin-order-detail', orderId],
        queryFn: () => orderId ? AdminApi.getOrderById(orderId) : Promise.reject('No ID'),
        enabled: !!orderId && isOpen,
        staleTime: 0 // Always fetch fresh data
    });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`已复制 ${label}`);
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <AdminDrawer
            isOpen={isOpen}
            onClose={onClose}
            title="订单详情"
            description="查看完整的订单履约与支付记录"
            width="medium"
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                    <p className="text-sm font-medium">正在加载订单数据...</p>
                </div>
            ) : !order ? (
                <div className="text-center text-slate-400 py-12">
                    <AlertTriangle className="mx-auto mb-2 text-amber-400" size={32} />
                    <p>无法找到该订单信息</p>
                </div>
            ) : (
                <>
                    {/* 1. Status & Key Metrics */}
                    <div className="flex flex-wrap gap-4">
                        <AdminDrawer.Card className="flex-1 min-w-[140px] relative group" noPadding>
                            <div className="p-4 flex flex-col gap-2">
                                <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-transparent rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Status</span>
                                <div className="flex items-center gap-2 mt-auto">
                                    <AdminStatusBadge
                                        status={order.status}
                                        configs={{
                                            'PAID': { label: '已支付', className: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CheckCircle size={14} /> },
                                            'PENDING': { label: '待支付', className: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Clock size={14} /> },
                                            'REFUNDED': { label: '已退款', className: 'bg-slate-50 text-slate-500 border-slate-200', icon: <RefreshCcw size={14} /> },
                                            'CANCELLED': { label: '已取消', className: 'bg-rose-50 text-rose-400 border-rose-100' },
                                            'FAILED': { label: '支付失败', className: 'bg-rose-50 text-rose-600 border-rose-100', icon: <XCircle size={14} /> }
                                        }}
                                    />
                                </div>
                            </div>
                        </AdminDrawer.Card>

                        <AdminDrawer.Card className="flex-1 min-w-[140px] relative" noPadding>
                            <div className="p-4 flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                                <div className="flex items-baseline gap-1 mt-auto">
                                    <span className="text-2xl font-black text-slate-900">¥{(order.finalPrice ?? 0).toFixed(2)}</span>
                                    {order.discountPrice && parseFloat(String(order.discountPrice)) > 0 && (
                                        <span className="text-xs text-slate-400 line-through">¥{order.originalPrice}</span>
                                    )}
                                </div>
                                {order.discountPrice && parseFloat(String(order.discountPrice)) > 0 && (
                                    <span className="text-[10px] text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded w-fit font-bold">
                                        已优惠 ¥{order.discountPrice}
                                    </span>
                                )}
                            </div>
                        </AdminDrawer.Card>
                    </div>

                    {/* 2. User & Risk Info */}
                    <AdminDrawer.Section
                        title="用户信息 (User Profile)"
                        icon={User}
                        extra={
                            (order.user?.riskScore || 0) > 50 && (
                                <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-100">
                                    <AlertTriangle size={10} />
                                    High Risk: {order.user?.riskScore}
                                </div>
                            )
                        }
                    >
                        <AdminDrawer.Card noPadding>
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-black shrink-0 font-sans">
                                    {order.user?.avatar ? <img src={order.user.avatar} className="w-full h-full rounded-full object-cover" /> : (order.user?.nickname?.[0]?.toUpperCase() || 'U')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-sm truncate">{order.user?.nickname || '未知用户'}</p>
                                        <button
                                            onClick={() => copyToClipboard(order.userId, '用户ID')}
                                            className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors font-mono"
                                        >
                                            {order.userId.substring(0, 8)}...
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                        {order.user?.email}
                                        <Copy size={10} className="ml-1 cursor-pointer hover:text-indigo-500 transition-colors" onClick={() => copyToClipboard(order.user?.email || '', '邮箱')} />
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1 font-bold"><Box size={10} /> {order.user?.projectCount || 0} Projects</span>
                                        <span className="flex items-center gap-1 font-bold"><DollarSign size={10} /> ¥{(order.user?.totalSpent || 0).toFixed(2)} Spent</span>
                                    </div>
                                </div>
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* 3. Product & Fulfillment */}
                    <AdminDrawer.Section title="商品与履约" icon={Box}>
                        <AdminDrawer.Card className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md">
                                    {order.productType === 'VIP' ? <Shield size={24} /> : <CreditCard size={24} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-slate-800 tracking-tight">{order.productName}</h4>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{order.productDesc || '无商品描述'}</p>
                                        </div>
                                        <span className="text-sm font-black text-slate-800">x{order.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${order.productType === 'VIP'
                                            ? 'bg-purple-50 text-purple-600 border-purple-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            {order.productType}
                                        </span>
                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-bold">
                                            {order.productType === 'VIP' ? '自动续期' : '一次性购买'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Fulfillment Snapshot */}
                            {(order.status === 'PAID' || order.status === 'REFUNDED') && (
                                <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 border-dashed">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-1.5 tracking-widest">
                                        <Activity size={10} className="text-indigo-500" /> 履约快照 (Snapshot)
                                    </div>
                                    <div className="space-y-2">
                                        <AdminDrawer.KeyValue
                                            label="VIP 变更"
                                            value={
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <span className="text-slate-400">Lv.{order.beforeVipLevel ?? '?'}</span>
                                                    <ChevronRight size={10} className="text-slate-300" />
                                                    <span className="text-indigo-600">Lv.{order.afterVipLevel ?? '?'}</span>
                                                </div>
                                            }
                                        />
                                        <AdminDrawer.KeyValue
                                            label="履约时间"
                                            icon={Clock}
                                            value={<span className="font-mono text-slate-500 text-[11px] font-bold">{formatDate(order.fulfillmentAt || order.paidAt)}</span>}
                                        />
                                    </div>
                                </div>
                            )}
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* 4. Timeline */}
                    <AdminDrawer.Section title="订单时间轴 (Timeline)" icon={Clock}>
                        <AdminDrawer.Card>
                            <div className="relative pl-2 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                                {/* Created */}
                                <div className="relative flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    </div>
                                    <div className="flex-1 -mt-1">
                                        <p className="text-xs font-bold text-slate-700">订单创建 (Created)</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono">{formatDate(order.createdAt)}</p>
                                    </div>
                                </div>

                                {/* Paid */}
                                {order.paidAt && (
                                    <div className="relative flex gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                                            <CheckCircle size={10} className="text-emerald-600" />
                                        </div>
                                        <div className="flex-1 -mt-1">
                                            <p className="text-xs font-bold text-slate-700">支付成功 (Payment Success)</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono">{formatDate(order.paidAt)}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[10px] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-emerald-600 font-black tracking-tighter">
                                                    {order.paymentMethod || 'Unknown'}
                                                </span>
                                                <span className="text-[10px] text-slate-300 font-mono truncate max-w-[150px] font-bold tracking-tighter" title={order.paymentNo || ''}>
                                                    {order.paymentNo || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Refunded */}
                                {order.refundedAt && (
                                    <div className="relative flex gap-3">
                                        <div className="w-5 h-5 rounded-full bg-rose-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                                            <RefreshCcw size={10} className="text-rose-600" />
                                        </div>
                                        <div className="flex-1 -mt-1">
                                            <p className="text-xs font-bold text-slate-700">已退款 (Refunded)</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono">{formatDate(order.refundedAt)}</p>
                                            {order.refundReason && (
                                                <p className="text-[11px] text-rose-500 mt-2 bg-rose-50 px-2 py-1 rounded inline-block font-bold">
                                                    原因: {order.refundReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </AdminDrawer.Card>
                    </AdminDrawer.Section>

                    {/* Footer Information */}
                    <div className="text-center text-[10px] text-slate-300 pb-2 font-mono font-bold tracking-tight">
                        UUID: {order.id}<br />
                        TS: {order.createdAt}
                    </div>
                </>
            )}
        </AdminDrawer>
    );
};
