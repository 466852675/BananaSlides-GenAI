/**
 * AgentSidebar 侧边栏组件
 *
 * 显示项目列表，支持全部/创作室/历史库 TAB 切换
 * 支持置顶、重命名、删除操作，与 IDE 模式双向同步
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Clock, CheckCircle, XCircle, Pause, Play, Loader2, FileText, Pin, MoreVertical, Edit2, Trash2, X, Search, Sparkles, Presentation } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdateProject, useDeleteProject } from '../api/projects';
import { ConfirmDialog } from './ConfirmDialog';
import { STATUS_CONFIG } from '../config/status-config';
import { formatTimeAgo } from '../utils/time-format';
import type { AgentSession, AgentProgressResponse } from '../types/agent';
import type { ProjectWithSession } from '../api/agent';

interface AgentSidebarProps {
  projects: ProjectWithSession[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  session: AgentSession | null;
  progress: AgentProgressResponse | null;
  onCreateProject?: () => void;
  onDeleteProject?: (projectId: string) => void; // 新增：删除项目回调
}

// TAB 类型
type TabType = 'all' | 'studio' | 'history';

// Agent 会话状态图标
const getSessionStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case 'PAUSED':
      return <Pause className="h-3.5 w-3.5 text-yellow-500" />;
    case 'COMPLETED':
      return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-gray-400" />;
  }
};

// 项目来源徽章组件（仅图标版）
const ProjectSourceBadge = React.memo(function ProjectSourceBadge({ source }: { source: 'IDE' | 'AGENT' }) {
  const isAgent = source === 'AGENT';

  return (
    <span
      className={`
        inline-flex items-center justify-center
        w-4 h-4 rounded
        ${isAgent
          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
          : 'bg-gray-300'
        }
      `}
      title={isAgent ? 'AI 生成' : '手动创建'}
    >
      {isAgent ? (
        <Sparkles className="w-2.5 h-2.5 text-white" />
      ) : (
        <Presentation className="w-2.5 h-2.5 text-gray-600" />
      )}
    </span>
  );
});

// 项目卡片组件 - 移到外部并使用 memo 优化，避免每次渲染重新创建
interface ProjectCardProps {
  project: ProjectWithSession;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  menuOpenId: string | null;
  onSelectProject: (projectId: string) => void;
  onSetEditingTitle: (title: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const ProjectCard = React.memo(function ProjectCard({
  project,
  isActive,
  isEditing,
  editingTitle,
  menuOpenId,
  onSelectProject,
  onSetEditingTitle,
  inputRef
}: ProjectCardProps) {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['idle'];
  const isPinned = project.isPinned || false;

  return (
    <div
      onClick={() => {
        if (!isEditing) {
          onSelectProject(project.id);
        }
      }}
      className={`w-full text-left p-2.5 rounded-lg relative cursor-pointer select-none
        transition-all duration-200 ease-out
        ${isActive
          ? 'bg-blue-600/[0.08] border-blue-500/30 border shadow-sm'
          : 'border-transparent border hover:bg-gray-50 active:scale-[0.99]'
        }`}
      style={{
        transform: isActive ? 'scale(1.01)' : 'scale(1)',
      }}
    >
      {/* 选中指示器 - macOS 风格左侧高亮条，使用 logo 主色 #2563eb */}
      <div
        className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-all duration-200 ease-out ${
          isActive ? 'bg-[#2563eb] opacity-100' : 'bg-transparent opacity-0'
        }`}
      />

      {/* 置顶标记 */}
      {isPinned && (
        <Pin className="absolute top-1 right-1 h-3 w-3 text-amber-500 fill-amber-500" />
      )}

      {/* 缩略图 + 信息 */}
      <div className="flex gap-2.5">
        {/* 缩略图 */}
        <div className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden transition-all duration-200 ${
          isActive ? 'ring-2 ring-[#2563eb]/40 ring-offset-1' : 'bg-gray-100'
        }`}>
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center transition-colors duration-200 ${
              isActive ? 'bg-blue-50' : 'bg-gray-100'
            }`}>
              <FileText className={`h-4 w-4 transition-colors duration-200 ${
                isActive ? 'text-[#2563eb]' : 'text-gray-300'
              }`} />
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          {/* 标题行 */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => onSetEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    // 重命名确认逻辑在 onBlur 中处理
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === 'Escape') {
                    onSetEditingTitle(project.title || '未命名项目');
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="flex-1 px-1 py-0.5 text-sm font-medium bg-white border border-gray-300 rounded focus:outline-none focus:border-black"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`flex-1 truncate text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'text-[#2563eb]' : 'text-gray-800'
              }`}>
                {project.title || '未命名项目'}
              </span>
            )}
            {/* 状态标签 + 来源标识 */}
            <div className="flex items-center gap-1">
              <ProjectSourceBadge source={project.source || 'IDE'} />
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusConfig.color} ${statusConfig.bgColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* 项目信息 */}
          <div className="flex items-center gap-2 text-[11px] text-gray-400 whitespace-nowrap">
            {project.displayId && (
              <span className="truncate">{project.displayId}</span>
            )}
            <span className="whitespace-nowrap flex-shrink-0">{formatTimeAgo(project.updatedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default function AgentSidebar({
  projects,
  currentProjectId,
  onSelectProject,
  session,
  progress,
  onCreateProject,
  onDeleteProject
}: AgentSidebarProps) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  // 当前选中的 TAB
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');

  // 操作菜单状态 - 使用 backdrop overlay 方案，彻底避免 ref 闪烁问题
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  // 记录菜单按钮的位置，用于定位下拉菜单
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // 打开菜单时计算位置
  const openMenu = (projectId: string, buttonEl: HTMLButtonElement) => {
    const rect = buttonEl.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4, // 菜单在按钮下方
      left: rect.right - 120 // 菜单右对齐按钮
    });
    setMenuOpenId(projectId);
  };

  // 关闭菜单
  const closeMenu = () => {
    setMenuOpenId(null);
    setMenuPosition(null);
  };

  // 重命名状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 删除确认对话框状态
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    projectId: string;
    title: string;
  }>({ isOpen: false, projectId: '', title: '' });

  // 编辑框自动聚焦
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // 根据 TAB 和搜索关键词过滤项目
  const filteredProjects = useMemo(() => {
    // 先按置顶排序，再按创建时间倒序
    let sorted = [...projects].sort((a, b) => {
      const aPinned = a.isPinned ? 1 : 0;
      const bPinned = b.isPinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 搜索过滤：支持项目名称和项目ID
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      sorted = sorted.filter(p => {
        const titleMatch = p.title?.toLowerCase().includes(query);
        const displayIdMatch = p.displayId?.toLowerCase().includes(query);
        const idMatch = p.id.toLowerCase().includes(query);
        return titleMatch || displayIdMatch || idMatch;
      });
    }

    // TAB 过滤
    switch (activeTab) {
      case 'studio':
        // 创作室：非 completed 且非模板
        return sorted.filter(p => p.status !== 'completed' && p.scenarioType !== 'TEMPLATE');
      case 'history':
        // 历史库：completed 且非模板
        return sorted.filter(p => p.status === 'completed' && p.scenarioType !== 'TEMPLATE');
      case 'all':
      default:
        // 全部：非模板
        return sorted.filter(p => p.scenarioType !== 'TEMPLATE');
    }
  }, [projects, activeTab, searchQuery]);

  // 各 TAB 的数量
  const tabCounts = useMemo(() => ({
    all: projects.filter(p => p.scenarioType !== 'TEMPLATE').length,
    studio: projects.filter(p => p.status !== 'completed' && p.scenarioType !== 'TEMPLATE').length,
    history: projects.filter(p => p.status === 'completed' && p.scenarioType !== 'TEMPLATE').length
  }), [projects]);

  // 置顶操作
  const handlePin = (projectId: string, isPinned: boolean) => {
    updateProject.mutate({ id: projectId, data: { isPinned: !isPinned } });
    closeMenu();
    // 刷新 Agent 项目列表
    queryClient.invalidateQueries({ queryKey: ['agent-projects'] });
  };

  // 开始重命名
  const handleStartRename = (projectId: string, currentTitle: string) => {
    setEditingId(projectId);
    setEditingTitle(currentTitle || '未命名项目');
    closeMenu();
  };

  // 确认重命名
  const handleConfirmRename = (projectId: string) => {
    if (editingTitle.trim()) {
      updateProject.mutate({ id: projectId, data: { title: editingTitle.trim() } });
      // 刷新 Agent 项目列表
      queryClient.invalidateQueries({ queryKey: ['agent-projects'] });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  // 取消重命名
  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // 删除操作 - 打开确认对话框
  const handleDelete = (projectId: string, title: string) => {
    setDeleteConfirm({
      isOpen: true,
      projectId,
      title: title || '未命名项目'
    });
    closeMenu();
  };

  // 确认删除
  const confirmDelete = () => {
    const projectId = deleteConfirm.projectId;
    deleteProject.mutate(projectId, {
      onSuccess: () => {
        setDeleteConfirm({ isOpen: false, projectId: '', title: '' });
        // 调用父组件回调，实时更新项目列表
        onDeleteProject?.(projectId);
      }
    });
  };

  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, projectId: '', title: '' });
  };

  // TAB 渲染
  const renderTab = (type: TabType, label: string, count: number) => (
    <button
      onClick={() => setActiveTab(type)}
      className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
        activeTab === type
          ? 'bg-blue-600 text-white'
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <span className="block">{label}</span>
      {count > 0 && (
        <span className={`block text-[10px] mt-0.5 ${activeTab === type ? 'text-blue-200' : 'text-gray-400'}`}>
          ({count})
        </span>
      )}
    </button>
  );

  // 处理编辑标题变化的回调
  const handleEditingTitleChange = useCallback((title: string) => {
    setEditingTitle(title);
  }, []);

  // 项目列表渲染
  const renderProjectList = () => (
    <div className="space-y-1">
      {filteredProjects.map(project => (
        <div key={project.id} className="relative">
          <ProjectCard
            project={project}
            isActive={project.id === currentProjectId}
            isEditing={editingId === project.id}
            editingTitle={editingTitle}
            menuOpenId={menuOpenId}
            onSelectProject={onSelectProject}
            onSetEditingTitle={handleEditingTitleChange}
            inputRef={inputRef}
          />
          {/* 操作菜单按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (menuOpenId === project.id) {
                closeMenu();
              } else {
                openMenu(project.id, e.currentTarget);
              }
            }}
            className={`absolute top-2 right-2 p-1 rounded hover:bg-gray-200 transition-colors ${
              menuOpenId === project.id ? 'bg-gray-200' : ''
            }`}
          >
            <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white" role="navigation" aria-label="Agent 项目侧边栏">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800" id="sidebar-title">项目对话</h2>
        <button
          onClick={onCreateProject}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="新建项目"
        >
          <Plus className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索项目名称或ID..."
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg
              focus:outline-none focus:ring-1 focus:ring-[#2563eb]/30 focus:border-[#2563eb]/30
              placeholder:text-gray-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 transition-colors"
              aria-label="清除搜索"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 切换 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
        {renderTab('all', '全部', tabCounts.all)}
        {renderTab('studio', '创作室', tabCounts.studio)}
        {renderTab('history', '历史库', tabCounts.history)}
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto p-2" role="list" aria-labelledby="sidebar-title">
        {renderProjectList()}

        {/* 空状态 */}
        {filteredProjects.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            <div className="text-center">
              {searchQuery ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>未找到匹配的项目</p>
                  <p className="text-xs mt-1 text-gray-300">尝试其他关键词</p>
                </>
              ) : (
                <>
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>
                    {activeTab === 'studio' ? '创作室暂无项目' :
                     activeTab === 'history' ? '历史库暂无项目' : '暂无项目'}
                  </p>
                  {activeTab === 'all' && (
                    <p className="text-xs mt-1">点击右上角 + 创建新项目</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 使用 Portal 渲染菜单到 body，避免 ref 和 DOM 结构问题 */}
      {menuOpenId && menuPosition && createPortal(
        <>
          {/* 透明 backdrop，捕获外部点击 */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeMenu}
          />
          {/* 菜单面板 - 找到对应的项目进行操作 */}
          <div
            className="fixed z-[9999] bg-white rounded-lg shadow-lg border py-1 min-w-[120px]"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {filteredProjects.find(p => p.id === menuOpenId) && (
              <>
                <button
                  onClick={() => handlePin(menuOpenId, filteredProjects.find(p => p.id === menuOpenId)?.isPinned || false)}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <Pin className={`h-3.5 w-3.5 ${filteredProjects.find(p => p.id === menuOpenId)?.isPinned ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                  {filteredProjects.find(p => p.id === menuOpenId)?.isPinned ? '取消置顶' : '置顶'}
                </button>
                <button
                  onClick={() => handleStartRename(menuOpenId, filteredProjects.find(p => p.id === menuOpenId)?.title || '')}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                  重命名
                </button>
                <button
                  onClick={() => handleDelete(menuOpenId, filteredProjects.find(p => p.id === menuOpenId)?.title || '未命名项目')}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="删除项目"
        message={`确定要删除项目「${deleteConfirm.title}」吗？\n删除后可在回收站恢复。`}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
}