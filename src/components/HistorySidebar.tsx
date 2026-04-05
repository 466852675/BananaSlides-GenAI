import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHistory, ProjectSnapshot } from '../api/history';
import { ProjectSession, AppSettings } from '../types';
import { X, Save, Clock, Trash2, Eye, History, Sparkles, Loader2, ChevronRight } from 'lucide-react';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    currentProject: ProjectSession | null;
    liveProjectData: ProjectSession | null;
    settings: AppSettings;
    onPreview: (snapshot: ProjectSnapshot) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen, onClose, currentProject, liveProjectData, settings, onPreview, showToast
}) => {
    const { createSnapshot, listSnapshots, getSnapshot, deleteSnapshot } = useHistory();
    const queryClient = useQueryClient();
    const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

    const { data: snapshots, isLoading } = useQuery({
        queryKey: ['snapshots', currentProject?.id],
        queryFn: () => currentProject ? listSnapshots(currentProject.id) : Promise.resolve([]),
        enabled: !!currentProject?.id && isOpen
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!currentProject || !liveProjectData) return;
            return createSnapshot(currentProject.id, liveProjectData, settings);
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
        setPreviewLoadingId(snapshotId);
        try {
            const fullSnapshot = await getSnapshot(snapshotId);
            onPreview(fullSnapshot);
            onClose();
        } catch (e: any) {
            console.error(`[HistorySidebar] Failed to load snapshot ${snapshotId}:`, e);
            const errorMsg = e.response?.status === 404
                ? "快照不存在,可能已被删除"
                : `加载失败: ${e.response?.status || e.message}`;
            showToast(errorMsg, 'error');
        } finally {
            setPreviewLoadingId(null);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                        <History className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-800 text-sm">版本历史</h2>
                        <p className="text-[10px] text-gray-400">快照管理与恢复</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-gray-100 bg-white">
                <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !currentProject}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2.5 rounded-lg transition-all font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saveMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>正在生成摘要...</span>
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            <span>保存当前版本</span>
                        </>
                    )}
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] text-gray-400">AI 将自动分析差异并生成智能摘要</span>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-xs text-gray-400">加载记录中...</span>
                    </div>
                ) : snapshots && snapshots.length > 0 ? (
                    snapshots.map((snap) => (
                        <div
                            key={snap.id}
                            className="group bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-blue-200"
                        >
                            {/* Version Badge */}
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold tracking-wide">
                                        V{snap.version}
                                    </span>
                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(snap.createdAt).toLocaleString(undefined, {
                                            month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>

                            {/* Summary */}
                            <p className="text-[13px] text-gray-700 font-medium leading-relaxed mb-3 line-clamp-3">
                                {snap.summary || "常规保存"}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handlePreview(snap.id)}
                                    disabled={previewLoadingId === snap.id}
                                    className="flex-1 h-8 text-[11px] bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors flex items-center justify-center gap-1.5 font-medium disabled:opacity-50"
                                >
                                    {previewLoadingId === snap.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Eye className="w-3.5 h-3.5" />
                                    )}
                                    <span>{previewLoadingId === snap.id ? '加载中' : '查看详情'}</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('确定要删除这条历史记录吗？')) {
                                            deleteMutation.mutate(snap.id);
                                        }
                                    }}
                                    className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    title="删除"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16">
                        <div className="bg-gray-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <History className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">暂无历史记录</p>
                        <p className="text-xs text-gray-400 mt-1">点击上方按钮保存第一个快照</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>共 {snapshots?.length || 0} 个版本</span>
                    <span className="flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        点击查看详情可恢复
                    </span>
                </div>
            </div>
        </div>
    );
};