import React, { useState, useMemo } from 'react';
import {
  Rocket,
  Clock,
  BarChart3,
  Zap,
  Search,
  Filter,
  ArrowUpDown,
  Pin,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
  History,
  Calendar
} from 'lucide-react';
import { ProjectSession, ProjectStatus } from '../types';

interface DashboardProps {
  projects: ProjectSession[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onTogglePause: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onTogglePin: (id: string) => void;
  onStartProject: (id: string) => void;
  // Lifted Search State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // Lifted Filter States (Optional for now, but good to add for consistency)
  statusFilter?: ProjectStatus | 'all';
  setStatusFilter?: (status: ProjectStatus | 'all') => void;
  progressFilter?: string; // Placeholder if needed
  setProgressFilter?: (val: string) => void;
  timeTypeFilter?: "lastModified" | "createdAt" | "priority";
  setTimeTypeFilter?: (val: "lastModified" | "createdAt" | "priority") => void;
  startDateFilter?: string;
  setStartDateFilter?: (val: string) => void;
  endDateFilter?: string;
  setEndDateFilter?: (val: string) => void;
  timeFilter?: string;
  setTimeFilter?: (val: string) => void;
  sortBy?: 'createdAt' | 'lastModified' | 'progress';
  setSortBy?: (val: 'createdAt' | 'lastModified' | 'progress') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onTogglePause,
  onDeleteProject,
  onTogglePin,
  onStartProject,
  searchQuery,
  setSearchQuery,
  // Filters could be destructured here if implemented
}) => {
  // const [searchQuery, setSearchQuery] = useState(''); // Removed internal state
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all'); // Keeping internal for now unless passed
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastModified' | 'progress'>('createdAt');
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  // --- Helpers ---
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return new Date(timestamp).toLocaleDateString();
  };

  // --- Analytics Calculation (Project + Page Dimensions) ---
  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    // --- Project Stats ---
    const totalProjects = projects.length;
    const todayProjects = projects.filter(p => p.createdAt >= todayTimestamp).length;

    // Status counts
    const generatingProjects = projects.filter(p => p.status === 'generating').length;
    const pausedProjects = projects.filter(p => p.status === 'paused').length;
    const inProgressProjects = projects.filter(p => p.status === 'in-progress').length;
    const idleProjects = projects.filter(p => p.status === 'idle').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;

    // Derived Groupings
    // "Ongoing" in Dashboard should logically include anything that is NOT completed and NOT error
    // But to be precise with the UI label "In Progress" (进行中), we usually mean active + paused + idle (todo)
    const activeProjectsCount = generatingProjects + pausedProjects + inProgressProjects + idleProjects;

    const projectCompletionRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    // --- Page Stats ---
    const totalPages = projects.reduce((acc, p) => acc + p.items.length, 0);
    const todayPlannedPages = projects
      .filter(p => p.createdAt >= todayTimestamp)
      .reduce((acc, p) => acc + p.items.length, 0);
    const generatingPages = projects.reduce((acc, p) => acc + p.items.filter(i => i.status === 'generating').length, 0);
    const successPages = projects.reduce((acc, p) => acc + p.items.filter(i => i.status === 'success').length, 0);
    const todaySuccessPages = projects
      .filter(p => p.createdAt >= todayTimestamp)
      .reduce((acc, p) => acc + p.items.filter(i => i.status === 'success').length, 0);
    const pageCompletionRate = todayPlannedPages > 0 ? Math.round((todaySuccessPages / todayPlannedPages) * 100) : 0;

    // --- Last Edited Project ---
    const sortedByModified = [...projects].sort((a, b) => b.lastModified - a.lastModified);
    const lastEditedProject = sortedByModified[0] || null;

    // --- Efficiency Stats ---
    let avgPageTime = 2.5; // Default fallback
    if (completedProjects > 0) {
      const completedList = projects.filter(p => p.status === 'completed');
      const totalDurationMs = completedList.reduce((acc, p) => acc + (p.lastModified - p.createdAt), 0);
      const totalCompletedPages = completedList.reduce((acc, p) => acc + p.items.length, 0);
      if (totalCompletedPages > 0) {
        // Minutes per page
        avgPageTime = parseFloat(((totalDurationMs / 1000 / 60) / totalCompletedPages).toFixed(1));
      }
    }

    return {
      // Project
      totalProjects,
      todayProjects,
      generatingProjects,
      pausedProjects,
      completedProjects,
      activeProjectsCount, // New
      projectCompletionRate,
      // Page
      totalPages,
      todayPlannedPages,
      generatingPages,
      successPages,
      pageCompletionRate,
      // Efficiency
      avgPageTime,
      // Quick Resume
      lastEditedProject
    };
  }, [projects]);

  // --- Filtering & Sorting ---
  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.styleTemplateId || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesMethod = methodFilter === 'all' || (p.methods && p.methods.includes(methodFilter));
        return matchesSearch && matchesStatus && matchesMethod;
      })
      .sort((a, b) => {
        // Pin priority
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        // Secondary sort
        if (sortBy === 'progress') return b.progress - a.progress;
        return b[sortBy] - a[sortBy];
      });
  }, [projects, searchQuery, statusFilter, sortBy]);

  return (
    <div className="flex-1 bg-[#f8fafc] overflow-y-hidden">
      <div className="max-w-full mx-auto px-6 py-0 space-y-6">

        {/* --- Advanced Dimension Analytics Bar --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
            {/* 1. Cumulative (Highlighted) */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                <Rocket size={24} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">累计创作</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">{stats.totalProjects}</span>
                  <span className="text-xs font-bold text-blue-400">份 /</span>
                  <span className="text-2xl font-black text-blue-500 tracking-tighter">{stats.totalPages}</span>
                  <span className="text-xs font-bold text-blue-400">页</span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 mx-2" />

            {/* 2. Today (Main Spotlight) */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                <Calendar size={24} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">今日产出</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">{stats.todayProjects}</span>
                  <span className="text-xs font-bold text-blue-400">份 /</span>
                  <span className="text-2xl font-black text-blue-500 tracking-tighter">{stats.todayPlannedPages}</span>
                  <span className="text-xs font-bold text-blue-400">页</span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 mx-2" />

            {/* 3. Ongoing */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
                <Zap size={20} className={stats.generatingProjects > 0 ? "animate-pulse" : ""} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">待处理 / 进行中</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-amber-500">{stats.activeProjectsCount}</span>
                  <span className="text-[10px] font-bold text-slate-400">份 /</span>
                  {/* For pages, we show "Pending" pages (Total - Success) to indicate work remaining */}
                  <span className="text-lg font-black text-amber-400">
                    {stats.totalPages - stats.successPages}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">页待生成</span>
                </div>
              </div>
            </div>

            {/* 4. Completed */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500">
                <CheckCircle2 size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">已完成</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-500">{stats.completedProjects}</span>
                  <span className="text-[10px] font-bold text-slate-400">份 /</span>
                  <span className="text-lg font-black text-emerald-400">{stats.successPages}</span>
                  <span className="text-[10px] font-bold text-slate-400">页</span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 mx-2" />

            {/* 5. Efficiency (Weakened) */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">平均页面耗时</span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-xl font-black text-slate-700 tracking-tighter">{stats.avgPageTime || '--'}</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">min</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400">
                <BarChart3 size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* --- Ongoing Projects Scrolling Marquee --- */}
        <div className="relative h-10 bg-blue-50/50 rounded-2xl border border-blue-100/50 overflow-hidden flex items-center shadow-[inset_0_2px_4px_rgba(59,130,246,0.02)]">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-blue-50/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-blue-50/50 to-transparent z-10" />

          <div className="whitespace-nowrap animate-marquee flex items-center gap-12 text-sm font-bold text-blue-600">
            {projects.length > 0 ? (
              (() => {
                // Priority: Generating/Paused > Latest Modified
                const activeProjects = projects.filter(p => p.status === 'generating' || p.status === 'paused');
                const latestProject = activeProjects.length > 0
                  ? activeProjects.sort((a, b) => b.lastModified - a.lastModified)[0]
                  : [...projects].sort((a, b) => b.lastModified - a.lastModified)[0];

                const isOngoing = latestProject.status === 'generating' || latestProject.status === 'paused';

                return (
                  <button
                    onClick={() => onOpenProject(latestProject.id)}
                    className="flex items-center gap-2 px-6 hover:text-rose-500 transition-colors cursor-pointer group"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${latestProject.status === 'generating' ? 'bg-blue-400' : 'bg-slate-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${latestProject.status === 'generating' ? 'bg-blue-500' : 'bg-slate-500'}`}></span>
                    </span>
                    <span className="group-hover:underline underline-offset-4 decoration-rose-400/30">
                      {isOngoing ? "⚡ 正在进行中：" : "🕒 最近更新："}
                      <span className="text-blue-700">{latestProject.title || '未命名项目'}</span>
                      —— 点击此处快速{isOngoing ? "[继续编辑]" : "[查看详情]"}
                    </span>
                  </button>
                );
              })()
            ) : (
              <div className="flex items-center gap-2 px-6">
                <Clock size={14} className="opacity-50" />
                <span>暂无进行中的项目，开启你的智能演说创作之旅吧 🚀</span>
              </div>
            )}
          </div>

          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes marquee {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee {
              animation: marquee 15s linear infinite;
              display: inline-flex;
              width: 100%;
              justify-content: center;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}} />
        </div>

        {/* --- Search & Filter Bar --- */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="搜索项目标题或风格模板..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>全部</FilterChip>
            <FilterChip active={statusFilter === 'idle'} onClick={() => setStatusFilter('idle')}>未开始</FilterChip>
            <FilterChip active={statusFilter === 'in-progress'} onClick={() => setStatusFilter('in-progress')}>进行中</FilterChip>
            <FilterChip active={statusFilter === 'generating'} onClick={() => setStatusFilter('generating')}>生成中</FilterChip>
            <FilterChip active={statusFilter === 'error'} onClick={() => setStatusFilter('error')}>生成失败</FilterChip>

            <div className="h-4 w-px bg-slate-200 mx-2" />

            <FilterChip active={methodFilter === 'all'} onClick={() => setMethodFilter('all')}>所有方式</FilterChip>
            <FilterChip active={methodFilter === 'text'} onClick={() => setMethodFilter('text')}>📝 文本</FilterChip>
            <FilterChip active={methodFilter === 'image'} onClick={() => setMethodFilter('image')}>🖼️ 图片</FilterChip>
            <FilterChip active={methodFilter === 'file'} onClick={() => setMethodFilter('file')}>📄 文件</FilterChip>
          </div>

          <div className="h-8 w-px bg-slate-100 hidden md:block" />

          <div className="flex items-center gap-3 shrink-0">
            <select
              className="text-sm bg-slate-50 border-none rounded-xl py-2 pl-3 pr-8 focus:ring-2 focus:ring-blue-500/20"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="lastModified">最后活跃</option>
              <option value="createdAt">创建时间</option>
              <option value="progress">完成进度</option>
            </select>
            <button
              onClick={onCreateProject}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Plus size={18} />
              创建项目
            </button>
          </div>
        </div>

        {/* --- Project Grid (Active) --- */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-12 pb-20">
            {/* Non-Completed Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.filter(p => p.status !== 'completed').map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => onOpenProject(project.id)}
                  onTogglePause={() => onTogglePause(project.id)}
                  onDelete={() => onDeleteProject(project.id)}
                  onTogglePin={() => onTogglePin(project.id)}
                  onStartProject={() => onStartProject(project.id)}
                  timeAgo={timeAgo}
                />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState onCreate={onCreateProject} />
        )}
      </div>
    </div>
  );
};

// --- Sub-components ---

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue: string;
  trend?: string;
  trendUp?: boolean;
  sparkline?: number[];
}> = ({ icon, label, value, subValue, trend, trendUp, sparkline }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow group relative overflow-hidden">
    {/* Sparkline Overlay */}
    {sparkline && (
      <div className="absolute bottom-0 left-0 right-0 h-12 opacity-10 group-hover:opacity-20 transition-opacity">
        <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
          <path
            d={`M 0 40 ${sparkline.map((v, i) => `L ${(i / (sparkline.length - 1)) * 100} ${40 - v}`).join(' ')} L 100 40 Z`}
            fill="currentColor"
            className={trendUp !== false ? 'text-emerald-500' : 'text-blue-500'}
          />
        </svg>
      </div>
    )}

    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
          }`}>
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1 relative z-10">
      <h4 className="text-2xl font-bold text-slate-800">{value}</h4>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      <div className="flex items-center gap-1.5 pt-2">
        <div className="h-1 w-1 rounded-full bg-slate-300" />
        <span className="text-[11px] text-slate-500">{subValue}</span>
      </div>
    </div>
  </div>
);

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${active ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-100'
      }`}
  >
    {children}
  </button>
);

const ProjectCard: React.FC<{
  project: ProjectSession;
  onOpen: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onStartProject: () => void;
  timeAgo: (t: number) => string;
}> = ({ project, onOpen, onTogglePause, onDelete, onTogglePin, onStartProject, timeAgo }) => {
  // Check if start button should be enabled
  const canStart = useMemo(() => {
    if (!project.items || project.items.length === 0) return false;
    return project.items.some(i => i.title || i.textContent || i.originalFile || i.previewUrl);
  }, [project.items]);

  const isGenerating = project.status === 'generating';

  return (
    <div className={`bg-white rounded-3xl overflow-hidden border transition-all group relative ${project.isPinned ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100'
      }`}>
      {/* Pin Icon */}
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all z-10 ${project.isPinned ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-500'
          }`}
      >
        <Pin size={16} fill={project.isPinned ? 'currentColor' : 'none'} className={project.isPinned ? '' : 'rotate-45'} />
      </button>

      {/* Main Content Area */}
      <div className="p-5" onClick={onOpen}>
        <div className="flex gap-4 mb-4">
          <div className="w-16 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-50">
            {project.thumbnailUrl ? (
              <img src={project.thumbnailUrl} className="w-full h-full object-cover" alt="style" />
            ) : (
              <Zap className="text-slate-300" size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              {project.displayId && (
                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 rounded border border-slate-200">
                  {project.displayId}
                </span>
              )}
            </div>
            <h5 className="font-bold text-slate-800 truncate mb-1">{project.title}</h5>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${project.status === 'generating' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                project.status === 'in-progress' ? 'bg-indigo-50 text-indigo-600' :
                  project.status === 'error' ? 'bg-rose-50 text-rose-600' :
                    project.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-slate-50 text-slate-500'
                }`}>
                {project.status === 'generating' ? '生成中' :
                  project.status === 'in-progress' ? '进行中' :
                    project.status === 'error' ? '生成失败' :
                      project.status === 'completed' ? '已完成' : '未开始'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                样式: {project.globalConfig?.styleName || project.styleTemplateId || '自定义'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Breakdown Indicators (Design Proposal Detail) */}
        <div className="flex gap-3 mb-3 px-1">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${project.items.some(i => i.pageType === 'cover') ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">封面</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${project.items.some(i => i.pageType === 'directory') ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">目录</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${project.items.filter(i => i.pageType === 'content').length > 0 ? 'bg-blue-400' : 'bg-slate-200'}`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">正文</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${project.items.some(i => i.pageType === 'end') ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            <span className="text-[9px] font-bold text-slate-400 uppercase">总结</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-end">
            <span className="text-[11px] font-bold text-slate-500">
              <span className="text-slate-700">{project.items.filter(i => i.status === 'success').length}</span>
              <span className="text-slate-300 mx-1">/</span>
              {project.items.length}
              <span className="text-slate-400 ml-1 font-normal">({project.globalConfig?.targetPageCount || 10} P)</span>
            </span>
            <span className="text-xs font-black text-blue-600">{project.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${project.status === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                }`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Filmstrip View (Preview of generated slides) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-1">
          {project.items.slice(0, 5).map((item, idx) => (
            <div key={item.id} className="w-12 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
              {item.previewUrl ? (
                <img src={item.previewUrl} className="w-full h-full object-cover" alt={`page ${idx}`} />
              ) : (
                <Clock3 size={12} className="text-slate-300" />
              )}
            </div>
          ))}
          {project.items.length > 5 && (
            <div className="w-12 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-slate-400">+{project.items.length - 5}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-500" title="最后活跃时间">
            <Clock size={11} />
            <span className="text-[10px] font-bold">{timeAgo(project.lastModified)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400" title="项目创建时间">
            <Calendar size={11} />
            <span className="text-[10px] font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isGenerating) {
                onTogglePause();
              } else if (canStart) {
                onStartProject();
              }
            }}
            disabled={!isGenerating && !canStart}
            className={`p-1.5 rounded-lg transition-all ${!isGenerating && !canStart
              ? 'text-slate-300 cursor-not-allowed bg-slate-50'
              : isGenerating
                ? 'hover:bg-amber-100 text-amber-600 bg-amber-50'
                : 'hover:bg-blue-100 text-blue-600 bg-blue-50'
              }`}
            title={isGenerating ? "暂停生成" : canStart ? "启动生成" : "暂无待成任务"}
          >
            {isGenerating ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-all"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onOpen}
            className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:pr-3 transition-all ml-1 group"
          >
            <span className="text-[10px] font-bold">进入项目</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center animate-bounce duration-[3s]">
      <Plus className="text-blue-500" size={40} />
    </div>
    <div className="max-w-md space-y-2">
      <h4 className="text-xl font-bold text-slate-800">开启您的第一个 PPT 创作之旅</h4>
      <p className="text-slate-500 text-sm">点击下方按钮创建一个新项目，系统将为您提供全自动化的智能生成体验。</p>
    </div>
    <button
      onClick={onCreate}
      className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:scale-105 transition-all"
    >
      创建首个项目
    </button>
  </div>
);
