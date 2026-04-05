/**
 * 回收箱页面组件
 *
 * 显示用户已删除的项目，支持恢复和彻底删除
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Trash2,
  RefreshCcw,
  Clock,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Check,
  Loader2,
  LayoutTemplate,
  FolderKanban
} from 'lucide-react';
import * as trashApi from '../api/trash';
import { formatTimeAgo } from '../utils/time-format';

// ============================================================
// 类型定义
// ============================================================

interface TrashPageProps {
  onBack: () => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void, type?: "danger" | "info") => void;
  onCloseConfirm?: () => void;
}

type SourceFilter = 'all' | 'studio' | 'history' | 'template';

// ============================================================
// 回收箱页面组件
// ============================================================

export const TrashPage: React.FC<TrashPageProps> = ({ onBack, onShowConfirm, onCloseConfirm }) => {
  // React Query
  const queryClient = useQueryClient();

  // 状态
  const [items, setItems] = useState<trashApi.TrashItem[]>([]);
  const [stats, setStats] = useState<trashApi.TrashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [listResult, statsResult] = await Promise.all([
        trashApi.getTrashList({ page, pageSize: 12, keyword: searchQuery || undefined }),
        trashApi.getTrashStats()
      ]);
      setItems(listResult.items);
      setTotalPages(listResult.totalPages);
      setStats(statsResult);
    } catch (error) {
      console.error('加载回收箱失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 恢复项目
  const handleRestore = async (projectId: string, projectTitle: string) => {
    const doRestore = async () => {
      try {
        setActionLoading(projectId);
        await trashApi.restoreProject(projectId);
        // 刷新项目列表缓存，使恢复的项目立即显示在创作室/历史库
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await loadData();
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
        onCloseConfirm?.(); // 关闭确认对话框
      } catch (error: any) {
        alert(error.message || '恢复失败');
      } finally {
        setActionLoading(null);
      }
    };

    if (onShowConfirm) {
      onShowConfirm(
        '恢复项目',
        `确定要恢复《${projectTitle}》吗？恢复后项目将回到历史库中。`,
        doRestore,
        'info'
      );
    } else {
      doRestore();
    }
  };

  // 彻底删除
  const handleDelete = async (projectId: string, projectTitle: string) => {
    const doDelete = async () => {
      try {
        setActionLoading(projectId);
        await trashApi.permanentDeleteProject(projectId);
        await loadData();
        onCloseConfirm?.(); // 关闭确认对话框
      } catch (error: any) {
        alert(error.message || '删除失败');
      } finally {
        setActionLoading(null);
      }
    };

    if (onShowConfirm) {
      onShowConfirm(
        '彻底删除',
        `确定要彻底删除《${projectTitle}》吗？此操作不可撤销，项目及相关资源将被永久删除。`,
        doDelete,
        'danger'
      );
    } else if (confirm('确定要彻底删除这个项目吗？此操作不可撤销。')) {
      doDelete();
    }
  };

  // 批量恢复
  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;

    const doBatchRestore = async () => {
      try {
        setActionLoading('batch');
        const result = await trashApi.batchRestore(Array.from(selectedIds));
        if (result.failed > 0) {
          alert(`${result.restored} 个项目已恢复，${result.failed} 个失败`);
        }
        // 刷新项目列表缓存，使恢复的项目立即显示在创作室/历史库
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
        await loadData();
        setSelectedIds(new Set());
        onCloseConfirm?.(); // 关闭确认对话框
      } catch (error: any) {
        alert(error.message || '批量恢复失败');
      } finally {
        setActionLoading(null);
      }
    };

    if (onShowConfirm) {
      onShowConfirm(
        '批量恢复',
        `确定要恢复选中的 ${selectedIds.size} 个项目吗？恢复后项目将回到历史库中。`,
        doBatchRestore,
        'info'
      );
    } else {
      doBatchRestore();
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const doBatchDelete = async () => {
      try {
        setActionLoading('batch');
        const result = await trashApi.batchDelete(Array.from(selectedIds));
        if (result.failed > 0) {
          alert(`${result.deleted} 个项目已删除，${result.failed} 个失败`);
        }
        await loadData();
        setSelectedIds(new Set());
        onCloseConfirm?.(); // 关闭确认对话框
      } catch (error: any) {
        alert(error.message || '批量删除失败');
      } finally {
        setActionLoading(null);
      }
    };

    if (onShowConfirm) {
      onShowConfirm(
        '批量彻底删除',
        `确定要彻底删除选中的 ${selectedIds.size} 个项目吗？此操作不可撤销，项目及相关资源将被永久删除。`,
        doBatchDelete,
        'danger'
      );
    } else if (confirm(`确定要彻底删除选中的 ${selectedIds.size} 个项目吗？此操作不可撤销。`)) {
      doBatchDelete();
    }
  };

  // 清空回收箱
  const handleClearAll = async () => {
    const doClear = async () => {
      try {
        setActionLoading('clear');
        await trashApi.clearTrash();
        await loadData();
        onCloseConfirm?.(); // 关闭确认对话框
      } catch (error: any) {
        alert(error.message || '清空失败');
      } finally {
        setActionLoading(null);
      }
    };

    if (onShowConfirm) {
      onShowConfirm(
        '清空回收箱',
        '确定要清空回收箱吗？所有项目将被永久删除，此操作不可撤销。',
        doClear,
        'danger'
      );
    } else if (confirm('确定要清空回收箱吗？所有项目将被永久删除，此操作不可撤销。')) {
      doClear();
    }
  };

  // 切换选择
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafc] overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-slate-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Trash2 className="text-slate-400" />
                回收箱
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                项目将保留 30 天，之后自动永久删除
              </p>
            </div>
          </div>

          {stats && stats.total > 0 && (
            <button
              onClick={handleClearAll}
              disabled={actionLoading !== null}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-200 hover:shadow-red-300"
            >
              {actionLoading === 'clear' ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              清空回收箱
            </button>
          )}
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-xs text-slate-500 mt-1">总项目数</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-amber-100 bg-amber-50/30">
              <div className="text-2xl font-bold text-amber-600">{stats.expiring}</div>
              <div className="text-xs text-amber-600 mt-1">即将过期</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="text-2xl font-bold text-slate-600">{stats.userDeleted}</div>
              <div className="text-xs text-slate-500 mt-1">用户删除</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="text-2xl font-bold text-slate-600">{stats.adminDeleted}</div>
              <div className="text-xs text-slate-500 mt-1">管理员删除</div>
            </div>
          </div>
        )}

        {/* 搜索和筛选栏 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 space-y-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索项目名称..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-200 rounded-xl text-sm transition-all outline-none"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* 来源分类筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">来源：</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSourceFilter('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => { setSourceFilter('studio'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  sourceFilter === 'studio'
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                }`}
              >
                <FolderKanban size={12} />
                创作室
              </button>
              <button
                onClick={() => { setSourceFilter('history'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  sourceFilter === 'history'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
              >
                <Clock size={12} />
                历史库
              </button>
              <button
                onClick={() => { setSourceFilter('template'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  sourceFilter === 'template'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                <LayoutTemplate size={12} />
                模板间
              </button>
            </div>
          </div>
        </div>

        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check className="text-blue-600" size={18} />
              <span className="text-sm font-medium text-blue-700">
                已选择 {selectedIds.size} 个项目
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchRestore}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {actionLoading === 'batch' ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
                批量恢复
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Trash2 size={16} />
                批量删除
              </button>
            </div>
          </motion.div>
        )}

        {/* 项目列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
            <Trash2 className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-slate-600">回收箱是空的</h3>
            <p className="text-sm text-slate-400 mt-2">删除的项目将在这里保留 30 天</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 全选 */}
            <div className="bg-white rounded-xl px-4 py-2 border border-slate-100 flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedIds.size === items.length
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-300 hover:border-blue-400'
                }`}
              >
                {selectedIds.size === items.length && <Check size={14} className="text-white" />}
              </button>
              <span className="text-sm text-slate-500">全选</span>
            </div>

            {/* 项目卡片 */}
            <div className="grid grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {items
                  .filter(item => {
                    if (sourceFilter === 'all') return true;
                    if (sourceFilter === 'studio') return item.scenarioType !== 'TEMPLATE' && item.status !== 'completed';
                    if (sourceFilter === 'history') return item.scenarioType !== 'TEMPLATE' && item.status === 'completed';
                    if (sourceFilter === 'template') return item.scenarioType === 'TEMPLATE';
                    return true;
                  })
                  .map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white rounded-2xl border overflow-hidden group transition-all ${
                      selectedIds.has(item.id) ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-100'
                    }`}
                  >
                    {/* 缩略图 */}
                    <div className="aspect-video bg-slate-100 relative">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="text-slate-300" size={40} />
                        </div>
                      )}

                      {/* 过期警告角标 */}
                      {item.remainingDays <= 5 && (
                        <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {item.remainingDays}天后过期
                        </div>
                      )}

                      {/* 选择框 */}
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          selectedIds.has(item.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white/80 border-slate-300 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {selectedIds.has(item.id) && <Check size={14} className="text-white" />}
                      </button>
                    </div>

                    {/* 信息区 */}
                    <div className="p-3">
                      {/* 项目ID + 来源标签 */}
                      <div className="flex items-center gap-2 mb-1">
                        {item.displayId && (
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">
                            {item.displayId}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.scenarioType === 'TEMPLATE'
                            ? 'bg-emerald-50 text-emerald-600'
                            : item.status === 'completed'
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'bg-violet-50 text-violet-600'
                        }`}>
                          {item.scenarioType === 'TEMPLATE' ? (
                            <><LayoutTemplate size={10} /> 模板</>
                          ) : item.status === 'completed' ? (
                            <><Clock size={10} /> 历史库</>
                          ) : (
                            <><FolderKanban size={10} /> 创作室</>
                          )}
                        </span>
                      </div>

                      {/* 标题 */}
                      <h3 className="font-medium text-slate-800 truncate text-sm">{item.title}</h3>

                      {/* 状态 + 页数 */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'generating' ? 'bg-blue-50 text-blue-600' :
                          item.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600' :
                          item.status === 'error' ? 'bg-rose-50 text-rose-600' :
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-50 text-slate-500'
                        }`}>
                          {item.status === 'generating' ? '生成中' :
                           item.status === 'in-progress' ? '进行中' :
                           item.status === 'error' ? '生成失败' :
                           item.status === 'completed' ? '已完成' : '未开始'}
                        </span>
                        <span className="text-slate-300">|</span>
                        <Image size={12} />
                        <span>{item.slideCount} 页</span>
                      </div>

                      {/* 删除时间 */}
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                        <Clock size={10} />
                        <span>{formatTimeAgo(item.deletedAt)}删除</span>
                        <span className="text-slate-300">·</span>
                        <span className={item.remainingDays <= 5 ? 'text-amber-500 font-medium' : ''}>
                          剩余 {item.remainingDays} 天
                        </span>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleRestore(item.id, item.title)}
                          disabled={actionLoading !== null}
                          className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <RefreshCcw size={14} />
                          )}
                          恢复
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          disabled={actionLoading !== null}
                          className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrashPage;