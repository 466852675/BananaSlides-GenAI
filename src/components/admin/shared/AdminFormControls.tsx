import React from 'react';

interface AdminFormItemProps {
    label: string;
    subLabel?: string;
    children: React.ReactNode;
    className?: string;
    horizontal?: boolean;
}

export const AdminFormItem: React.FC<AdminFormItemProps> = ({
    label,
    subLabel,
    children,
    className = '',
    horizontal = false
}) => {
    return (
        <div className={`${horizontal ? 'flex items-center justify-between gap-4 group px-2 py-1.5 hover:bg-slate-50 rounded-xl transition-colors' : 'space-y-2'} ${className}`}>
            <div className="space-y-0.5">
                <label className={`block font-black text-slate-700 leading-tight ${horizontal ? 'text-xs' : 'text-[10px] uppercase tracking-wider text-slate-500'}`}>
                    {label}
                </label>
                {subLabel && (
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                        {subLabel}
                    </p>
                )}
            </div>
            {children}
        </div>
    );
};

export const AdminInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input
        {...props}
        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-slate-700 text-sm ${props.className || ''}`}
    />
);

export const AdminTextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
    <textarea
        {...props}
        className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none text-slate-700 font-medium text-xs leading-relaxed ${props.className || ''}`}
    />
);

export const AdminSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <label className="relative inline-flex items-center cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
        />
        <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-violet-500 peer-checked:to-indigo-600"></div>
    </label>
);

export const AdminSelect: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    icon?: React.ReactNode;
    className?: string;
    placeholder?: string;
}> = ({ value, onChange, options, icon, className = '', placeholder }) => (
    <div className={`relative flex items-center group ${className}`}>
        {icon && (
            <div className="absolute left-3 text-slate-400 group-focus-within:text-violet-500 transition-colors">
                {icon}
            </div>
        )}
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`
                appearance-none bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-xs outline-none transition-all
                hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500
                ${icon ? 'pl-9 pr-8' : 'px-4'} py-2.5 w-full cursor-pointer
            `}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        <div className="absolute right-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    </div>
);
