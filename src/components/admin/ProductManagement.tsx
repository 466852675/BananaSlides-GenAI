
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
    AlertCircle
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<AdminAPI.Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newProduct, setNewProduct] = useState({
        type: 'POINTS_PACKAGE',
        name: '',
        price: '',
        originalPrice: '',
        points: '',
        tags: '',
        features: '',
        sortOrder: '0',
        roleToGrant: ''  // 新增: 授权角色
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

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                type: newProduct.type,
                name: newProduct.name,
                price: Number(newProduct.price),
                originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
                points: Number(newProduct.points),
                tags: newProduct.tags.split(',').map(s => s.trim()).filter(Boolean),
                features: newProduct.features.split('\n').map(s => s.trim()).filter(Boolean),
                sortOrder: Number(newProduct.sortOrder),
                roleToGrant: newProduct.roleToGrant || undefined  // 新增: 授权角色
            };
            await AdminAPI.createProduct(payload);
        },
        onSuccess: () => {
            setIsAdding(false);
            setNewProduct({
                type: 'POINTS_PACKAGE',
                name: '',
                price: '',
                originalPrice: '',
                points: '',
                tags: '',
                features: '',
                sortOrder: '0',
                roleToGrant: ''  // 新增
            });
            loadProducts();
            alert('商品创建成功');
        },
        onError: (err: any) => alert(err.message || '创建失败')
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
        createMutation.mutate();
    };

    if (loading && products.length === 0) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="检索商品名称..."
                        className="w-full pl-10 pr-4 py-3 bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-xl text-sm focus:border-violet-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    添加商品
                </button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Add Card (Always First) */}
                <button
                    onClick={() => setIsAdding(true)}
                    className="border-2 border-dashed border-slate-300/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-violet-500 hover:text-violet-500 hover:bg-violet-50/50 transition-all duration-300 group min-h-[300px]"
                >
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors border border-slate-200 group-hover:scale-110 duration-300 shadow-sm">
                        <Plus size={32} />
                    </div>
                    <div className="font-bold text-sm tracking-wide">添加新商品上架</div>
                </button>

                {products.map(product => (
                    <div
                        key={product.id}
                        className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-lg shadow-slate-200/40 relative group overflow-hidden hover:-translate-y-1 transition-all duration-300"
                    >
                        {/* Background Decor */}
                        <div className={`absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110 pointer-events-none ${product.type === 'VIP_MONTHLY' ? 'text-amber-500' : 'text-blue-500'
                            }`}>
                            {product.type === 'VIP_MONTHLY' ? <Crown size={140} /> : <Coins size={140} />}
                        </div>

                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 ${product.type === 'VIP_MONTHLY'
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                                }`}>
                                {product.type === 'VIP_MONTHLY' ? <Crown size={28} /> : <Coins size={28} />}
                            </div>
                            <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-white/60">
                                <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-md transition-colors">
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    onClick={() => deleteMutation.mutate(product.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1 mb-6 relative z-10">
                            <div className="text-xl font-black text-slate-800 tracking-tight line-clamp-1">{product.name}</div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${product.type === 'VIP_MONTHLY'
                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                    : 'bg-blue-50 text-blue-600 border-blue-100'
                                    } uppercase tracking-widest`}>
                                    {product.type === 'VIP_MONTHLY' ? 'VIP Membership' : 'Points Package'}
                                </span>
                                {product.originalPrice && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest">
                                        Sale
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-6 relative z-10">
                            <span className="text-4xl font-black text-slate-800">¥{product.price}</span>
                            {product.originalPrice && (
                                <span className="text-sm text-slate-400 line-through font-bold">¥{product.originalPrice}</span>
                            )}
                        </div>

                        <div className="bg-slate-50/50 rounded-2xl p-4 space-y-2 mb-6 border border-slate-100/60 relative z-10 min-h-[100px]">
                            {product.features?.slice(0, 3).map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Check className="text-emerald-500 shrink-0" size={14} strokeWidth={4} />
                                    <span className="truncate">{f}</span>
                                </div>
                            ))}
                            {product.points > 0 && (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Check className="text-violet-500 shrink-0" size={14} strokeWidth={4} />
                                    赠送 {product.points} 积分
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
                            <div className="flex items-center gap-1 overflow-hidden">
                                {product.tags?.map((tag: string, i: number) => (
                                    <span key={i} className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Product Modal (Simple Implementation) */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4">
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-800">上架新商品</h2>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            {/* Type Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newProduct.type === 'POINTS_PACKAGE'
                                    ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={newProduct.type === 'POINTS_PACKAGE'}
                                        onChange={() => setNewProduct({ ...newProduct, type: 'POINTS_PACKAGE' })}
                                    />
                                    <Coins size={24} />
                                    <span className="font-bold text-sm">积分加油包</span>
                                </label>
                                <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${newProduct.type === 'VIP_MONTHLY'
                                    ? 'border-amber-500 bg-amber-50/50 text-amber-700'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}>
                                    <input
                                        type="radio"
                                        name="type"
                                        className="hidden"
                                        checked={newProduct.type === 'VIP_MONTHLY'}
                                        onChange={() => setNewProduct({ ...newProduct, type: 'VIP_MONTHLY' })}
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
                                        value={newProduct.name}
                                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none"
                                        placeholder="例如：专业版会员(月付)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">包含积分</label>
                                    <input
                                        type="number"
                                        required
                                        value={newProduct.points}
                                        onChange={e => setNewProduct({ ...newProduct, points: e.target.value })}
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
                                            value={newProduct.price}
                                            onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
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
                                            value={newProduct.originalPrice}
                                            onChange={e => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                            placeholder="19.9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">权益描述 (每行一条)</label>
                                <textarea
                                    value={newProduct.features}
                                    onChange={e => setNewProduct({ ...newProduct, features: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:border-violet-500 outline-none h-32 resize-none"
                                    placeholder="无限次 AI 生成&#10;解锁 4K 导出&#10;专属客服支持"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">标签 (逗号分隔)</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={newProduct.tags}
                                        onChange={e => setNewProduct({ ...newProduct, tags: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 font-bold focus:border-violet-500 outline-none"
                                        placeholder="热销, 限时优惠"
                                    />
                                </div>
                            </div>

                            {/* 授权角色选择 (仅 VIP 商品显示) */}
                            {newProduct.type === 'VIP_MONTHLY' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">购买后授权角色</label>
                                    <select
                                        value={newProduct.roleToGrant}
                                        onChange={e => setNewProduct({ ...newProduct, roleToGrant: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:border-violet-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">不授权角色</option>
                                        <option value="PROFESSIONAL">专业版 (PROFESSIONAL)</option>
                                        <option value="ENTERPRISE">企业版 (ENTERPRISE)</option>
                                    </select>
                                    <p className="text-xs text-slate-400">购买成功后自动提升用户角色</p>
                                </div>
                            )}

                            <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-100">
                                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                <div className="text-xs text-amber-700 font-medium">
                                    <p className="font-bold mb-1">注意</p>
                                    新上架商品将立即在商城前台可见。请确保价格与积分配置正确。VIP 商品会自动激活对应的会员权益。
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {createMutation.isPending ? '提交中...' : <><Save size={18} /> 确认上架</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
