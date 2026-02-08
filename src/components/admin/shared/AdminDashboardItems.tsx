import React from 'react';
import { TrendingUp } from 'lucide-react';

interface AdminStatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    subValue?: string;
    gradient?: string;
    shadowColor?: string;
    trendType?: 'up' | 'down' | 'none';
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
    icon,
    label,
    value,
    subValue,
    gradient = 'from-violet-500 to-purple-500',
    shadowColor = 'shadow-violet-500/30',
    trendType = 'up'
}) => (
    <div className={`bg-white rounded-3xl p-6 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${shadowColor} border border-slate-100/50`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg text-white transform group-hover:scale-110 transition-transform duration-500`}>
                {React.cloneElement(icon as any, { size: 24 })}
            </div>
            <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full blur-xl group-hover:opacity-20 transition-opacity`} />
        </div>

        <div>
            <div className="text-2xl font-black text-slate-800 tracking-tight mb-1">{value}</div>
            <div className="text-sm font-medium text-slate-500">{label}</div>
            {subValue && (
                <div className={`text-xs font-bold mt-3 flex items-center gap-1 w-fit px-2 py-0.5 rounded-full ${trendType === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'}`}>
                    <TrendingUp size={10} className={trendType === 'down' ? 'rotate-180' : ''} />
                    {subValue}
                </div>
            )}
        </div>
    </div>
);

export const AdminQuickAction: React.FC<{ label: string; icon: React.ReactNode; color?: 'blue' | 'violet' | 'amber' | 'rose'; onClick?: () => void }> = ({ label, icon, color = 'blue', onClick }) => {
    const colorStyles = {
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white hover:shadow-blue-500/30',
        violet: 'bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white hover:shadow-violet-500/30',
        amber: 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white hover:shadow-amber-500/30',
        rose: 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-rose-500/30',
    };

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colorStyles[color]}`}
        >
            <div className="p-3 bg-white rounded-xl shadow-sm border border-black/5">
                {React.cloneElement(icon as any, { size: 24 })}
            </div>
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </button>
    );
};
