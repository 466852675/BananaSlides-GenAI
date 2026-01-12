
import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'loading' | 'info';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastMessage | null;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
    useEffect(() => {
        if (toast && toast.type !== 'loading') {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) return null;

    const getIcon = () => {
        switch (toast.type) {
            case 'success': return <CheckCircle2 size={18} />;
            case 'error': return <AlertCircle size={18} />;
            case 'loading': return <Loader2 size={18} className="animate-spin" />;
            default: return <Info size={18} />;
        }
    };

    const getStyles = () => {
        switch (toast.type) {
            case 'success': return 'bg-green-50 text-green-700 border-green-200';
            case 'error': return 'bg-red-50 text-red-700 border-red-200';
            case 'loading': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${getStyles()} min-w-[300px] max-w-md`}>
                <div className="shrink-0">{getIcon()}</div>
                <div className="text-sm font-medium">{toast.message}</div>
            </div>
        </div>
    );
};
