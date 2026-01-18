import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Calendar,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check
} from 'lucide-react';
import { ProjectSession, ProjectStatus } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from '../constants';

// --- Cascading Filter Component ---
const CascadingFilter: React.FC<{
  label: string;
  value: string;
  systemOptions: string[];
  customOptions: string[];
  onChange: (val: string) => void;
  active: boolean;
}> = ({ label, value, systemOptions, customOptions, onChange, active }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoverCategory, setHoverCategory] = useState<'system' | 'custom'>('system');
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Close on any scroll to prevent floating menu detachment
    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  const dropdownMenu = (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-xl shadow-xl border border-slate-100 z-[9999] flex overflow-hidden min-w-[280px] animate-in fade-in zoom-in-95 duration-200"
      style={{ top: position.top, left: position.left }}
    >
      {/* Level 1: Categories */}
      <div className="w-28 bg-slate-50 border-r border-slate-100 py-2 flex flex-col">
        <button
          onMouseEnter={() => setHoverCategory('system')}
          className={`text-left px-3 py-2 text-xs font-medium flex items-center justify-between ${hoverCategory === 'system' ? 'bg-white text-blue-600' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
        >
          <span>系统内置</span>
          {hoverCategory === 'system' && <ChevronRight size={12} />}
        </button>
        <button
          onMouseEnter={() => setHoverCategory('custom')}
          className={`text-left px-3 py-2 text-xs font-medium flex items-center justify-between ${hoverCategory === 'custom' ? 'bg-white text-blue-600' : 'text-slate-600 hover:bg-slate-100/50'
            }`}
        >
          <span>自定义</span>
          {hoverCategory === 'custom' && <ChevronRight size={12} />}
        </button>
      </div>

      {/* Level 2: Options */}
      <div className="flex-1 py-2 max-h-[300px] overflow-y-auto min-w-[160px]">
        <div className="px-2 pb-1 mb-1 border-b border-slate-50">
          <span className="text-[10px] text-slate-400 font-bold px-2">
            {hoverCategory === 'system' ? '系统预设' : '我的足迹'}
          </span>
        </div>

        {hoverCategory === 'system' ? (
          systemOptions.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-slate-50 ${value === opt ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600'
                }`}
            >
              {opt}
              {value === opt && <Check size={12} />}
            </button>
          ))
        ) : (
          customOptions.length > 0 ? customOptions.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-slate-50 ${value === opt ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-600'
                }`}
            >
              {opt}
              {value === opt && <Check size={12} />}
            </button>
          )) : (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              暂无自定义记录
            </div>
          )
        )}

        {/* Clear Option */}
        <div className="mt-2 pt-2 border-t border-slate-50 px-2">
          <button
            onClick={() => { onChange(""); setIsOpen(false); }}
            className="w-full text-center py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
          >
            清除筛选
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${active || isOpen
          ? 'bg-blue-50 text-blue-600 border-blue-200'
          : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
          }`}
      >
        <span>{value || `所有${label}`}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

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
  // Lifted Filter States
  statusFilter?: ProjectStatus | 'all';
  setStatusFilter?: (status: ProjectStatus | 'all') => void;

  styleFilter?: string[];
  setStyleFilter?: (val: string[]) => void;
  ratioFilter?: string[];
  setRatioFilter?: (val: string[]) => void;
  paletteFilter?: string[];
  setPaletteFilter?: (val: string[]) => void;

  timeTypeFilter?: "lastModified" | "createdAt";
  setTimeTypeFilter?: (val: "lastModified" | "createdAt") => void;
  startDateFilter?: string;
  setStartDateFilter?: (val: string) => void;
  endDateFilter?: string;
  setEndDateFilter?: (val: string) => void;
  timeFilter?: string;
  setTimeFilter?: (val: string) => void;

  sortBy?: 'createdAt' | 'lastModified' | 'progress';
  setSortBy?: (val: 'createdAt' | 'lastModified' | 'progress') => void;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: (val: 'asc' | 'desc') => void;
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
  statusFilter = 'all',
  setStatusFilter,
  styleFilter = [],
  setStyleFilter,
  ratioFilter = [],
  setRatioFilter,
  paletteFilter = [],
  setPaletteFilter,
  timeTypeFilter = 'lastModified',
  setTimeTypeFilter,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  timeFilter,
  setTimeFilter,
  sortBy = 'lastModified',
  setSortBy,
  sortOrder = 'desc',
  setSortOrder
}) => {
  // const [methodFilter, setMethodFilter] = useState<string>('all'); // Removed
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);

  // --- Derived Data for Filters ---
  const styleTags = useMemo(() => Array.from(new Set(projects.map(p => p.globalConfig?.styleName).filter(Boolean))), [projects]);
  const ratioTags = useMemo(() => Array.from(new Set(projects.map(p => p.globalConfig?.aspectRatio).filter(Boolean))), [projects]);
  const paletteTags = useMemo(() => Array.from(new Set(projects.map(p => p.globalConfig?.colorPalette).filter(Boolean))), [projects]);

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
    const activeProjectTotal = generatingProjects + pausedProjects + inProgressProjects;

    // --- Page Stats (Deep Dive) ---
    // Flatten all items from all projects
    const allItems = projects.flatMap(p => p.items || []);

    const totalPages = allItems.length;
    const successPages = allItems.filter(i => i.status === 'success').length;

    // Today's Pages (Approximate: based on project creation OR item creation if tracked)
    // Using project creation for simplicity as items don't always track separate dates in minimal view
    const todayProjectItems = projects.filter(p => p.createdAt >= todayTimestamp).flatMap(p => p.items || []);
    const todayPlannedPages = todayProjectItems.length;

    // Calculate Average Page Generation Time (Mock or Real)
    // Real logic would require start/end timestamps per page. 
    // We can infer from project modification time / count? Rough estimate.
    const avgPageTime = "0.5"; // Hardcoded for V1

    // Find Last Edited
    const lastEditedProject = [...projects].sort((a, b) => b.lastModified - a.lastModified)[0];

    return {
      totalProjects,
      todayProjects,
      generatingProjects,
      pausedProjects,
      inProgressProjects,
      idleProjects,
      completedProjects,
      activeProjectsCount: activeProjectTotal,
      // Page Level
      totalPages,
      successPages,
      todayPlannedPages,
      // Derived rates
      pageCompletionRate: totalPages > 0 ? Math.round((successPages / totalPages) * 100) : 0,
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
        // Exclude completed projects (they belong to History)
        if (p.status === 'completed') return false;

        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.displayId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

        // New Filters
        const matchesStyle = styleFilter && styleFilter.length > 0
          ? styleFilter.includes(p.globalConfig?.styleName!)
          : true;
        const matchesRatio = ratioFilter && ratioFilter.length > 0
          ? ratioFilter.includes(p.globalConfig?.aspectRatio!)
          : true;
        const matchesPalette = paletteFilter && paletteFilter.length > 0
          ? paletteFilter.includes(p.globalConfig?.colorPalette!)
          : true;

        // Time Filtering
        const timestamp = timeTypeFilter === 'createdAt' ? p.createdAt : p.lastModified;

        const matchesTime = (() => {
          if (!timeFilter) return true;
          const now = Date.now();
          const diff = now - (timestamp || 0);
          const ONE_DAY = 24 * 60 * 60 * 1000;
          if (timeFilter === "24h") return diff <= ONE_DAY;
          if (timeFilter === "7d") return diff <= 7 * ONE_DAY;
          if (timeFilter === "30d") return diff <= 30 * ONE_DAY;
          return true;
        })();

        const matchesDateRange = (() => {
          if (!startDateFilter && !endDateFilter) return true;
          const t = timestamp || 0;
          if (startDateFilter && t < new Date(startDateFilter).getTime()) return false;
          // End date should include the whole day, so add 24h - 1ms
          if (endDateFilter && t > new Date(endDateFilter).getTime() + 86400000) return false;
          return true;
        })();

        return matchesSearch && matchesStatus && matchesStyle && matchesRatio && matchesPalette && matchesTime && matchesDateRange;
      })
      .sort((a, b) => {
        // Pin priority (Always pinned first)
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;

        let res = 0;
        // Secondary sort
        if (sortBy === 'progress') res = b.progress - a.progress;
        else res = (b[sortBy!] as number) - (a[sortBy!] as number);

        return sortOrder === 'desc' ? res : -res;
      });
  }, [
    projects, searchQuery, statusFilter,
    styleFilter, ratioFilter, paletteFilter,
    timeTypeFilter, timeFilter, startDateFilter, endDateFilter,
    sortBy, sortOrder
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    if (setStatusFilter) setStatusFilter('all');
    if (setStyleFilter) setStyleFilter([]);
    if (setRatioFilter) setRatioFilter([]);
    if (setPaletteFilter) setPaletteFilter([]);
    if (setTimeTypeFilter) setTimeTypeFilter("lastModified");
    if (setTimeFilter) setTimeFilter("");
    if (setStartDateFilter) setStartDateFilter("");
    if (setEndDateFilter) setEndDateFilter("");
    if (setSortBy) setSortBy("lastModified");
    if (setSortOrder) setSortOrder("desc");
  };

  return (
    <div className="flex-1 bg-[#f8fafc] overflow-y-hidden">
      <div className="max-w-full mx-auto px-6 py-0 space-y-6">

        {/* --- Advanced Dimension Analytics Bar --- */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          {/* (Keeping Analytics UI as is) */}
          <div className="flex items-center justify-between gap-6 overflow-hidden">
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

        {/* --- Search & Filter Toolbar (Compact) --- */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 flex flex-nowrap items-center gap-2 sticky top-[80px] z-30 transition-all overflow-x-auto no-scrollbar">

          {/* 1. Search (Expanded) */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="搜索项目名称或ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-200 rounded-xl text-xs transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Spacer replaced by margin */}

          {/* 2. Filters (Cascading & Standard) */}
          <div className="flex items-center gap-1.5 overflow-visible">
            {/* Status (Standard Select) */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter && setStatusFilter(e.target.value as any)}
                className={`appearance-none bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg py-1.5 pl-2.5 pr-6 text-xs font-medium text-slate-600 outline-none cursor-pointer transition-all ${statusFilter !== 'all' ? 'text-blue-600 font-bold bg-blue-50 border-blue-100' : ''
                  }`}
              >
                <option value="all">所有状态</option>
                <option value="idle">未开始</option>
                <option value="in-progress">进行中</option>
                <option value="generating">生成中</option>
                <option value="error">失败</option>
              </select>
              <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Style Cascading */}
            <CascadingFilter
              label="风格"
              value={styleFilter?.[0] || ""}
              active={!!(styleFilter && styleFilter.length > 0)}
              systemOptions={STYLE_PRESETS}
              customOptions={styleTags.filter(t => !STYLE_PRESETS.includes(t!)) as string[]}
              onChange={(val) => setStyleFilter && setStyleFilter(val ? [val] : [])}
            />

            {/* Ratio */}
            <div className="relative">
              <select
                value={ratioFilter?.[0] || ""}
                onChange={(e) => setRatioFilter && setRatioFilter(e.target.value ? [e.target.value] : [])}
                className={`appearance-none bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg py-1.5 pl-2.5 pr-6 text-xs font-medium text-slate-600 outline-none cursor-pointer transition-all ${ratioFilter && ratioFilter.length > 0 ? 'text-blue-600 font-bold bg-blue-50 border-blue-100' : ''
                  }`}
              >
                <option value="">所有比例</option>
                {RATIO_PRESETS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <Filter size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Palette Cascading */}
            <CascadingFilter
              label="配色"
              value={paletteFilter?.[0] || ""}
              active={!!(paletteFilter && paletteFilter.length > 0)}
              systemOptions={COLOR_PRESETS}
              customOptions={paletteTags.filter(t => !COLOR_PRESETS.includes(t!)) as string[]}
              onChange={(val) => setPaletteFilter && setPaletteFilter(val ? [val] : [])}
            />

            <div className="w-px h-4 bg-slate-200 mx-0.5" />

            {/* Combined Time Controls */}
            <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-100 shrink-0">
              {/* Time Basis */}
              <select
                value={timeTypeFilter || "lastModified"}
                onChange={(e) => setTimeTypeFilter && setTimeTypeFilter(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold text-slate-500 hover:text-blue-600 outline-none cursor-pointer pl-2 pr-1"
              >
                <option value="lastModified">活跃</option>
                <option value="createdAt">创建</option>
              </select>

              <div className="w-px h-3 bg-slate-200" />

              {/* Time Range */}
              <div className="relative">
                <select
                  value={timeFilter || ""}
                  onChange={(e) => {
                    if (setTimeFilter) setTimeFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      if (setStartDateFilter) setStartDateFilter("");
                      if (setEndDateFilter) setEndDateFilter("");
                    }
                  }}
                  className={`appearance-none bg-transparent py-1 pl-2 pr-5 text-xs font-medium text-slate-600 outline-none cursor-pointer transition-all ${timeFilter ? 'text-blue-600 font-bold' : ''
                    }`}
                >
                  <option value="">全部时间</option>
                  <option value="24h">24H</option>
                  <option value="7d">7天</option>
                  <option value="30d">30天</option>
                  <option value="custom">自定义</option>
                </select>
                <Calendar size={10} className="absolute right-0.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {/* Custom Date Inputs (Always Visible for Stability) */}
              <div className={`flex items-center gap-1 transition-all duration-200 shrink-0 ${timeFilter === 'custom' ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                <div className="w-px h-3 bg-slate-200 mx-0.5" />
                <input
                  type="date"
                  value={startDateFilter || ""}
                  disabled={timeFilter !== 'custom'}
                  onChange={(e) => setStartDateFilter && setStartDateFilter(e.target.value)}
                  className="w-[105px] px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 outline-none focus:border-blue-300 focus:ring-1 transition-all font-mono disabled:bg-slate-50"
                  placeholder="开始"
                />
                <span className="text-slate-300 transform -translate-y-px">-</span>
                <input
                  type="date"
                  value={endDateFilter || ""}
                  disabled={timeFilter !== 'custom'}
                  onChange={(e) => setEndDateFilter && setEndDateFilter(e.target.value)}
                  className="w-[105px] px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] text-slate-600 outline-none focus:border-blue-300 focus:ring-1 transition-all font-mono disabled:bg-slate-50"
                  placeholder="结束"
                />
              </div>
            </div>
          </div>


          {/* 3. Sort & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative group hidden xl:block">
              <select
                value={sortBy}
                onChange={(e) => setSortBy && setSortBy(e.target.value as any)}
                className="appearance-none bg-transparent hover:bg-slate-50 rounded-lg py-1.5 pl-2 pr-2 text-xs font-bold text-slate-500 hover:text-slate-700 outline-none cursor-pointer transition-all text-left"
              >
                <option value="lastModified">按活跃</option>
                <option value="createdAt">按创建</option>
                <option value="progress">按进度</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder && setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
              title={sortOrder === 'asc' ? "升序" : "降序"}
            >
              <ArrowUpDown size={14} className={sortOrder === 'asc' ? "rotate-180" : ""} />
            </button>

            <button
              onClick={handleResetFilters}
              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
              title="重置"
            >
              <RefreshCcw size={14} />
            </button>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <button
              onClick={onCreateProject}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="hidden md:inline">新建项目</span>
              <span className="md:hidden">新建</span>
            </button>
          </div>
        </div>

        {/* --- Project Grid (Active) --- */}
        {filteredProjects.length > 0 ? (
          <div className="space-y-12 pb-20 w-full">
            {/* Non-Completed Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
              {filteredProjects.filter(p => true).map(project => (
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
  const [thumbPage, setThumbPage] = useState(0);

  return (
    <div className={`bg-white rounded-3xl overflow-hidden border transition-all group relative flex flex-col h-full ${project.isPinned ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100'
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
      <div className="p-5 flex-1" onClick={onOpen}>
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

        {/* Filmstrip View (Paginated) */}
        <div className="relative group/filmstrip">
          <div className="flex gap-2 overflow-hidden py-2 -mx-1 px-1">
            {project.items.slice(thumbPage * 5, (thumbPage + 1) * 5).map((item, idx) => {
              const itemThumb = (item.variants && item.variants.length > 0) ? item.variants[0] : item.previewUrl;
              return (
                <div key={item.id} className="relative w-12 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-sm group/thumb">
                  {itemThumb ? (
                    <img src={itemThumb} className="w-full h-full object-cover" alt={`page ${idx}`} />
                  ) : (
                    <Clock3 size={12} className="text-slate-300" />
                  )}
                  {/* Page Type Badge */}
                  <div className="absolute bottom-0 right-0 bg-black/60 backdrop-blur-[1px] px-1 rounded-tl-md">
                    <span className="text-[8px] font-bold text-white leading-none block py-0.5">
                      {item.pageType === 'cover' ? '封' :
                        item.pageType === 'directory' ? '目' :
                          item.pageType === 'transition' ? '转' :
                            item.pageType === 'end' ? '结' : '文'}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Placeholder for empty slots to maintain height if needed, usually not with flex */}
          </div>

          {/* Pagination Controls - Overlay */}
          {project.items.length > 5 && (
            <>
              {thumbPage > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setThumbPage(p => p - 1); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 shadow-md border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-110 transition-all z-20 opacity-0 group-hover/filmstrip:opacity-100"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              {(thumbPage + 1) * 5 < project.items.length && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setThumbPage(p => p + 1); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 shadow-md border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 hover:scale-110 transition-all z-20 opacity-0 group-hover/filmstrip:opacity-100"
                >
                  <ChevronRight size={14} />
                </button>
              )}
              {/* Page Indicator (Optional - tiny dots?) - Maybe not needed for simple prev/next */}
            </>
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
