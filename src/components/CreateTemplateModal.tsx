import React, { useState, useEffect } from 'react';
import { X, LayoutTemplate } from 'lucide-react';

interface CreateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
}

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
    isOpen,
    onClose,
    onCreate,
}) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setName('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('请输入模板名称');
            return;
        }
        onCreate(name.trim());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <LayoutTemplate className="w-5 h-5 text-blue-500" />
                        创建新模板
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="templateName" className="block text-sm font-medium text-slate-700">
                            模板名称 <span className="text-rose-500">*</span>
                        </label>
                        <input
                            id="templateName"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="请输入模板名称..."
                            className={`w-full px-4 py-2.5 rounded-xl border ${error ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
                                } focus:border-blue-500 focus:ring-4 transition-all outline-none text-slate-700`}
                            autoFocus
                        />
                        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            立即创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
