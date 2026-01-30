import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { Order } from '../../api/admin';
import {
    Loader2,
    Search,
    CheckCircle,
    XCircle,
    AlertCircle,
    ShoppingBag,
    Filter,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Calendar,
    User,
    RefreshCcw,
    Shield,
    Clock,
    RotateCcw
} from 'lucide-react';
import { ConfirmDialog } from '../ConfirmDialog';

export const OrderManagement: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [productNameFilter, setProductNameFilter] = useState<string>('');
    const [cycleFilter, setCycleFilter] = useState<string>('');
    const [keyword, setKeyword] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');

    const handleReset = () => {
        setPage(1);
        setStatusFilter('');
        setTypeFilter('');
        setProductNameFilter('');
        setCycleFilter('');
        setKeyword('');
        setStartDate('');
        setEndDate('');
        setMinAmount('');
        setMaxAmount('');
    };

    // Fetch products for filtering
    const { data: products, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['admin-products'],
        queryFn: AdminApi.getProducts,
    });

    // Refund Dialog State
    const [refundDialog, setRefundDialog] = useState<{
        isOpen: boolean;
        orderId: string | null;
        reason: string;
    }>({
        isOpen: false,
        orderId: null,
        reason: ''
    });

    // Fetch orders with pagination and filters
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-orders', page, statusFilter, typeFilter, productNameFilter, cycleFilter, keyword, startDate, endDate],
        queryFn: () => AdminApi.getOrders({
            page,
            pageSize: 8,
            status: statusFilter,
            type: typeFilter,
            productName: productNameFilter,
            cycle: cycleFilter,
            keyword,
            startDate,
            endDate,
            minAmount: minAmount !== '' ? Number(minAmount) : undefined,
            maxAmount: maxAmount !== '' ? Number(maxAmount) : undefined
        }),
    });

    // Refund mutation
    const refundMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            AdminApi.refundOrder(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            // Close dialog reset state
            setRefundDialog({ isOpen: false, orderId: null, reason: '' });
            alert('退款成功');
        },
        onError: (err: any) => {
            alert(`退款失败: ${err.message}`);
        }
    });

    const handleRefundClick = (order: Order) => {
        setRefundDialog({
            isOpen: true,
            orderId: order.id,
            reason: ''
        });
    };

    const handleConfirmRefund = () => {
        if (!refundDialog.orderId) return;
        if (!refundDialog.reason.trim()) {
            alert('请输入退款原因');
            return;
        }
        refundMutation.mutate({
            id: refundDialog.orderId,
            reason: refundDialog.reason
        });
    };

    const getFormatProductInfo = (name: string, type: string) => {
        if (!name) return { cycle: '-', tier: '-', isVip: false, full: '-' };

        let cycle = '';
        if (name.includes('年度') || name.includes('年') || name.includes('Year')) cycle = '年度';
        else if (name.includes('月度') || name.includes('月') || name.includes('Month')) cycle = '月度';

        let tier = '';
        if (name.includes('Enterprise') || name.includes('企业')) tier = '企业版';
        else if (name.includes('Premium') || name.includes('尊享')) tier = '尊享版';
        else if (name.includes('Pro') || name.includes('专业')) tier = '专业版';
        else if (name.includes('Basic') || name.includes('基础')) tier = '基础版';
        else if (name.includes('Standard') || name.includes('标准')) tier = '标准版';

        const isVip = type?.toLowerCase().includes('vip') || name.includes('会员') || name.includes('Member');
        const suffix = isVip ? '套餐' : '加油包';

        if (!cycle) cycle = '一次性';
        if (!tier) {
            // 处理积分加油包或其他产品
            tier = name.replace(/积分充值|年度|月度|加油包|套餐|会员| - /g, '').trim() || name;
        }

        return {
            cycle,
            tier: isVip ? `${tier}${suffix}` : tier,
            isVip,
            full: (cycle === '一次性' || cycle === '加油包') ? (isVip ? `${tier}${suffix}` : tier) : `${cycle}-${tier}${suffix}`
        };
    };

    const getFormatProductName = (name: string, type: string) => {
        return getFormatProductInfo(name, type).full;
    };

    const VipLevelBadge = ({ level }: { level?: number | null }) => {
        if (level === undefined || level === null) return <span className="text-slate-300">-</span>;
        const configs: Record<number, { label: string; bg: string; text: string; border: string }> = {
            0: { label: '免费版', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200' },
            1: { label: '基础版', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
            2: { label: '专业版', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
            3: { label: '尊享版', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
            4: { label: '企业版', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' }
        };
        const config = configs[level] || { label: `Lv.${level}`, bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-100' };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${config.bg} ${config.text} border ${config.border} whitespace-nowrap`}>
                {config.label}
            </span>
        );
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            'PAID': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'PENDING': 'bg-amber-50 text-amber-600 border-amber-100',
            'REFUNDED': 'bg-slate-50 text-slate-500 border-slate-200',
            'CANCELLED': 'bg-rose-50 text-rose-400 border-rose-100',
            'FAILED': 'bg-rose-50 text-rose-600 border-rose-100'
        };
        const labels: Record<string, string> = {
            'PAID': '已支付',
            'PENDING': '待支付',
            'REFUNDED': '已退款',
            'CANCELLED': '已取消',
            'FAILED': '支付失败'
        };
        return (
            <div className={`px-2 py-1 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 whitespace-nowrap w-fit min-w-[70px] ${styles[status] || 'bg-slate-50 text-slate-600'}`}>
                {status === 'PAID' && <CheckCircle size={12} />}
                {status === 'REFUNDED' && <RefreshCcw size={12} />}
                {status === 'PENDING' && <Clock size={12} />}
                {status === 'FAILED' && <XCircle size={12} />}
                <span className="leading-none">{labels[status] || status}</span>
            </div>
        );
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-[520px]">
            <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-violet-100 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="p-12 text-center text-red-500 bg-red-50 rounded-3xl border border-red-100">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h3 className="text-lg font-bold">无法加载订单数据</h3>
            <p className="text-sm opacity-80 mt-2">{(error as any).message}</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Intro */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">订单管理</h2>
                            <p className="text-blue-100 font-medium opacity-90 whitespace-nowrap">
                                追踪全站订单流水，处理退款申请与财务对账。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex items-center gap-1 min-w-max">
                    <div className="relative group w-40 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="搜索订单/用户..."
                            value={keyword}
                            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                        />
                    </div>
                    <div className="relative flex-shrink-0">
                        <CheckCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[85px]"
                        >
                            <option value="">状态</option>
                            <option value="PAID">已支付</option>
                            <option value="PENDING">待支付</option>
                            <option value="REFUNDED">已退款</option>
                            <option value="FAILED">失败</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="relative flex-shrink-0">
                        <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                                setProductNameFilter('');
                            }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[85px]"
                        >
                            <option value="">类型</option>
                            <option value="POINTS">积分</option>
                            <option value="VIP">会员</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="relative flex-shrink-0">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={cycleFilter}
                            onChange={(e) => {
                                setCycleFilter(e.target.value);
                                setPage(1);
                            }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[85px]"
                        >
                            <option value="">周期</option>
                            <option value="年度">年度</option>
                            <option value="月度">月度</option>
                            <option value="一次性">一次性</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="relative flex-shrink-0">
                        <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                            value={productNameFilter}
                            onChange={(e) => {
                                setProductNameFilter(e.target.value);
                                if (e.target.value) setTypeFilter('VIP');
                                setPage(1);
                            }}
                            className="pl-7 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[105px]"
                            disabled={isLoadingProducts}
                        >
                            <option value="">会员套餐</option>
                            {Array.from(new Set(products?.filter(p => p.type?.toLowerCase().includes('vip')).map(p => p.name.replace(/年度-|月度-/g, '')) || [])).map(baseName => (
                                <option key={baseName} value={baseName}>{baseName}</option>
                            ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50/50 p-1 rounded-lg border border-slate-100">
                        <div className="pl-1.5 flex items-center gap-1.5">
                            <CreditCard size={12} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500">金额</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                placeholder="Min"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="w-12 px-1 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none focus:border-blue-400 transition-all"
                            />
                            <span className="text-slate-300 text-[10px]">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="w-12 px-1 py-1 bg-white border border-slate-200 rounded text-[11px] font-medium outline-none focus:border-blue-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                        <span className="text-slate-300 font-bold text-[10px]">-</span>
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 focus:bg-white focus:border-blue-500 outline-none hover:bg-white transition-all w-[100px]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleReset}
                        className="px-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center group flex-shrink-0"
                        title="重置筛选"
                    >
                        <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[520px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100/60 bg-slate-50/50">
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">订单号</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">用户</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">类型</th>
                                <th className="text-center text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-3 whitespace-nowrap">变更前</th>
                                <th className="text-center text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-3 whitespace-nowrap">变更后</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">周期</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">产品内容</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">金额</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">状态</th>
                                <th className="text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">时间</th>
                                <th className="text-right text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 py-3 whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                            {data?.orders.map((order) => {
                                const info = getFormatProductInfo(order.productName, order.productType);
                                return (
                                    <tr key={order.id} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-bold text-slate-600 font-mono whitespace-nowrap">{order.orderNo?.substring(0, 10) || order.id.substring(0, 8)}...</span>
                                                <span className="text-[9px] text-slate-400">ID: {order.id.substring(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                    <User size={14} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-slate-700 leading-tight">{order.user?.nickname || '未知用户'}</span>
                                                    <span className="text-[10px] text-slate-400 leading-tight">{order.user?.email || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            {(order.productType?.toLowerCase().includes('vip') || order.productName.includes('会员')) ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-violet-100 text-violet-600 border border-violet-200 uppercase whitespace-nowrap">
                                                    会员
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-orange-100 text-orange-600 border border-orange-200 uppercase whitespace-nowrap">
                                                    积分
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <VipLevelBadge level={(order as any).beforeVipLevel} />
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <VipLevelBadge level={(order as any).afterVipLevel} />
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-black tracking-wider uppercase border border-slate-100 whitespace-nowrap">
                                                {info.cycle}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                                                    {info.isVip ? <Shield size={12} /> : <ShoppingBag size={12} />}
                                                </div>
                                                <span className="text-[13px] font-bold text-slate-600">
                                                    {info.tier}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="text-[13px] font-black text-slate-800 whitespace-nowrap">
                                                ¥{(order.finalPrice ?? order.originalPrice ?? 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StatusBadge status={order.status} />
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex flex-col whitespace-nowrap leading-tight">
                                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                                                    <Calendar size={10} />
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="text-[9px] text-slate-400 pl-3.5">
                                                    {new Date(order.createdAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {order.status === 'PAID' && (
                                                <button
                                                    onClick={() => handleRefundClick(order)}
                                                    className="p-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all shadow-sm flex items-center justify-center group"
                                                    disabled={refundMutation.isPending}
                                                    title="申请退款"
                                                >
                                                    <RotateCcw size={14} className={`${refundMutation.isPending ? 'animate-spin' : 'group-hover:-rotate-45 transition-transform'}`} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!data?.orders || data.orders.length === 0) && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                                        <ShoppingBag size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-medium">暂无订单数据</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div >

                {/* Pagination */}
                < div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30" >
                    <div className="text-sm text-slate-500 font-medium">
                        显示第 <span className="font-bold text-slate-800">{(page - 1) * 8 + 1}</span> 到 <span className="font-bold text-slate-800">{Math.min(page * 8, data?.pagination.total || 0)}</span> 条，共 <span className="font-bold text-slate-800">{data?.pagination.total || 0}</span> 条
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-700 shadow-sm">
                            {page} / {data?.pagination.totalPages || 1}
                        </span>
                        <button
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:border-violet-200 hover:text-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            disabled={page >= (data?.pagination.totalPages || 1)}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div >
            </div >

            <ConfirmDialog
                isOpen={refundDialog.isOpen}
                title="确认退款"
                message="请输入退款原因，确认后将原路返回款项，此操作不可撤销。"
                type="danger"
                confirmText="确认退款"
                cancelText="如果不取消"
                showInput={true}
                inputPlaceholder="例如：用户申请退款 / 订单异常 / 重复支付"
                inputValue={refundDialog.reason}
                onInputChange={(val) => setRefundDialog(prev => ({ ...prev, reason: val }))}
                onConfirm={handleConfirmRefund}
                onCancel={() => setRefundDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div >
    );
};
