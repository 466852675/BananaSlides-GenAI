
import React, { useEffect, useState } from 'react';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    ShoppingBag,
    Crown,
    Coins,
    Check
} from 'lucide-react';
import * as AdminAPI from '../../api/admin';

export const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<AdminAPI.Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

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

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="检索商品名称或描述..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-violet-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                    <Plus size={18} />
                    添加商品
                </button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map(product => (
                    <div
                        key={product.id}
                        className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-sm relative group overflow-hidden"
                    >
                        {/* Type Icon */}
                        <div className={`absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 transition-transform group-hover:scale-110 ${product.type === 'VIP_MONTHLY' ? 'text-amber-500' : 'text-blue-500'
                            }`}>
                            {product.type === 'VIP_MONTHLY' ? <Crown size={120} /> : <Coins size={120} />}
                        </div>

                        <div className="flex items-start justify-between mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${product.type === 'VIP_MONTHLY'
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                                }`}>
                                {product.type === 'VIP_MONTHLY' ? <Crown size={24} /> : <Coins size={24} />}
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
                                    <Edit3 size={16} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1 mb-6">
                            <div className="text-lg font-black text-slate-800 tracking-tight">{product.name}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {product.type === 'VIP_MONTHLY' ? 'VIP Membership' : 'Points Package'}
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2 mb-6">
                            <span className="text-3xl font-black text-slate-800">¥{product.price}</span>
                            {product.originalPrice && (
                                <span className="text-sm text-slate-400 line-through">¥{product.originalPrice}</span>
                            )}
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 space-y-2 mb-8 border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included Features</div>
                            {product.features?.slice(0, 3).map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Check className="text-emerald-500" size={12} strokeWidth={4} />
                                    {f}
                                </div>
                            ))}
                            {product.points > 0 && (
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <Check className="text-violet-500" size={12} strokeWidth={4} />
                                    赠送 {product.points} 积分
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-1">
                                {product.tags?.map((tag, i) => (
                                    <span key={i} className="text-[9px] font-black px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded border border-violet-100">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 tracking-wider">Status:</span>
                                <div className={`w-2 h-2 rounded-full ${product.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className="text-[10px] font-bold text-slate-600 uppercase">
                                    {product.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Create New Card */}
                <button
                    onClick={() => setIsAdding(true)}
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-violet-500 hover:text-violet-500 hover:bg-violet-50/50 transition-all duration-300 group"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors border border-slate-200">
                        <Plus size={32} />
                    </div>
                    <div className="font-bold text-sm tracking-wide">添加新商品</div>
                </button>
            </div>
        </div>
    );
};
