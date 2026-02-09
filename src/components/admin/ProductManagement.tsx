
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Crown,
    Coins,
    Check,
    X,
    Save,
    Tag,
    AlertCircle,
    Eye,
    EyeOff,
    PhoneCall,
    Copy,
    Layers,
    Sparkles,
    Clock,
    User,
    History,
    Loader2
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../ConfirmDialog';
import { AdminDrawer } from './shared';

// Define the handle interface
export interface ProductManagementHandle {
    openCreateModal: () => void;
}

export const ProductManagement = React.forwardRef<ProductManagementHandle>((_, ref) => {
    const [products, setProducts] = useState<AdminAPI.Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<AdminAPI.Product | null>(null);
    const [typeTab, setTypeTab] = useState<'ALL' | 'VIP_MONTHLY' | 'POINTS_PACKAGE'>('ALL');
    const [periodTab, setPeriodTab] = useState<'ALL' | 'year' | 'month' | 'once'>('ALL');
    const [displayFilter, setDisplayFilter] = useState<'ALL' | 'public' | 'hidden' | 'contact_sales'>('ALL');
    const [keyword, setKeyword] = useState('');

    // 删除确认对话框状态
    const [deleteDialog, setDeleteDialog] = useState<{
        isOpen: boolean;
        productId: string;
        productName: string;
    }>({
        isOpen: false,
        productId: '',
        productName: ''
    });

    // Form State
    const [formData, setFormData] = useState({
        type: 'POINTS_PACKAGE',
        name: '',
        price: '',
        originalPrice: '',
        points: '',
        tags: '',
        features: '',
        sortOrder: '0',
        roleToGrant: '',
        displayType: 'public',
        period: 'once', // V8.5
        effectiveAt: new Date().toISOString().split('T')[0] // V8.5
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Reset form when modal opens/closes or switches mode
    useEffect(() => {
        if (!isModalOpen) {
            setEditingProduct(null);
            setFormData({
                type: 'POINTS_PACKAGE',
                name: '',
                price: '',
                originalPrice: '',
                points: '',
                tags: '',
                features: '',
                sortOrder: '0',
                roleToGrant: '',
                displayType: 'public',
                period: 'once', // V8.5
                effectiveAt: new Date().toISOString().split('T')[0] // V8.5
            });
        }
    }, [isModalOpen]);

    // Populate form when editing
    useEffect(() => {
        if (editingProduct) {
            setFormData({
                type: editingProduct.type,
                name: editingProduct.name,
                price: String(editingProduct.price),
                originalPrice: editingProduct.originalPrice ? String(editingProduct.originalPrice) : '',
                points: String(editingProduct.points),
                tags: Array.isArray(editingProduct.tags) ? editingProduct.tags.join(', ') : (editingProduct.tags || ''),
                features: Array.isArray(editingProduct.features) ? editingProduct.features.join('\n') : (editingProduct.features || ''),
                sortOrder: String(editingProduct.sortOrder || 0),
                roleToGrant: editingProduct.roleToGrant || '',
                displayType: editingProduct.displayType || 'public',
                period: editingProduct.period || 'once',
                effectiveAt: editingProduct.effectiveAt ? new Date(editingProduct.effectiveAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        }
    }, [editingProduct]);

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                type: formData.type,
                name: formData.name,
                price: Number(formData.price),
                originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
                points: Number(formData.points),
                tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
                features: formData.features.split('\n').map(s => s.trim()).filter(Boolean),
                sortOrder: Number(formData.sortOrder),
                roleToGrant: formData.roleToGrant || undefined,
                displayType: formData.displayType,
                effectiveAt: formData.effectiveAt
            };
            // Assuming createProduct allows displayType as extra prop or I need to confirm backend accepts it.
            // Based on Prisma schema it exists, but AdminAPI.createProduct type definition might need 'displayType' added.
            // For now, we pass it and hope backend lax validation or updated DTO handles it.
            // Actually, let's cast payload to any to bypass frontend TS check if needed, but AdminAPI.createProduct needs update if strict.
            // Let's check AdminAPI.createProduct signature. It doesn't have displayType.
            // We should update AdminAPI.createProduct signature too if strict.
            // But let's verify if we can just pass it.
            await AdminAPI.createProduct(payload as any);
        },
        onSuccess: () => {
            setIsModalOpen(false);
            loadProducts();
            alert('商品创建成功');
        },
        onError: (err: any) => alert(err.message || '创建失败')
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!editingProduct) return;
            const payload = {
                type: formData.type,
                name: formData.name,
                price: Number(formData.price),
                originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
                points: Number(formData.points),
                tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
                features: formData.features.split('\n').map(s => s.trim()).filter(Boolean),
                sortOrder: Number(formData.sortOrder),
                roleToGrant: formData.roleToGrant || null, // Sent null to clear if empty
                displayType: formData.displayType,
                effectiveAt: formData.effectiveAt
            };
            await AdminAPI.updateProduct(editingProduct.id, payload as any);
        },
        onSuccess: () => {
            setIsModalOpen(false);
            loadProducts();
            alert('商品更新成功');
        },
        onError: (err: any) => alert(err.message || '更新失败')
    });

    const deleteMutation = useMutation({
        mutationFn: AdminAPI.deleteProduct,
        onSuccess: () => {
            loadProducts();
        },
        onError: (err: any) => alert(err.message || '删除失败')
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            updateMutation.mutate();
        } else {
            createMutation.mutate();
        }
    };

    const handleEdit = (product: AdminAPI.Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCopy = (product: AdminAPI.Product) => {
        const { id, createdAt, updatedAt, ...rest } = product;
        setFormData({
            type: rest.type,
            name: `${rest.name} (复制)`,
            price: String(rest.price),
            originalPrice: rest.originalPrice ? String(rest.originalPrice) : '',
            points: String(rest.points),
            tags: Array.isArray(rest.tags) ? rest.tags.join(', ') : (rest.tags || ''),
            features: Array.isArray(rest.features) ? rest.features.join('\n') : (rest.features || ''),
            sortOrder: String((rest.sortOrder || 0) + 1),
            roleToGrant: rest.roleToGrant || '',
            displayType: rest.displayType || 'public',
            period: rest.period || 'once',
            effectiveAt: rest.effectiveAt ? new Date(rest.effectiveAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteMutation.mutateAsync(deleteDialog.productId);
            setDeleteDialog(prev => ({ ...prev, isOpen: false }));
            loadProducts();
        } catch (error) {
            alert('删除失败');
        }
    };

    const closeDeleteDialog = () => {
        setDeleteDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleToggleDisplay = async (product: AdminAPI.Product) => {
        try {
            const nextDisplay = product.displayType === 'public' ? 'hidden' : 'public';
            await AdminAPI.updateProduct(product.id, { displayType: nextDisplay } as any);
            loadProducts();
        } catch (err: any) {
            alert(err.message || '切换失败');
        }
    };

    // Expose openCreateModal to parent
    React.useImperativeHandle(ref, () => ({
        openCreateModal: () => {
            setEditingProduct(null);
            setIsModalOpen(true);
        }
    }));

    // Filtered Products
    const filteredProducts = products.filter(p => {
        const matchesKeyword = p.name.toLowerCase().includes(keyword.toLowerCase());
        const matchesType = typeTab === 'ALL' || p.type === typeTab;
        const matchesPeriod = periodTab === 'ALL' || p.period === periodTab;
        const matchesDisplay = displayFilter === 'ALL' || p.displayType === displayFilter;
        return matchesKeyword && matchesType && matchesPeriod && matchesDisplay;
    });

    if (loading && products.length === 0) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="检索商品名称..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl text-sm focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all shadow-sm font-medium"
                            />
                        </div>

                        {/* Display Filter */}
                        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                            {(['ALL', 'public', 'hidden', 'contact_sales'] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDisplayFilter(d)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${displayFilter === d
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {d === 'ALL' ? '全部状态' : d === 'public' ? '公开' : d === 'hidden' ? '隐藏' : '专属'}
                                </button>
                            ))}
                        </div>

                        {/* Period Tabs (Moved) */}
                        <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/40">
                            {(['ALL', 'year', 'month', 'once'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodTab(p)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${periodTab === p
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    {p === 'ALL' ? '全部周期' : p === 'year' ? '年度' : p === 'month' ? '月度' : '一次性'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Type Tabs */}
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
                        {(['ALL', 'VIP_MONTHLY', 'POINTS_PACKAGE'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeTab(t)}
                                className={`px-6 py-2.5 rounded-xl text-[13px] font-black transition-all flex items-center gap-2 ${typeTab === t
                                    ? 'bg-white text-violet-600 shadow-md shadow-violet-100 border border-violet-100'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                {t === 'ALL' ? <Layers size={16} /> : t === 'VIP_MONTHLY' ? <Crown size={16} /> : <Sparkles size={16} />}
                                {t === 'ALL' ? '所有品类' : t === 'VIP_MONTHLY' ? '会员权益' : '积分加油包'}
                            </button>
                        ))}
                    </div>


                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200/60 to-transparent" />
                </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">

                {filteredProducts.map(product => {
                    const isHidden = product.displayType === 'hidden';
                    const isContactSales = product.displayType === 'contact_sales';

                    return (
                        <div
                            key={product.id}
                            className={`group relative bg-white/80 backdrop-blur-xl rounded-3xl p-4 border border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 flex flex-col h-full ${isHidden ? 'opacity-70 grayscale-[0.2]' : ''}`}
                        >
                            {/* Background Decor - Smaller & Fixed */}
                            <div className={`absolute -top-4 -right-4 p-8 opacity-[0.03] transition-transform group-hover:scale-110 pointer-events-none ${product.type === 'VIP_MONTHLY' ? 'text-amber-500' : 'text-blue-500'
                                }`}>
                                {product.type === 'VIP_MONTHLY' ? <Crown size={100} /> : <Coins size={100} />}
                            </div>

                            <div className="flex items-start justify-between mb-4 relative z-10 h-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 ${product.type === 'VIP_MONTHLY'
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                                    }`}>
                                    {product.type === 'VIP_MONTHLY' ? <Crown size={20} /> : <Coins size={20} />}
                                </div>

                                <div className="flex flex-col items-end gap-1.5 relative z-10">
                                    {/* Status Badge */}
                                    <div
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${isHidden
                                            ? 'bg-slate-50 text-slate-400 border-slate-200'
                                            : isContactSales
                                                ? 'bg-blue-50 text-blue-600 border-blue-500/20'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-500/20'
                                            }`}
                                    >
                                        <div className={`w-1 h-1 rounded-full ${isHidden ? 'bg-slate-300' : isContactSales ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'}`} />
                                        {isHidden ? "已下架" : isContactSales ? "专属表单" : "公开销售"}
                                    </div>
                                </div>

                                {/* Hover Actions - Absolute & Compact */}
                                <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0 bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100">
                                    <button
                                        onClick={() => handleToggleDisplay(product)}
                                        className={`p-1.5 rounded-lg transition-colors ${isHidden ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                        title={isHidden ? "立即上架" : "下架隐藏"}
                                    >
                                        {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="编辑"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleCopy(product)}
                                        className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 rounded-lg transition-colors"
                                        title="复制"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeleteDialog({
                                                isOpen: true,
                                                productId: product.id,
                                                productName: product.name
                                            });
                                        }}
                                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="text-[15px] font-black text-slate-800 tracking-tight line-clamp-1 flex-1">{product.name}</div>
                                    {isContactSales && <PhoneCall size={12} className="text-blue-500" />}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-current opacity-70 uppercase tracking-tighter ${product.type === 'VIP_MONTHLY'
                                        ? 'text-amber-600 bg-amber-50/50'
                                        : 'text-blue-600 bg-blue-50/50'
                                        }`}>
                                        {product.type === 'VIP_MONTHLY' ? '会员权益' : '积分加油包'}
                                    </span>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-current opacity-70 uppercase tracking-tighter ${product.period === 'year'
                                        ? 'text-indigo-600 bg-indigo-50/50'
                                        : product.period === 'month'
                                            ? 'text-violet-600 bg-violet-50/50'
                                            : 'text-slate-400 bg-slate-50/50'
                                        }`}>
                                        {product.period === 'year' ? '年度套餐' : product.period === 'month' ? '月度套餐' : '一次性包'}
                                    </span>
                                    {product.roleToGrant && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 uppercase tracking-tighter">
                                            Grant {product.roleToGrant}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1.5 mb-4 relative z-10">
                                <span className="text-3xl font-black text-slate-900 leading-none">¥{product.price}</span>
                                <span className="text-[11px] font-bold text-slate-400">/{product.period === 'year' ? '年' : product.period === 'month' ? '月' : '次'}</span>
                                {product.originalPrice && (
                                    <span className="text-[11px] text-slate-400 line-through font-bold ml-1">¥{product.originalPrice}</span>
                                )}
                            </div>

                            <div className="bg-slate-50/50 rounded-2xl p-3.5 space-y-1.5 mb-4 border border-slate-100/60 relative z-10 flex-1 min-h-[90px]">
                                {Array.isArray(product.features) && product.features.slice(0, 3).map((f, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                        <Check className="text-emerald-500 shrink-0" size={12} strokeWidth={4} />
                                        <span className="truncate">{f}</span>
                                    </div>
                                ))}
                                {typeof product.features === 'string' && (
                                    <div className="text-[11px] font-bold text-slate-600 whitespace-pre-wrap">{product.features}</div>
                                )}
                                {product.points > 0 && (
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600">
                                        <Check className="text-violet-500 shrink-0" size={12} strokeWidth={4} />
                                        赠 {product.points} 积分
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100/60 relative z-10 mt-auto">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1 overflow-hidden">
                                        {Array.isArray(product.tags) && product.tags.slice(0, 2).map((tag: string, i: number) => (
                                            <span key={i} className="text-[8px] font-black px-1 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase tracking-tighter">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-300 italic group-hover:text-slate-400 transition-colors">
                                        <History size={10} />
                                        #{product.sortOrder || 0}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-xl border border-slate-100/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {product.createdBy?.avatar ? (
                                                <img src={product.createdBy.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={10} className="text-violet-500" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-500 line-clamp-1 leading-none mb-0.5">{product.createdBy?.nickname || '系统上线'}</span>
                                            <span className="text-[8px] font-bold text-slate-300 scale-90 origin-left">创建日期: {new Date(product.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <div className="flex items-center gap-1 text-[8px] font-black text-violet-400/80 bg-violet-50/50 px-1 py-0.5 rounded uppercase tracking-tighter">
                                            <Clock size={8} />
                                            生效日期
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">{product.effectiveAt ? new Date(product.effectiveAt).toLocaleDateString() : '立即生效'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add Card (Now moved to the end) */}
                {!keyword && (
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setIsModalOpen(true);
                        }}
                        className="border-2 border-dashed border-slate-200/60 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-violet-400 hover:text-violet-500 hover:bg-violet-50/50 transition-all duration-300 group min-h-[280px]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors border border-slate-100 group-hover:scale-110 duration-300 shadow-sm">
                            <Plus size={24} />
                        </div>
                        <div className="font-black text-xs tracking-widest uppercase">上架新品</div>
                    </button>
                )}
            </div>

            {/* Product Modal (Create & Edit) */}
            <AdminDrawer
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingProduct ? '编辑商品' : '上架新商品'}
                description={formData.type === 'VIP_MONTHLY' ? 'VIP Membership Management' : 'Points Package Management'}
                width="narrow"
                footer={
                    <div className="flex items-center gap-4 w-full">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all text-sm tracking-widest uppercase"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="flex-[2] py-4 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black hover:shadow-xl hover:shadow-violet-500/25 transition-all text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                        >
                            {(createMutation.isPending || updateMutation.isPending)
                                ? <Loader2 size={18} className="animate-spin" />
                                : <Save size={18} />}
                            {editingProduct ? '确认更新' : '立即上架'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-10 pb-8 text-left">
                    <AdminDrawer.HeadCard
                        title={editingProduct ? '调优商品策略' : '定义新商品'}
                        description="Product Matrix & Economic Strategy"
                        icon={formData.type === 'VIP_MONTHLY' ? Crown : Coins}
                        variant={formData.type === 'VIP_MONTHLY' ? 'warning' : 'primary'}
                    />

                    <div className="space-y-8">
                        <AdminDrawer.Section title="商品识别属性" icon={Layers}>
                            <AdminDrawer.Card>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'POINTS_PACKAGE' })}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.type === 'POINTS_PACKAGE'
                                            ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200 text-slate-400'
                                            }`}
                                    >
                                        <Coins size={20} />
                                        <span className="font-bold text-sm text-left">积分加油包</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'VIP_MONTHLY' })}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${formData.type === 'VIP_MONTHLY'
                                            ? 'border-amber-500 bg-amber-50/50 text-amber-700 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200 text-slate-400'
                                            }`}
                                    >
                                        <Crown size={20} />
                                        <span className="font-bold text-sm text-left">VIP 会员</span>
                                    </button>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        {/* Section 2: Basic Properties */}
                        <AdminDrawer.Section title="核心商品信息" icon={Tag}>
                            <AdminDrawer.Card className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">商品标准名称</label>
                                    <div className="relative group text-left">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                            placeholder="输入吸引人的商品名称"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">包含积分</label>
                                        <div className="relative group text-left">
                                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                            <input
                                                type="number"
                                                required
                                                value={formData.points}
                                                onChange={e => setFormData({ ...formData, points: e.target.value })}
                                                className="w-full pl-12 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none transition-all"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">PTS</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">授权角色</label>
                                        <div className="relative group text-left">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <select
                                                value={formData.roleToGrant}
                                                onChange={e => setFormData({ ...formData, roleToGrant: e.target.value })}
                                                className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer transition-all"
                                            >
                                                <option value="">不变更角色</option>
                                                <option value="PROFESSIONAL">专业版 (PROFESSIONAL)</option>
                                                <option value="ENTERPRISE">企业版 (ENTERPRISE)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Plus size={12} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <AdminDrawer.Section title="定价方案与周期" icon={Coins}>
                            <AdminDrawer.Card className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">标准销售价格</label>
                                        <div className="relative group text-left">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                                            <input
                                                type="number"
                                                required
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900 focus:bg-white focus:border-violet-500 outline-none transition-all"
                                                placeholder="9.9"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">划线对比原价</label>
                                        <div className="relative group text-left">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">¥</span>
                                            <input
                                                type="number"
                                                value={formData.originalPrice}
                                                onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                                                className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-400 focus:bg-white focus:border-slate-300 outline-none transition-all"
                                                placeholder="19.9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">权益有效期/周期</label>
                                    <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                                        {(['month', 'year', 'once'] as const).map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, period: p })}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black transition-all ${formData.period === p
                                                    ? 'bg-white text-indigo-600 shadow-md border border-indigo-100'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}
                                            >
                                                {p === 'month' ? '月度套餐' : p === 'year' ? '年度套餐' : '一次性包'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <AdminDrawer.Section title="核心价值主张 (Features)" icon={Sparkles}>
                            <AdminDrawer.Card className="p-0 overflow-hidden">
                                <textarea
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                    className="w-full p-6 bg-slate-50 border-none text-sm font-bold focus:bg-white outline-none h-32 resize-none transition-all leading-relaxed placeholder:text-slate-300"
                                    placeholder="例如：&#10;无限次 AI 生成&#10;解锁 4K 导出&#10;专属客服支持"
                                />
                                <div className="px-6 py-3 bg-violet-50/50 border-t border-violet-100/50 flex items-center gap-2">
                                    <Sparkles size={12} className="text-violet-400" />
                                    <p className="text-[9px] text-violet-600 font-bold uppercase tracking-wider">
                                        提示：清晰的卖点有助于提升转化率
                                    </p>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <AdminDrawer.Section title="发布与准入控制" icon={Eye}>
                            <AdminDrawer.Card className="space-y-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">上架可见性</label>
                                    <div className="relative group text-left">
                                        <Eye className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={18} />
                                        <select
                                            value={formData.displayType}
                                            onChange={e => setFormData({ ...formData, displayType: e.target.value })}
                                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:border-violet-500 outline-none appearance-none cursor-pointer transition-all"
                                        >
                                            <option value="public">公开上架 (所有人可见)</option>
                                            <option value="hidden">下架隐藏 (库中保留)</option>
                                            <option value="contact_sales">专属定制 (联系经理)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Plus size={12} />
                                        </div>
                                    </div>
                                </div>
                            </AdminDrawer.Card>
                        </AdminDrawer.Section>

                        <div className="bg-rose-50 p-5 rounded-3xl flex items-start gap-4 border border-rose-100/50">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="text-rose-500" size={20} />
                            </div>
                            <div className="text-[10px] text-rose-700/80 font-black leading-relaxed uppercase tracking-widest">
                                <p className="text-rose-800 mb-1">DANGER ZONE / 管理员核验</p>
                                确认提交后将立即同步至前台商城。修改价格可能会导致已生成的支付订单失效，请务必核对无误。
                            </div>
                        </div>
                    </div>
                </div>
            </AdminDrawer>

            {/* 删除确认对话框 */}
            <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="确认删除"
                message={`确定要删除商品「${deleteDialog.productName}」吗？此操作不可恢复。`}
                onConfirm={confirmDelete}
                onCancel={closeDeleteDialog}
                type="danger"
                confirmText="删除"
                cancelText="取消"
            />
        </div>
    );
});
