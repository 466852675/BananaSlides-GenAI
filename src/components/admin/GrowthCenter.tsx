
import React, { useState } from 'react';
import { Gift, TrendingUp, ShoppingBag, Settings2 } from 'lucide-react';
import { ProductManagement } from './ProductManagement';
import { GrowthStats } from './GrowthStats';
import { ReferralConfig } from './ReferralConfig';

type GrowthTab = 'overview' | 'products' | 'settings';

export const GrowthCenter: React.FC = () => {
    const [activeTab, setActiveTab] = useState<GrowthTab>('overview');

    const tabs = [
        { id: 'overview', label: '增长概览', icon: TrendingUp },
        { id: 'products', label: '商品管理', icon: ShoppingBag },
        { id: 'settings', label: '邀请配置', icon: Settings2 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Gift className="text-violet-500" size={24} />
                    增长中心
                </h2>
                <p className="text-sm text-slate-500 font-medium">管理会员、积分商品，监控用户增长趋势。</p>
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
                {activeTab === 'products' && <ProductManagement />}
                {activeTab === 'settings' && <ReferralConfig />}
            </div>
        </div>
    );
};

export default GrowthCenter;
