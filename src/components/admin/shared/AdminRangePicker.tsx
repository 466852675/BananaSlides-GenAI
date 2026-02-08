import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminRangePickerProps {
    min: string | number;
    max: string | number;
    onMinChange: (val: string) => void;
    onMaxChange: (val: string) => void;
    label: string;
    icon: LucideIcon;
    type?: 'number' | 'date';
    placeholderMin?: string;
    placeholderMax?: string;
    width?: string;
    className?: string;
}

export const AdminRangePicker: React.FC<AdminRangePickerProps> = ({
    min,
    max,
    onMinChange,
    onMaxChange,
    label,
    icon: Icon,
    type = 'number',
    placeholderMin = 'Min',
    placeholderMax = 'Max',
    width = 'min-w-[150px]',
    className = ''
}) => {
    return (
        <div className={`flex items-center gap-1 flex-shrink-0 bg-slate-50/50 p-1 rounded-lg border border-slate-100 ${width} ${className}`}>
            <div className="pl-1.5 flex items-center gap-1.5">
                <Icon size={12} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
                <input
                    type={type}
                    placeholder={placeholderMin}
                    value={min}
                    onChange={(e) => onMinChange(e.target.value)}
                    className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 outline-none focus:border-violet-400 transition-all no-scrollbar"
                />
                <span className="text-slate-300 text-[10px]">-</span>
                <input
                    type={type}
                    placeholder={placeholderMax}
                    value={max}
                    onChange={(e) => onMaxChange(e.target.value)}
                    className="w-16 px-1.5 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 outline-none focus:border-violet-400 transition-all no-scrollbar"
                />
            </div>
        </div>
    );
};
