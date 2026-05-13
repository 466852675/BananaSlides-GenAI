import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { COMMERCIAL_MODULES, USER_MODULES, ADMIN_MODULES, LANDING_MODULES, CommercialModuleId } from '../../hooks/useCommercial';

interface CommercialDisableModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (disabledModules: CommercialModuleId[]) => void;
    loading?: boolean;
    isEnableMode?: boolean;
}

export const CommercialDisableModal: React.FC<CommercialDisableModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    loading = false,
    isEnableMode = false,
}) => {
    // 默认全部勾选
    const allModules = Object.keys(COMMERCIAL_MODULES) as CommercialModuleId[];
    const [selected, setSelected] = useState<CommercialModuleId[]>([...allModules]);

    if (!isOpen) return null;

    const toggleModule = (moduleId: CommercialModuleId) => {
        setSelected((prev) =>
            prev.includes(moduleId)
                ? prev.filter((m) => m !== moduleId)
                : [...prev, moduleId]
        );
    };

    const toggleAll = () => {
        if (selected.length === allModules.length) {
            setSelected([]);
        } else {
            setSelected([...allModules]);
        }
    };

    const renderModuleGroup = (title: string, moduleIds: CommercialModuleId[]) => (
        <div className="mb-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">{title}</h4>
            <div className="space-y-1">
                {moduleIds.map((moduleId) => (
                    <label
                        key={moduleId}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            selected.includes(moduleId)
                                ? 'bg-amber-50 border border-amber-200'
                                : 'hover:bg-slate-50 border border-transparent'
                        }`}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(moduleId)}
                            onChange={() => toggleModule(moduleId)}
                            className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/20"
                        />
                        <div>
                            <div className="text-sm font-bold text-slate-700">
                                {COMMERCIAL_MODULES[moduleId].label}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {moduleId}
                            </div>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <AlertTriangle size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">
                                    {isEnableMode ? '开启商业化功能' : '关闭商业化功能'}
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    {isEnableMode
                                        ? '勾选的模块将开启，未勾选的模块保持关闭'
                                        : '关闭后，勾选的模块将在用户端和管理后台隐藏'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Module List */}
                <div className="p-6 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.length === allModules.length}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500/20"
                            />
                            <span className="text-sm font-bold text-slate-700">全选 / 取消全选</span>
                        </label>
                        <span className="text-xs text-slate-400 ml-auto">
                            {selected.length}/{allModules.length} 个模块
                        </span>
                    </div>

                    {renderModuleGroup('用户侧模块', USER_MODULES)}
                    {renderModuleGroup('管理后台模块', ADMIN_MODULES)}
                    {renderModuleGroup('官网落地页模块', LANDING_MODULES)}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => onConfirm(selected)}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-sm shadow-lg shadow-amber-900/20 hover:shadow-xl hover:shadow-amber-900/30 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                处理中...
                            </>
                        ) : (
                            isEnableMode ? '确定开启' : '确定关闭'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommercialDisableModal;