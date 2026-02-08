import React from 'react';

export interface AdminTabItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    count?: number;
    color?: string;
    bgColor?: string;
}

interface AdminStatsTabsProps {
    tabs: AdminTabItem[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export const AdminStatsTabs: React.FC<AdminStatsTabsProps> = ({
    tabs,
    activeTab,
    onChange,
    className = ''
}) => {
    return (
        <div className={`flex items-center p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 w-fit ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`
                        relative px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2.5
                        ${activeTab === tab.id
                            ? 'bg-white text-violet-600 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-102'
                            : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                        }
                    `}
                >
                    <span className={activeTab === tab.id ? 'text-violet-500' : 'text-slate-400'}>
                        {React.cloneElement(tab.icon as any, { size: 14 })}
                    </span>
                    {tab.label}
                    {typeof tab.count === 'number' && (
                        <span className={`
                            px-1.5 py-0.5 rounded-md text-[10px] font-black
                            ${activeTab === tab.id
                                ? 'bg-violet-50 text-violet-600'
                                : `${tab.bgColor || 'bg-slate-200'} ${tab.color || 'text-slate-600'}`
                            }
                        `}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
};
