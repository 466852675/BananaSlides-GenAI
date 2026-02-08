import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
    ShoppingBag,
    CheckCircle,
    Clock,
    RotateCcw,
    XCircle,
    User,
    Shield,
    Calendar,
    CreditCard,
    RefreshCcw,
    Loader2,
    AlertCircle,
    Search,
    Filter,
    DollarSign,
    Download,
    MessageSquare,
    Eye
} from 'lucide-react';
import * as AdminApi from '../../api/admin';
import { ConfirmDialog } from '../ConfirmDialog';
import {
    AdminPageHeader,
    AdminStatsTabs,
    AdminFilterBar,
    AdminSearchInput,
    AdminRangePicker,
    AdminDataTable,
    AdminPagination,
    AdminStatusBadge,
    AdminSelect,
    AdminActionRibbon
} from './shared';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderDetailDrawer } from './order/OrderDetailDrawer';

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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Order Detail Drawer State
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
        setSelectedIds([]);
    };

    // Fetch order stats for tabs
    const { data: orderStats } = useQuery<any>({
        queryKey: ['admin-orders-stats'],
        queryFn: AdminApi.getOrderStats,
    });

    // Fetch products for filtering
    const { data: products, isLoading: isLoadingProducts } = useQuery({
        queryKey: ['admin-products'],
        queryFn: AdminApi.getProducts,
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
            queryClient.invalidateQueries({ queryKey: ['admin-orders-stats'] });
            // Close dialog reset state
            setRefundDialog({ isOpen: false, orderId: null, reason: '' });
            toast.success('退款成功');
        },
        onError: (err: any) => {
            toast.error(`退款失败: ${err.message}`);
        }
    });

    const handleRefundClick = (order: AdminApi.Order) => {
        setRefundDialog({
            isOpen: true,
            orderId: order.id,
            reason: ''
        });
    };

    const handleRefundConfirm = () => {
        if (!refundDialog.orderId) return;
        if (!refundDialog.reason.trim()) {
            toast.error('请输入退款原因');
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
            <Loader2 className="animate-spin text-violet-500" size={40} />
        </div>
    );

    if (error) return (
        <div className="p-12 text-center text-rose-500 bg-rose-50 rounded-3xl border border-rose-100">
            <AlertCircle className="mx-auto mb-4" size={48} />
            <h3 className="text-lg font-bold">无法加载订单数据</h3>
            <p className="text-sm opacity-80 mt-2">{(error as any).message}</p>
        </div>
    );

    const orderTabs = [
        { id: '', label: '全部订单', count: orderStats?.total, icon: <ShoppingBag size={18} /> },
        { id: 'PAID', label: '已支付', count: orderStats?.paid, icon: <CheckCircle size={18} />, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
        { id: 'PENDING', label: '待支付', count: orderStats?.pending, icon: <Clock size={18} />, color: 'text-amber-500', bgColor: 'bg-amber-100' },
        { id: 'REFUNDED', label: '已退款', count: orderStats?.refunded, icon: <RotateCcw size={18} />, color: 'text-rose-500', bgColor: 'bg-rose-100' },
        { id: 'FAILED', label: '失败/重定向', count: orderStats?.failed, icon: <XCircle size={18} />, color: 'text-red-500', bgColor: 'bg-red-100' },
    ];

    const columns = [
        {
            header: '用户信息',
            key: 'user',
            render: (order: AdminApi.Order) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-sm overflow-hidden">
                        {order.user?.nickname ? (
                            <span className="text-[10px] font-black">{order.user.nickname.charAt(0).toUpperCase()}</span>
                        ) : (
                            <User size={14} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] font-black text-slate-800 truncate leading-tight">
                            {order.user?.nickname || (order.user?.email ? order.user.email.replace(/(.{2}).+(.{2})@/, "$1***$2@") : '未知用户')}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate leading-tight">{order.user?.email || '-'}</p>
                    </div>
                </div>
            )
        },
        {
            header: '订单/产品',
            key: 'productName',
            render: (order: AdminApi.Order) => (
                <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">{order.productName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter cursor-default" title="Order ID">ID#</span>
                        <p className="text-[10px] text-slate-400 font-mono font-bold leading-none">{order.id.substring(0, 8)}</p>
                        <span className="text-[10px] text-slate-200 mx-0.5">|</span>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter leading-none">{order.orderNo || 'NO_LINK'}</p>

                        {/* VIP Level Change Indicator */}
                        {order.beforeVipLevel !== null && order.afterVipLevel !== null && order.beforeVipLevel !== undefined && order.afterVipLevel !== undefined && (
                            <>
                                <span className="text-[10px] text-slate-200 mx-0.5">|</span>
                                <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                                    <span className="text-[9px] font-bold text-slate-400">Lv.{order.beforeVipLevel}</span>
                                    <span className="text-[9px] text-amber-400">→</span>
                                    <span className="text-[9px] font-black text-amber-600">Lv.{order.afterVipLevel}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )
        },
        {
            header: '类型/周期',
            key: 'productType',
            render: (order: AdminApi.Order) => (
                <div className="flex flex-col gap-1 items-start">
                    <AdminStatusBadge
                        status={order.productType?.toLowerCase().includes('vip') || order.productName.includes('会员') ? 'VIP' : 'POINTS'}
                        configs={{
                            'VIP': { label: '会员', className: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: <Shield size={10} /> },
                            'POINTS': { label: '积分', className: 'bg-amber-50 text-amber-600 border-amber-100', icon: <CreditCard size={10} /> }
                        }}
                    />
                    <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[9px] font-black uppercase border border-slate-100/60 ml-0.5">
                        {getFormatProductInfo(order.productName, order.productType).cycle}
                    </span>
                </div>
            )
        },
        {
            header: '金额',
            key: 'finalPrice',
            render: (order: AdminApi.Order) => (
                <div className="flex flex-col">
                    <span className="text-[14px] font-black text-violet-600 leading-tight">
                        ¥{(order.finalPrice ?? order.originalPrice ?? 0).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 mt-1 opacity-60">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Amount</span>
                    </div>
                </div>
            )
        },
        {
            header: '状态',
            key: 'status',
            render: (order: AdminApi.Order) => (
                <AdminStatusBadge
                    status={order.status}
                    configs={{
                        'PAID': { label: '已支付', className: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: <CheckCircle size={12} /> },
                        'PENDING': { label: '待支付', className: 'bg-amber-50 text-amber-600 border-amber-100', icon: <Clock size={12} /> },
                        'REFUNDED': { label: '已退款', className: 'bg-slate-50 text-slate-500 border-slate-200', icon: <RefreshCcw size={12} /> },
                        'CANCELLED': { label: '已取消', className: 'bg-rose-50 text-rose-400 border-rose-100' },
                        'FAILED': { label: '支付失败', className: 'bg-rose-50 text-rose-600 border-rose-100', icon: <XCircle size={12} /> }
                    }}
                />
            )
        },
        {
            header: '时间',
            key: 'createdAt',
            render: (order: AdminApi.Order) => (
                <div className="flex flex-col leading-tight whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <Calendar size={10} />
                        {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[9px] text-slate-400 pl-3.5">
                        {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                </div>
            )
        },
        {
            header: '操作',
            key: 'actions',
            align: 'right' as const,
            render: (order: AdminApi.Order) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedOrderId(order.id);
                            setIsDrawerOpen(true);
                        }}
                        className="p-1.5 bg-white border border-indigo-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 rounded-lg transition-all shadow-sm"
                        title="查看详情"
                    >
                        <Eye size={14} />
                    </button>
                    {order.status === 'PAID' && (
                        <button
                            onClick={() => handleRefundClick(order)}
                            className="p-1.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all shadow-sm"
                            disabled={refundMutation.isPending}
                            title="申请退款"
                        >
                            <RotateCcw size={14} className={refundMutation.isPending ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <AdminPageHeader
                icon={<ShoppingBag size={24} />}
                title="订单管理"
                description="追踪全站订单流水，处理退款申请与财务对账。"
                gradient="from-blue-600 to-indigo-600"
                shadowColor="shadow-blue-500/20"
                extraInfo={`Dashboard Revenue: ¥${(orderStats?.totalRevenue || 0).toLocaleString()}`}
            />

            <div className="space-y-4">
                {/* 第一行：综合筛选工具栏 (横向滚动模式) */}
                <div
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-white/60 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="relative group w-48 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="搜索单号/订单/用户..."
                            value={keyword}
                            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                        />
                    </div>

                    {/* 类型筛选 */}
                    <div className="relative flex-shrink-0">
                        <CreditCard className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${typeFilter ? 'text-indigo-500' : 'text-slate-400'}`} size={14} />
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setProductNameFilter(''); setPage(1); }}
                            className={`pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[100px] ${typeFilter ? 'text-indigo-600 bg-indigo-50/50 border-indigo-100' : 'text-slate-600'}`}
                        >
                            <option value="">所有类型</option>
                            <option value="POINTS">积分购买</option>
                            <option value="VIP">会员订阅</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    {/* 周期筛选 */}
                    <div className="relative flex-shrink-0">
                        <Clock className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${cycleFilter ? 'text-indigo-500' : 'text-slate-400'}`} size={14} />
                        <select
                            value={cycleFilter}
                            onChange={(e) => { setCycleFilter(e.target.value); setPage(1); }}
                            className={`pl-7 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black outline-none appearance-none cursor-pointer hover:bg-white transition-all min-w-[100px] ${cycleFilter ? 'text-indigo-600 bg-indigo-50/50 border-indigo-100' : 'text-slate-600'}`}
                        >
                            <option value="">所有周期</option>
                            <option value="年度">年度套餐</option>
                            <option value="月度">月度套餐</option>
                            <option value="一次性">一次性加包</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Filter size={10} />
                        </div>
                    </div>

                    {/* 日期聚合岛 */}
                    <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl flex-shrink-0 border border-slate-200/50">
                        <div className="relative group">
                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                className="pl-7 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[105px]"
                            />
                        </div>
                        <span className="text-slate-400 font-bold text-[10px]">→</span>
                        <div className="relative group">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                className="pl-2 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[105px]"
                            />
                        </div>
                    </div>

                    {/* 金额聚合岛 */}
                    <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl flex-shrink-0 border border-slate-200/50">
                        <div className="relative group">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
                            <input
                                type="number"
                                placeholder="Min ¥"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="pl-6 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[65px]"
                            />
                        </div>
                        <span className="text-slate-400 font-bold text-[10px]">:</span>
                        <div className="relative group">
                            <input
                                type="number"
                                placeholder="Max ¥"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="pl-2 pr-1 py-1 bg-transparent border-none text-[10px] font-bold text-slate-600 outline-none w-[65px]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleReset}
                        className="px-2 py-2 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all flex items-center justify-center group flex-shrink-0"
                        title="重置筛选"
                    >
                        <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                    </button>
                </div>

                {/* 第二行：状态页签 & 批量操作行 */}
                <div className="flex flex-col gap-4">
                    <AdminStatsTabs
                        tabs={orderTabs}
                        activeTab={statusFilter}
                        onChange={(id) => { setStatusFilter(id); setPage(1); }}
                    />

                    {/* 灵动操作栏 (Inline Mode) */}
                    <AdminActionRibbon
                        variant="inline"
                        selectedCount={selectedIds.length}
                        onClear={() => setSelectedIds([])}
                        subText="一键取消并重置"
                        onSubTextClick={() => {
                            setSelectedIds([]);
                            handleReset();
                        }}
                        tagLabel="BATCH"
                        actions={[
                            {
                                label: '导出',
                                icon: <Download size={14} />,
                                onClick: () => toast.success('正在导出选中订单...'),
                                variant: 'primary'
                            },
                            {
                                label: '备注',
                                icon: <MessageSquare size={14} />,
                                onClick: () => toast.success('功能开发中...'),
                                variant: 'secondary'
                            }
                        ]}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <AdminDataTable
                    columns={columns}
                    data={data?.orders || []}
                    isLoading={isLoading}
                    emptyState={<div className="text-slate-400 font-bold">暂无符合条件的订单数据</div>}
                    selectable={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />

                <AdminPagination
                    currentPage={page}
                    total={data?.pagination.total || 0}
                    pageSize={10}
                    onPageChange={setPage}
                />
            </div>

            <ConfirmDialog
                isOpen={refundDialog.isOpen}
                title="确认退款"
                message="请输入退款原因，确认后将原路返回款项，此操作不可撤销。"
                type="danger"
                confirmText="确认退款"
                cancelText="取消"
                showInput={true}
                inputPlaceholder="例如：用户申请退款 / 订单异常 / 重复支付"
                inputValue={refundDialog.reason}
                onInputChange={(val) => setRefundDialog(prev => ({ ...prev, reason: val }))}
                onConfirm={handleRefundConfirm}
                onCancel={() => setRefundDialog(prev => ({ ...prev, isOpen: false }))}
            />

            <OrderDetailDrawer
                orderId={selectedOrderId}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );
};
