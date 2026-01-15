import React from 'react';
import { ProjectSnapshot } from '../api/history';
import { RotateCcw, X } from 'lucide-react';

interface SnapshotPreviewBannerProps {
    snapshot: ProjectSnapshot;
    onRestore: () => void;
    onExit: () => void;
}

export const SnapshotPreviewBanner: React.FC<SnapshotPreviewBannerProps> = ({ snapshot, onRestore, onExit }) => {
    
    return (
        <div className="bg-indigo-600 text-white px-6 py-3 shadow-md flex items-center justify-between z-[60] relative">
            <div className="flex items-center gap-3">
                <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-mono font-bold">
                    v{snapshot.version}
                </span>
                <span className="text-sm font-medium opacity-90">
                    正在预览历史版本 ({new Date(snapshot.createdAt).toLocaleString()}) - {snapshot.summary || "历史快照"}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <button 
                    onClick={onRestore}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-700 rounded-md text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
                >
                    <RotateCcw className="w-4 h-4" /> 恢复此版本
                </button>
                {/* 
                <button 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700/50 text-white border border-indigo-500 rounded-md text-sm hover:bg-indigo-700 transition-colors"
                >
                    <Copy className="w-4 h-4" /> 另存为新项目
                </button>
                */}
                <div className="w-px h-6 bg-indigo-400 mx-1" />
                <button 
                    onClick={onExit}
                    className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/10 rounded-md text-sm transition-colors"
                >
                    <X className="w-4 h-4" /> 退出预览
                </button>
            </div>
        </div>
    );
};
