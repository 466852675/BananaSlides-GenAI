
import React, { useState, useRef } from 'react';
import { Plus, ShoppingBag, Settings2 } from 'lucide-react';
import { ProductManagement, ProductManagementHandle } from './ProductManagement';
import { GrowthStats } from './GrowthStats';
import { ReferralConfig } from './ReferralConfig';

type GrowthTab = 'overview' | 'products' | 'settings';

export const GrowthCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<GrowthTab>('products');
    const productRef = useRef<ProductManagementHandle>(null);

    const tabs = [
        { id: 'products', label: '商品管理', icon: ShoppingBag },
        { id: 'settings', label: '邀请配置', icon: Settings2 },
    ];

    return (
        <div className="space-y-6">
            {/* Hero Header - Standardized V8.0 */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-6 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 mix-blend-overlay" />
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white">
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight mb-1">产品管理</h1>
                            <p className="text-violet-100 font-medium opacity-90 whitespace-nowrap">
                                管理会员等级、积分商品及自动化增长配置。
                            </p>
                        </div>
                    </div>
                    {activeTab === 'products' && (
                        <button
                            onClick={() => productRef.current?.openCreateModal()}
                            className="px-5 py-2.5 bg-white text-violet-600 rounded-xl shadow-lg shadow-black/10 font-bold text-sm hover:scale-105 active:scale-95 transition-all border border-white/50 flex items-center gap-2"
                        >
                            <Plus size={18} /> 添加新商品
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-slate-200/60 w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as GrowthTab)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isActive
                                ? 'bg-white text-violet-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'overview' && <GrowthStats />}
                {activeTab === 'products' && <ProductManagement ref={productRef} />}
                {activeTab === 'settings' && <ReferralConfig />}
            </div>
        </div>
    );
};

export default GrowthCenter;
