import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { RefundRiskAssessment } from '@/api/refund';

interface RefundRiskBadgeProps {
    assessment: RefundRiskAssessment;
}

export const RefundRiskBadge: React.FC<RefundRiskBadgeProps> = ({ assessment }) => {
    const config = {
        low: {
            icon: <CheckCircle size={16} />,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            label: '低风险',
        },
        medium: {
            icon: <AlertTriangle size={16} />,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            label: '中等风险',
        },
        high: {
            icon: <XCircle size={16} />,
            color: 'text-rose-600',
            bgColor: 'bg-rose-50',
            borderColor: 'border-rose-200',
            label: '高风险',
        },
    };

    const { icon, color, bgColor, borderColor, label } = config[assessment.level];

    return (
        <div className={`rounded-xl p-4 border ${bgColor} ${borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
                <span className={color}>{icon}</span>
                <span className={`font-bold ${color}`}>{label}</span>
            </div>
            
            {assessment.factors.length > 0 && (
                <div className="space-y-1">
                    {assessment.factors.map((factor, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                            <span className="text-xs text-slate-600">{factor}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
