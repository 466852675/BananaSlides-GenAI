/**
 * AgentSidebar 侧边栏组件
 *
 * 显示项目列表，支持全部/创作室/历史库 TAB 切换
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, CheckCircle, XCircle, Pause, Play, Loader2, ChevronDown, ChevronRight, Bot, FileText } from 'lucide-react';
import type { AgentSession, AgentProgressResponse } from '../types/agent';
import type { ProjectWithSession } from '../api/agent';

interface AgentSidebarProps {
  projects: ProjectWithSession[];
  currentProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  session: AgentSession | null;
  progress: AgentProgressResponse | null;
  onCreateProject?: () => void;
}

// TAB 类型
type TabType = 'all' | 'studio' | 'history';

// 项目状态显示配置
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'generating': { label: '生成中', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'in-progress': { label: '进行中', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'idle': { label: '未开始', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  'paused': { label: '已暂停', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  'error': { label: '失败', color: 'text-red-600', bgColor: 'bg-red-50' },
  'completed': { label: '已完成', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
};

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

export default function AgentSidebar({
  projects,
  currentProjectId,
  onSelectProject,
  session,
  progress,
  onCreateProject
}: AgentSidebarProps) {
  // 当前选中的 TAB
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // 根据 TAB 过滤项目
  const filteredProjects = useMemo(() => {
    switch (activeTab) {
      case 'studio':
        // 创作室：非 completed 且非模板
        return projects.filter(p => p.status !== 'completed' && p.scenarioType !== 'TEMPLATE');
      case 'history':
        // 历史库：completed 且非模板
        return projects.filter(p => p.status === 'completed' && p.scenarioType !== 'TEMPLATE');
      case 'all':
      default:
        // 全部：非模板
        return projects.filter(p => p.scenarioType !== 'TEMPLATE');
    }
  }, [projects, activeTab]);

  // 各 TAB 的数量
  const tabCounts = useMemo(() => ({
    all: projects.filter(p => p.scenarioType !== 'TEMPLATE').length,
    studio: projects.filter(p => p.status !== 'completed' && p.scenarioType !== 'TEMPLATE').length,
    history: projects.filter(p => p.status === 'completed' && p.scenarioType !== 'TEMPLATE').length
  }), [projects]);

  // 进度百分比
  const progressPercent = progress
    ? Math.round((progress.completedTasks / Math.max(progress.totalTasks, 1)) * 100)
    : 0;

  // 时间格式化
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours === 0) {
        const mins = Math.floor(diff / (60 * 1000));
        return mins <= 1 ? '刚刚' : `${mins}分钟前`;
      }
      return `${hours}小时前`;
    }
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  // 项目卡片组件
  const ProjectCard = ({ project }: { project: ProjectWithSession }) => {
    const isActive = project.id === currentProjectId;
    const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG['idle'];
    const hasSession = project.agentSession !== null;

    return (
      <motion.button
        onClick={() => onSelectProject(project.id)}
        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
          isActive
            ? 'border-black bg-white shadow-sm'
            : 'border-transparent hover:bg-gray-50'
        }`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* 标题行 */}
        <div className="flex items-center gap-2 mb-1.5">
          {hasSession ? getSessionStatusIcon(project.agentSession!.status) : null}
          <span className="flex-1 truncate text-sm font-medium text-gray-800">
            {project.title || '未命名项目'}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusConfig.color} ${statusConfig.bgColor}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* 项目信息 */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {project.displayId && (
            <span className="truncate">{project.displayId}</span>
          )}
          <span>{formatTime(project.updatedAt)}</span>
        </div>

        {/* 当前会话进度 */}
        {isActive && progress && progress.totalTasks > 0 && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                进度
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full bg-black"
              />
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
              <span>完成 {progress.completedTasks}/{progress.totalTasks}</span>
              {progress.totalPointsUsed > 0 && (
                <span>消耗 {progress.totalPointsUsed} 积分</span>
              )}
            </div>
          </div>
        )}
      </motion.button>
    );
  };

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

      {/* TAB 切换 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-black text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          全部 {tabCounts.all > 0 && `(${tabCounts.all})`}
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'studio'
              ? 'bg-black text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          创作室 {tabCounts.studio > 0 && `(${tabCounts.studio})`}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'history'
              ? 'bg-black text-white'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          历史库 {tabCounts.history > 0 && `(${tabCounts.history})`}
        </button>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto p-2" role="list" aria-labelledby="sidebar-title">
        <AnimatePresence>
          <div className="space-y-1">
            {filteredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </AnimatePresence>

        {/* 空状态 */}
        {filteredProjects.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>
                {activeTab === 'studio' ? '创作室暂无项目' :
                 activeTab === 'history' ? '历史库暂无项目' : '暂无项目'}
              </p>
              {activeTab === 'all' && (
                <p className="text-xs mt-1">点击右上角 + 创建新项目</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="border-t border-gray-100 p-3">
        <div className="text-xs text-gray-400">
          Agent 模式 • {session?.mode === 'AUTO' ? '自动执行' : '引导模式'}
        </div>
      </div>
    </div>
  );
}