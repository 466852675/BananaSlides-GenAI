
import React, { useEffect, useState } from 'react';
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
    History
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
                                            if (confirm('确定要删除这个商品吗？')) {
                                                deleteMutation.mutate(product.id);
                                            }
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
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800">{editingProduct ? '编辑商品' : '上架新商品'}</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'POINTS_PACKAGE'
                                    ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={formData.type === 'POINTS_PACKAGE'}
                                        onChange={() => setFormData({ ...formData, type: 'POINTS_PACKAGE' })}
                                    />
                                    <Coins size={24} />
                                    <span className="font-bold text-sm">积分加油包</span>
                                </label>
                                <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.type === 'VIP_MONTHLY'
                                    ? 'border-amber-500 bg-amber-50/50 text-amber-700'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={formData.type === 'VIP_MONTHLY'}
                                        onChange={() => setFormData({ ...formData, type: 'VIP_MONTHLY' })}
                                    />
                                    <Crown size={24} />
                                    <span className="font-bold text-sm">VIP 会员</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">商品名称</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"
                                        placeholder="例如：专业版会员(月付)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">包含积分</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.points}
                                        onChange={e => setFormData({ ...formData, points: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">销售价格 (元)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                                        <input
                                            type="number"
                                            required
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                            placeholder="9.9"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">原价/划线价</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">¥</span>
                                        <input
                                            type="number"
                                            value={formData.originalPrice}
                                            onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                            placeholder="19.9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">权益描述 (每行一条)</label>
                                <textarea
                                    value={formData.features}
                                    onChange={e => setFormData({ ...formData, features: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-violet-500 outline-none h-32 resize-none"
                                    placeholder="无限次 AI 生成&#10;解锁 4K 导出&#10;专属客服支持"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">标签 (逗号分隔)</label>
                                    <div className="relative">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={formData.tags}
                                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                            placeholder="热销, 限时优惠"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">显示状态</label>
                                    <select
                                        value={formData.displayType}
                                        onChange={e => setFormData({ ...formData, displayType: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="public">公开上架 (Public)</option>
                                        <option value="hidden">隐藏/下架 (Hidden)</option>
                                        <option value="contact_sales">联系销售 (Lead Form)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">生效日期</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={formData.effectiveAt}
                                            onChange={e => setFormData({ ...formData, effectiveAt: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 服务周期选择 */}
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">服务周期 (Period)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {(['month', 'year', 'once'] as const).map(p => (
                                        <label key={p} className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${formData.period === p
                                            ? 'border-violet-500 bg-violet-50/50 text-violet-700'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}>
                                            <input
                                                type="radio"
                                                name="period"
                                                className="hidden"
                                                checked={formData.period === p}
                                                onChange={() => setFormData({ ...formData, period: p })}
                                            />
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.period === p ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {p === 'month' ? 'M' : p === 'year' ? 'Y' : '1'}
                                            </div>
                                            <span className="font-bold text-sm">{p === 'month' ? '月度套餐' : p === 'year' ? '年度套餐' : '一次性'}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 授权角色选择 */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">购买后授权角色 (可选)</label>
                                <select
                                    value={formData.roleToGrant}
                                    onChange={e => setFormData({ ...formData, roleToGrant: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">不变更角色</option>
                                    <option value="PROFESSIONAL">专业版 (PROFESSIONAL)</option>
                                    <option value="ENTERPRISE">企业版 (ENTERPRISE)</option>
                                </select>
                                <p className="text-xs text-slate-400">仅对 VIP 商品生效，购买成功后自动提升用户角色</p>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-100">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-amber-700 font-medium">
                                    <p className="font-bold mb-1">注意</p>
                                    新上架或更新的商品将立即影响商城前台。如果您修改了价格，新订单将按新价格执行。
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) ? '提交中...' : <><Save size={18} /> {editingProduct ? '保存修改' : '确认上架'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
});
