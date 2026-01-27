
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
    confirmText?: string;
    cancelText?: string;
    showInput?: boolean;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    inputPlaceholder?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    type = 'info',
    confirmText = '确认',
    cancelText = '取消',
    showInput,
    inputValue,
    onInputChange,
    inputPlaceholder
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onCancel} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {type === 'danger' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">{title}</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed whitespace-pre-wrap text-center">{message}</p>

                {showInput && (
                    <div className="mb-6">
                        <textarea
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none"
                            rows={3}
                            placeholder={inputPlaceholder || '请输入...'}
                            value={inputValue}
                            onChange={(e) => onInputChange?.(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}

                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2 text-white rounded-lg font-medium transition-colors ${type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
