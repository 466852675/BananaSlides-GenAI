import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    width?: string;
}

export const AdminSearchInput: React.FC<AdminSearchInputProps> = ({
    value,
    onChange,
    placeholder = '搜索...',
    className = '',
    width = 'w-40'
}) => {
    return (
        <div className={`relative group ${width} flex-shrink-0 ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={16} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all font-medium"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                >
                    <X size={12} />
                </button>
            )}
        </div>
    );
};
