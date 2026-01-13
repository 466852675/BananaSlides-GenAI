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
  Clock3
} from 'lucide-react';
import { ProjectSession, ProjectStatus } from '../types';

interface DashboardProps {
  projects: ProjectSession[];
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onTogglePause: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onCreateProject,
  onOpenProject,
  onTogglePause,
  onDeleteProject,
  onTogglePin
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastModified' | 'progress'>('lastModified');
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

  // --- Analytics Calculation ---
  const stats = useMemo(() => {
    const totalPages = projects.reduce((acc, p) => acc + p.items.length, 0);
    const totalHoursSaved = (totalPages * 20) / 60; // 20 mins per page
    const activeProjects = projects.filter(p => p.status === 'generating').length;
    const pausedProjects = projects.filter(p => p.status === 'paused').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    const successfulPages = projects.reduce((acc, p) => acc + p.items.filter(i => i.status === 'success').length, 0);
    const successRate = totalPages > 0 ? Math.round((successfulPages / totalPages) * 100) : 100;

    // Calc growth (Week-over-week logic)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentPages = projects.reduce((acc, p) => acc + p.items.filter(i => i.createdAt > sevenDaysAgo).length, 0);
    const growth = totalPages > 0 ? Math.round((recentPages / (totalPages - recentPages || 1)) * 100) : 0;

    return {
      totalPages,
      totalHoursSaved: totalHoursSaved.toFixed(1),
      activeProjects,
      pausedProjects,
      completedProjects,
      successRate,
      growth: growth > 0 ? `↑ ${growth}%` : '稳定'
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
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] custom-scrollbar">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* --- Analytics Header --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={<Rocket className="text-blue-500" />}
            label="生产力指数"
            value={`${stats.totalPages} P`}
            subValue="累计产出页面"
            trend={stats.growth}
            trendUp={parseInt(stats.growth) > 0}
            sparkline={[30, 45, 35, 60, 55, 75, 90]}
          />
          <StatCard 
            icon={<Clock className="text-emerald-500" />}
            label="节省工时"
            value={`${stats.totalHoursSaved} H`}
            subValue="AI 创造价值"
            trend="精益求精"
            sparkline={[20, 30, 40, 35, 50, 60, 80]}
          />
          <StatCard 
            icon={<BarChart3 className="text-amber-500" />}
            label="项目管线"
            value={stats.activeProjects}
            subValue={`生成中: ${stats.activeProjects} | 暂停: ${stats.pausedProjects}`}
            sparkline={[5, 10, 8, 15, 12, 18, 20]}
          />
          <StatCard 
            icon={<Zap className="text-purple-500" />}
            label="引擎效率"
            value={`${stats.successRate}%`}
            subValue="单页平均 15s"
            sparkline={[90, 95, 92, 98, 97, 100, 99]}
          />
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
            <FilterChip active={statusFilter === 'generating'} onClick={() => setStatusFilter('generating')}>进行中</FilterChip>
            <FilterChip active={statusFilter === 'paused'} onClick={() => setStatusFilter('paused')}>已暂停</FilterChip>
            <FilterChip active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>已完成</FilterChip>
            
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
            {/* Active Projects */}
            <div className="space-y-4">
               <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                 <Rocket size={20} className="text-blue-500" />
                 进行中的项目
                 <span className="text-xs font-bold text-slate-400">({filteredProjects.filter(p => p.status !== 'completed').length})</span>
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredProjects.filter(p => p.status !== 'completed').map(project => (
                   <ProjectCard 
                     key={project.id}
                     project={project}
                     onOpen={() => onOpenProject(project.id)}
                     onTogglePause={() => onTogglePause(project.id)}
                     onDelete={() => onDeleteProject(project.id)}
                     onTogglePin={() => onTogglePin(project.id)}
                     timeAgo={timeAgo}
                   />
                 ))}
               </div>
            </div>

            {/* Archive Section */}
            {filteredProjects.some(p => p.status === 'completed') && (
              <div className="space-y-4 pt-8 border-t border-slate-100">
                 <button 
                  onClick={() => setIsArchiveExpanded(!isArchiveExpanded)}
                  className="flex items-center gap-2 group"
                 >
                   <h3 className="text-lg font-black text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-2">
                     <History size={20} />
                     历史归档
                     <span className="text-xs font-bold">({filteredProjects.filter(p => p.status === 'completed').length})</span>
                   </h3>
                   <ArrowUpDown size={14} className={`text-slate-300 transition-transform ${isArchiveExpanded ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isArchiveExpanded && (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                     {filteredProjects.filter(p => p.status === 'completed').map(project => (
                       <ProjectCard 
                         key={project.id}
                         project={project}
                         onOpen={() => onOpenProject(project.id)}
                         onTogglePause={() => onTogglePause(project.id)}
                         onDelete={() => onDeleteProject(project.id)}
                         onTogglePin={() => onTogglePin(project.id)}
                         timeAgo={timeAgo}
                       />
                     ))}
                   </div>
                 )}
              </div>
            )}
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
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
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
    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
      active ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-100'
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
  timeAgo: (t: number) => string;
}> = ({ project, onOpen, onTogglePause, onDelete, onTogglePin, timeAgo }) => {
  return (
    <div className={`bg-white rounded-3xl overflow-hidden border transition-all group relative ${
      project.isPinned ? 'border-blue-200 shadow-md ring-1 ring-blue-50' : 'border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100'
    }`}>
      {/* Pin Icon */}
      <button 
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all z-10 ${
          project.isPinned ? 'bg-blue-500 text-white shadow-lg' : 'bg-white/80 backdrop-blur text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-500'
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
            <h5 className="font-bold text-slate-800 truncate mb-1">{project.title}</h5>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                project.status === 'generating' ? 'bg-blue-50 text-blue-600 animate-pulse' :
                project.status === 'paused' ? 'bg-amber-50 text-amber-600' :
                project.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                {project.status === 'generating' ? '生成中' :
                 project.status === 'paused' ? '已暂停' :
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
              {project.items.filter(i => i.status === 'success').length} / {project.items.length || 0} Pages
            </span>
            <span className="text-xs font-black text-blue-600">{project.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${
                project.status === 'error' ? 'bg-rose-500' : 'bg-blue-500'
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
        <div className="flex items-center gap-2 text-slate-400">
          <Clock size={12} />
          <span className="text-[10px] font-medium">{timeAgo(project.lastModified)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onTogglePause(); }}
            className={`p-1.5 rounded-lg transition-all ${
              project.status === 'generating' ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-blue-100 text-blue-600'
            }`}
          >
            {project.status === 'generating' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition-all"
          >
            <Trash2 size={16} />
          </button>
          <button 
            onClick={onOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-all ml-1"
          >
            <ArrowRight size={18} />
             <span className="text-[10px] font-bold ml-1">查看项目详情</span>
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
