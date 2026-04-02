/**
 * 资源管理页面（管理后台）
 *
 * 显示系统资源统计、孤立资源列表、清理操作等
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Shield,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  Search,
  Image,
  FileText,
  FileArchive,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  HardDrive,
  Archive
} from 'lucide-react';
import { client } from '../../api/client';

// ============================================================
// 类型定义
// ============================================================

interface AssetItem {
  id: string;
  type: string;
  status: string;
  filename: string;
  url: string;
  sizeBytes: number | null;
  createdAt: string;
  projectId: string | null;
  templateId: string | null;
  favoriteId: string | null;
  isReferenced: boolean;
  isOfficial: boolean;
}

interface ResourceStats {
  orphaned: number;
  archived: number;
  deleted: number;
  trashed: number;
  trash: {
    total: number;
    expiring: number;
    userDeleted: number;
    adminDeleted: number;
  };
  policies: {
    ORPHANED_ASSETS: { maxAge: number };
    ARCHIVED_ASSETS: { maxAge: number };
    DELETED_ASSETS: { maxAge: number };
    TRASHED_ASSETS: { maxAge: number };
  };
  trashRetentionDays: number;
}

interface OrphanedAssetsResult {
  items: AssetItem[];
  total: number;
}

// ============================================================
// 辅助函数
// ============================================================

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getAssetTypeIcon = (type: string) => {
  switch (type) {
    case 'IMAGE':
    case 'TEMPLATE_IMAGE':
    case 'FAVORITE_IMAGE':
    case 'THUMBNAIL':
      return <Image size={16} className="text-blue-500" />;
    case 'DOCUMENT':
    case 'OUTLINE':
      return <FileText size={16} className="text-amber-500" />;
    case 'EXPORT_ZIP':
    case 'EXPORT_PDF':
    case 'EXPORT_PPTX':
      return <FileArchive size={16} className="text-emerald-500" />;
    default:
      return <Database size={16} className="text-slate-400" />;
  }
};

// ============================================================
// 资源管理组件
// ============================================================

export const ResourceManagement: React.FC = () => {
  // 状态
  const [stats, setStats] = useState<ResourceStats | null>(null);
  const [orphanedAssets, setOrphanedAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orphaned' | 'stats'>('stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // 加载统计
  const loadStats = useCallback(async () => {
    try {
      const result = await client.get('/resources/admin/stats') as any;
      setStats(result.data);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }, []);

  // 加载孤立资源
  const loadOrphanedAssets = useCallback(async () => {
    try {
      const result = await client.get('/resources/admin/orphaned') as any;
      setOrphanedAssets(result.data || []);
    } catch (error) {
      console.error('加载孤立资源失败:', error);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadOrphanedAssets()]);
      setLoading(false);
    };
    loadData();
  }, [loadStats, loadOrphanedAssets]);

  // 手动触发清理
  const handleCleanup = async () => {
    if (!confirm('确定要执行资源清理吗？这将清理所有符合条件的孤立资源。')) return;

    try {
      setCleanupLoading(true);
      const result = await client.post('/resources/admin/cleanup') as any;
      alert(`清理完成: 扫描 ${result.data.scanned} 个, 清理 ${result.data.purged} 个, 回收 ${formatFileSize(result.data.spaceReclaimed)}`);
      await Promise.all([loadStats(), loadOrphanedAssets()]);
    } catch (error: any) {
      alert(error.message || '清理失败');
    } finally {
      setCleanupLoading(false);
    }
  };

  // 标记保护
  const handleProtect = async (assetId: string) => {
    try {
      await client.post(`/resources/admin/${assetId}/protect`);
      await loadOrphanedAssets();
    } catch (error: any) {
      alert(error.message || '操作失败');
    }
  };

  // 过滤资源
  const filteredAssets = orphanedAssets.filter(asset => {
    const matchesSearch = !searchQuery ||
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // 计算总大小
  const totalOrphanedSize = orphanedAssets.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-violet-500" />
            资源管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            管理系统资源，清理孤立文件，监控存储使用
          </p>
        </div>
        <button
          onClick={handleCleanup}
          disabled={cleanupLoading}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {cleanupLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCcw size={16} />}
          执行清理
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Database size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {(stats?.orphaned || 0) + (stats?.archived || 0) + (stats?.trashed || 0)}
              </div>
              <div className="text-xs text-slate-500">待清理资源</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats?.orphaned || 0}</div>
              <div className="text-xs text-slate-500">孤立文件</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <Archive size={20} className="text-slate-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-600">{stats?.archived || 0}</div>
              <div className="text-xs text-slate-500">已归档</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl">
              <Trash2 size={20} className="text-rose-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-rose-600">{stats?.trashed || 0}</div>
              <div className="text-xs text-slate-500">回收箱资源</div>
            </div>
          </div>
        </div>
      </div>

      {/* 回收箱统计 */}
      {stats?.trash && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-5 border border-violet-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-violet-100 rounded-xl">
                <Trash2 size={24} className="text-violet-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-violet-800">回收箱统计</h3>
                <p className="text-sm text-violet-600">项目保留 {stats.trashRetentionDays} 天后自动清理</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-700">{stats.trash.total}</div>
                <div className="text-xs text-violet-500">总项目</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.trash.expiring}</div>
                <div className="text-xs text-amber-500">即将过期</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-slate-600">{stats.trash.userDeleted}</div>
                <div className="text-xs text-slate-400">用户删除</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-slate-600">{stats.trash.adminDeleted}</div>
                <div className="text-xs text-slate-400">管理员删除</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 标签页切换 */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          清理策略
        </button>
        <button
          onClick={() => setActiveTab('orphaned')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'orphaned'
              ? 'text-violet-600 border-b-2 border-violet-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          孤立文件列表 ({orphanedAssets.length})
        </button>
      </div>

      {/* 清理策略 */}
      {activeTab === 'stats' && stats && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">清理策略配置</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(stats.policies).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">
                    {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="text-sm font-bold text-violet-600">
                  {value.maxAge} 天后清理
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-700">
                <strong>注意：</strong>资源清理是不可逆操作。被模板、收藏或有效项目引用的资源将被自动保护，不会清理。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 孤立文件列表 */}
      {activeTab === 'orphaned' && (
        <div className="space-y-4">
          {/* 筛选栏 */}
          <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="搜索文件名或URL..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-violet-200 rounded-lg text-sm transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">全部类型</option>
              <option value="IMAGE">图片</option>
              <option value="DOCUMENT">文档</option>
              <option value="THUMBNAIL">缩略图</option>
              <option value="USER_UPLOAD">用户上传</option>
            </select>
            <div className="text-sm text-slate-500">
              共 {filteredAssets.length} 个文件，总大小 {formatFileSize(totalOrphanedSize)}
            </div>
          </div>

          {/* 文件列表 */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">文件</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">大小</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">创建时间</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      没有找到孤立文件
                    </td>
                  </tr>
                ) : (
                  filteredAssets.slice(0, 20).map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getAssetTypeIcon(asset.type)}
                          <div>
                            <div className="text-sm font-medium text-slate-700 truncate max-w-xs">
                              {asset.filename}
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-xs">
                              {asset.url}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {asset.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatFileSize(asset.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(asset.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(asset.url, '_blank')}
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="预览"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleProtect(asset.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="标记保护"
                          >
                            <Shield size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredAssets.length > 20 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center text-sm text-slate-500">
                仅显示前 20 条，共 {filteredAssets.length} 条
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManagement;