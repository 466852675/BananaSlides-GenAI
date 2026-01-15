import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHistory, ProjectSnapshot } from '../api/history';
import { ProjectSession, AppSettings } from '../types';
import { X, Save, Clock, Trash2, Eye, History } from 'lucide-react';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentProject: ProjectSession | null;
    settings: AppSettings;
    onPreview: (snapshot: ProjectSnapshot) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ 
    isOpen, onClose, currentProject, settings, onPreview, showToast 
}) => {
    const { createSnapshot, listSnapshots, getSnapshot, deleteSnapshot } = useHistory();
    const queryClient = useQueryClient();

    const { data: snapshots, isLoading } = useQuery({
        queryKey: ['snapshots', currentProject?.id],
        queryFn: () => currentProject ? listSnapshots(currentProject.id) : Promise.resolve([]),
        enabled: !!currentProject?.id && isOpen
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
             if (!currentProject) return;
             return createSnapshot(currentProject.id, currentProject, settings);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots'] });
            showToast("已保存快照", 'success');
        },
        onError: () => showToast("保存失败", 'error')
    });
    
    const deleteMutation = useMutation({
        mutationFn: deleteSnapshot,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots'] });
            showToast("已删除快照", 'success');
        },
        onError: () => showToast("删除失败", 'error')
    });

    const handlePreview = async (snapshotId: string) => {
        // Simple loading feedback
        const btn = document.getElementById(`preview-btn-${snapshotId}`);
        if(btn) btn.innerText = "读取中...";
        
        try {
            console.log(`[HistorySidebar] Fetching snapshot: ${snapshotId}`);
            const fullSnapshot = await getSnapshot(snapshotId);
            console.log(`[HistorySidebar] Snapshot loaded successfully:`, fullSnapshot);
            onPreview(fullSnapshot);
            onClose(); 
        } catch(e: any) {
            console.error(`[HistorySidebar] Failed to load snapshot ${snapshotId}:`, e);
            const errorMsg = e.response?.status === 404 
                ? "快照不存在,可能已被删除" 
                : `加载失败: ${e.response?.status || e.message}`;
            showToast(errorMsg, 'error');
            if(btn) btn.innerText = "查看详情";
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 border-l border-zinc-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-zinc-50">
                <h2 className="font-semibold text-zinc-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" /> 
                    <span>版本历史</span>
                </h2>
                <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-zinc-500" />
                </button>
            </div>

            {/* Actions */}
            <div className="p-4 border-b bg-white">
                <button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={saveMutation.isPending || !currentProject}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-lg transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saveMutation.isPending ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>正在生成摘要...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" /> 
                            <span>保存当前版本</span>
                        </>
                    )}
                </button>
                <p className="text-xs text-zinc-400 mt-2 text-center">
                    AI 将自动分析差异并生成智能摘要
                </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs">加载记录中...</span>
                    </div>
                ) : snapshots && snapshots.length > 0 ? (
                    snapshots.map((snap) => (
                        <div key={snap.id} className="group bg-white border border-zinc-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 relative">
                             <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-2">
                                     <span className="bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wide">
                                         V{snap.version}
                                     </span>
                                     <span className="text-xs text-zinc-400 flex items-center gap-1">
                                         <Clock className="w-3 h-3" />
                                         {new Date(snap.createdAt).toLocaleString(undefined, {
                                            month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                         })}
                                     </span>
                                 </div>
                             </div>
                             
                             <p className="text-sm text-zinc-700 font-medium leading-relaxed mb-3">
                                 {snap.summary || "常规保存"}
                             </p>
                             
                             <div className="flex gap-2">
                                 <button 
                                     id={`preview-btn-${snap.id}`}
                                     onClick={() => handlePreview(snap.id)} 
                                     className="flex-1 h-8 text-xs bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors flex items-center justify-center gap-1.5 font-medium"
                                 >
                                     <Eye className="w-3.5 h-3.5" /> 查看详情
                                 </button>
                                 <button 
                                    onClick={() => {
                                        if (confirm('确定要删除这条历史记录吗？')) {
                                            deleteMutation.mutate(snap.id);
                                        }
                                    }}
                                    className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    title="删除"
                                 >
                                     <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                             </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <div className="bg-zinc-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <History className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-zinc-500 font-medium">暂无历史记录</p>
                        <p className="text-xs text-zinc-400 mt-1">点击上方按钮保存第一个快照</p>
                    </div>
                )}
            </div>
        </div>
    );
};
