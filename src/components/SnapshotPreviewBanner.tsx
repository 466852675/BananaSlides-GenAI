import React from 'react';
import { ProjectSnapshot } from '../api/history';
import { RotateCcw, X, Copy, History } from 'lucide-react';

interface SnapshotPreviewBannerProps {
    snapshot: ProjectSnapshot;
    onRestore: () => void;
    onFork: () => void;
    onExit: () => void;
}

export const SnapshotPreviewBanner: React.FC<SnapshotPreviewBannerProps> = ({ snapshot, onRestore, onFork, onExit }) => {
    return (
        <div className="bg-blue-600 text-white px-6 py-3 shadow-lg flex items-center justify-between z-[60] relative">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <History className="w-4 h-4 text-white" />
                </div>
                <span className="bg-white/25 px-2.5 py-1 rounded-md text-sm font-mono font-bold">
                    v{snapshot.version}
                </span>
                <div className="h-5 w-px bg-white/20" />
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                        正在预览历史版本
                    </span>
                    <span className="text-[11px] text-white/70">
                        {new Date(snapshot.createdAt).toLocaleString()} · {snapshot.summary?.substring(0, 30) || "历史快照"}{snapshot.summary && snapshot.summary.length > 30 ? '...' : ''}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onRestore}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-bold hover:bg-white/90 transition-all shadow-sm active:scale-[0.98]"
                >
                    <RotateCcw className="w-4 h-4" />
                    恢复此版本
                </button>
                <button
                    onClick={onFork}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-lg text-sm font-semibold transition-all active:scale-[0.98]"
                >
                    <Copy className="w-4 h-4" />
                    另存为新项目
                </button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button
                    onClick={onExit}
                    className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/15 rounded-lg text-sm transition-all active:scale-[0.98]"
                >
                    <X className="w-4 h-4" />
                    退出预览
                </button>
            </div>
        </div>
    );
};