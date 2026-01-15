
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, title, message, onConfirm, onCancel, type = 'info' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onCancel} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-indigo-50 text-indigo-500'}`}>
                    {type === 'danger' ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed whitespace-pre-wrap">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                        取消
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`flex-1 py-2 text-white rounded-lg font-medium transition-colors ${type === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
};
