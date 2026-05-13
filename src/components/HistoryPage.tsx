/**
 * HistoryPage 历史库页面组件
 *
 * 顶部导航栏"历史库"按钮对应的页面视图
 * 从 App.tsx 提取，支持懒加载
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  History,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Settings2,
  ImageIcon,
  Download,
  FileDown,
  Presentation,
  ArrowRight,
  Check,
  Trash2,
  ZoomIn,
  Calendar,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from '../constants';
import { exportToZip, exportToPdf, exportToPptx } from '../services/exportService';
import { consumeAction, getActionCost } from '../api/points';
import { useCommercial } from '../hooks/useCommercial';
import type { ProjectSession } from '../types';

// ============================================================
// ProjectSourceBadge 组件
// ============================================================

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

// ============================================================
// CascadingFilter 子组件
// ============================================================

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

    const handleScroll = (event: Event) => {
      if (menuRef.current && menuRef.current.contains(event.target as Node)) {
        return;
      }
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

        <div className="mt-2 pt-2 border-t border-slate-50 px-2">
          <button
            onClick={(e) => { e.stopPropagation(); onChange(""); setIsOpen(false); }}
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
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
      >
        <span>{value || `所有${label}`}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

// ============================================================
// HistoryProjectCard 子组件
// ============================================================

const HistoryProjectCard: React.FC<{
  session: ProjectSession;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onViewImage: (url: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}> = ({ session, isSelectionMode, isSelected, onToggleSelection, onOpen, onDelete, onViewImage, showToast, onShowConfirm }) => {
  const [thumbPage, setThumbPage] = useState(0);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const { isModuleDisabled } = useCommercial();

  const handleExport = async (type: 'zip' | 'pdf' | 'pptx') => {
    setIsExportMenuOpen(false);

    const performExport = async () => {
      try {
        showToast(`${type.toUpperCase()} 导出中...`, 'info');
        if (type === 'zip') {
          await exportToZip(session.items, session.title);
        } else if (type === 'pdf') {
          await exportToPdf(session.items, session.title);
        } else {
          await exportToPptx(session.items, session.title);
        }
        showToast("导出成功", 'success');
      } catch (error: any) {
        console.error("Export failed", error);
        showToast(error.message || "导出失败", 'error');
      }
    };

    if (type === 'pptx') {
      // [商业化] 关闭时跳过积分确认
      if (isModuleDisabled('points')) {
        await performExport();
        return;
      }

      try {
        const cost = await getActionCost('export_pptx');

        if (cost > 0) {
          const confirmAction = async () => {
            try {
              await consumeAction(
                'export_pptx',
                session.id,
                `导出项目: ${session.title}`,
                {
                  module: '我的项目',
                  category: '导出',
                  subcategory: '项目导出',
                  triggerTime: new Date().toISOString()
                }
              );
              await performExport();
            } catch (billingError: any) {
              console.error("Billing failed", billingError);
              showToast(billingError.message || "积分扣除失败，无法导出", "error");
            }
          };

          if (onShowConfirm) {
            onShowConfirm(`确认导出`, `导出 PPTX 需消耗 ${cost} 积分，是否继续？`, confirmAction);
            return;
          } else {
            if (!confirm(`导出 PPTX 需消耗 ${cost} 积分，是否继续？`)) return;
            await confirmAction();
            return;
          }
        }
      } catch (error: any) {
        console.error("Export billing error", error);
        showToast(error.message || "获取积分信息失败", "error");
        return;
      }
    }

    await performExport();
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col md:flex-row gap-8 transition-all hover:shadow-xl group relative ${isSelectionMode && isSelected
        ? "ring-2 ring-indigo-500 border-indigo-500"
        : "border-slate-100 hover:border-indigo-100"
        }`}
      onClick={() => {
        if (isSelectionMode)
          onToggleSelection(session.id);
      }}
    >
      {/* Project ID Badge */}
      <div className="absolute top-0 left-0 z-20">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/90 text-white rounded-tl-2xl rounded-br-xl shadow-sm border-r border-b border-white/10 backdrop-blur-md">
          <Settings2 size={8} className="text-slate-300" />
          <span className="text-[9px] font-bold tracking-wider uppercase">
            {session.displayId ? session.displayId : `PID-${session.id.substring(0, 8)}`}
          </span>
        </div>
      </div>

      {/* Cover Thumbnail */}
      <div
        className="w-full md:w-72 aspect-video bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 relative cursor-zoom-in group/thumb shadow-sm"
        onClick={(e) => {
          e.stopPropagation();
          if (session.thumbnailUrl)
            onViewImage(session.thumbnailUrl);
        }}
      >
        {session.thumbnailUrl ? (
          <img
            src={session.thumbnailUrl}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
            <ImageIcon size={40} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/50 text-white text-[10px] font-black backdrop-blur-sm pointer-events-none border border-white/10">
          {session.items.length}P
        </div>

        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center pointer-events-none opacity-0 group-hover/thumb:opacity-100">
          <div className="bg-white/90 p-2 rounded-full shadow-lg transform scale-90 group-hover/thumb:scale-100 transition-transform">
            <ZoomIn className="text-slate-800" size={20} />
          </div>
        </div>
      </div>

      {/* Content Info */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-black text-slate-800 text-xl mb-2 truncate group-hover:text-indigo-600 transition-colors">
              {session.title}
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <ProjectSourceBadge source={session.source || 'IDE'} />
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200/50 uppercase">
                {session.globalConfig?.styleName || "默认风格"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md border border-slate-200/50">
                {session.globalConfig?.aspectRatio || "16:9"}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md border border-indigo-100">
                规划 {session.globalConfig?.targetPageCount || 10} 页，完成 {session.items.filter(i => i.status === 'success').length} 页
              </span>
            </div>
          </div>

          {!isSelectionMode && (
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExportMenuOpen(!isExportMenuOpen);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${isExportMenuOpen
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-white text-slate-500 border-transparent hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  title="导出项目"
                >
                  <Download size={16} />
                  <span className="hidden xl:inline">导出</span>
                </button>

                {isExportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsExportMenuOpen(false);
                      }}
                    />
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport('zip'); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 transition-colors"
                      >
                        <ImageIcon size={14} className="text-blue-500" /> 导出图片 (ZIP)
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 border-t border-slate-100 transition-colors"
                      >
                        <FileDown size={14} className="text-rose-500" /> 导出 PDF
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExport('pptx'); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 border-t border-slate-100 transition-colors"
                      >
                        <Presentation size={14} className="text-orange-500" /> 导出 PPTX
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(session.id);
                }}
                className="group/btn relative flex items-center gap-2 text-xs font-black bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-200 transition-all active:scale-95 overflow-hidden"
              >
                <span className="relative z-10">查看详情</span>
                <ArrowRight size={14} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="删除项目"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Filmstrip View */}
        <div className="relative group/filmstrip my-2">
          <div className="flex gap-2.5 overflow-hidden py-3 px-1 border-y border-slate-50">
            {session.items.slice(thumbPage * 15, (thumbPage + 1) * 15).map((item, idx) => {
              const thumbnailUrl = (item.variants && item.variants.length > 0)
                ? item.variants[0]
                : item.previewUrl;

              return (
                <div
                  key={item.id}
                  className="relative w-16 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-sm group/item cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (thumbnailUrl) onViewImage(thumbnailUrl);
                  }}
                >
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform" alt={`page ${idx}`} />
                  ) : (
                    <div className="text-[8px] font-bold text-slate-300 uppercase">P{idx + 1}</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/10 transition-colors pointer-events-none"></div>

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
          </div>

          {session.items.length > 15 && (
            <>
              {thumbPage > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setThumbPage(p => p - 1); }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 shadow-md border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all z-20 opacity-0 group-hover/filmstrip:opacity-100"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              {(thumbPage + 1) * 15 < session.items.length && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setThumbPage(p => p + 1); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 shadow-md border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:scale-110 transition-all z-20 opacity-0 group-hover/filmstrip:opacity-100"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium text-slate-400 mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-300" />
            <span>创建于 <span className="text-slate-500">{new Date(session.createdAt).toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <span>完成于 <span className="text-slate-500">{new Date(session.completedAt || session.lastModified).toLocaleString()}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// HistoryPage 主组件
// ============================================================

export interface HistoryPageProps {
  // 筛选 state
  historySearchTerm: string;
  setHistorySearchTerm: (v: string) => void;
  historyFilterStyle: string;
  setHistoryFilterStyle: (v: string) => void;
  historyFilterRatio: string;
  setHistoryFilterRatio: (v: string) => void;
  historyFilterPalette: string;
  setHistoryFilterPalette: (v: string) => void;
  historyFilterPageType: 'target' | 'completed';
  setHistoryFilterPageType: (v: 'target' | 'completed') => void;
  historyFilterMinPages: string;
  setHistoryFilterMinPages: (v: string) => void;
  historyFilterMaxPages: string;
  setHistoryFilterMaxPages: (v: string) => void;
  historyFilterTimeType: 'lastModified' | 'createdAt' | 'priority';
  setHistoryFilterTimeType: (v: 'lastModified' | 'createdAt') => void;
  historyFilterStartDate: string;
  setHistoryFilterStartDate: (v: string) => void;
  historyFilterEndDate: string;
  setHistoryFilterEndDate: (v: string) => void;
  historyFilterTime: string;
  setHistoryFilterTime: (v: string) => void;
  historySortBy: 'lastModified' | 'createdAt' | 'pages';
  setHistorySortBy: (v: 'lastModified' | 'createdAt' | 'pages') => void;
  historySortOrder: 'asc' | 'desc';
  setHistorySortOrder: (v: 'asc' | 'desc') => void;
  // 选择模式
  isHistorySelectionMode: boolean;
  selectedHistoryIds: Set<string>;
  toggleHistorySelection: (id: string) => void;
  // 数据
  projects: any[];
  filteredHistory: ProjectSession[];
  // Handlers
  handleOpenProject: (id: string) => void;
  handleDeleteProject: (id: string) => void;
  handleResetAllFilters: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  setLightboxImage: (url: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historySearchTerm,
  setHistorySearchTerm,
  historyFilterStyle,
  setHistoryFilterStyle,
  historyFilterRatio,
  setHistoryFilterRatio,
  historyFilterPalette,
  setHistoryFilterPalette,
  historyFilterPageType,
  setHistoryFilterPageType,
  historyFilterMinPages,
  setHistoryFilterMinPages,
  historyFilterMaxPages,
  setHistoryFilterMaxPages,
  historyFilterTimeType,
  setHistoryFilterTimeType,
  historyFilterStartDate,
  setHistoryFilterStartDate,
  historyFilterEndDate,
  setHistoryFilterEndDate,
  historyFilterTime,
  setHistoryFilterTime,
  historySortBy,
  setHistorySortBy,
  historySortOrder,
  setHistorySortOrder,
  isHistorySelectionMode,
  selectedHistoryIds,
  toggleHistorySelection,
  projects,
  filteredHistory,
  handleOpenProject,
  handleDeleteProject,
  handleResetAllFilters,
  showToast,
  showConfirm,
  setLightboxImage,
}) => {
  return (
    <div className="flex flex-col space-y-6">
      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center w-full">
        {/* Search */}
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder="搜索项目标题或 ID..."
            value={historySearchTerm}
            onChange={(e) => setHistorySearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm font-medium"
          />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
          {/* Style Filter */}
          {(() => {
            const historyStyleTags = Array.from(new Set(projects.filter((p: any) => p.status === 'completed').map((p: any) => p.globalConfig?.styleName).filter(Boolean))) as string[];
            return (
              <CascadingFilter
                label="风格"
                value={historyFilterStyle}
                active={!!historyFilterStyle}
                systemOptions={STYLE_PRESETS}
                customOptions={historyStyleTags.filter(t => !STYLE_PRESETS.includes(t))}
                onChange={(val) => setHistoryFilterStyle(val)}
              />
            );
          })()}
          {/* Ratio Filter */}
          <div className="relative shrink-0">
            <select
              value={historyFilterRatio}
              onChange={(e) => setHistoryFilterRatio(e.target.value)}
              className={`appearance-none flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap outline-none pr-7 cursor-pointer ${historyFilterRatio
                ? 'bg-blue-50 text-blue-600 border-blue-200'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <option value="">所有比例</option>
              {RATIO_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          {/* Palette Filter */}
          {(() => {
            const historyPaletteTags = Array.from(new Set(projects.filter((p: any) => p.status === 'completed').map((p: any) => p.globalConfig?.colorPalette).filter(Boolean))) as string[];
            return (
              <CascadingFilter
                label="配色"
                value={historyFilterPalette}
                active={!!historyFilterPalette}
                systemOptions={COLOR_PRESETS}
                customOptions={historyPaletteTags.filter(t => !COLOR_PRESETS.includes(t))}
                onChange={(val) => setHistoryFilterPalette(val)}
              />
            );
          })()}
          {/* Page Scale Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1 transition-all focus-within:border-indigo-200 focus-within:ring-2 focus-within:ring-indigo-50">
            <select
              value={historyFilterPageType}
              onChange={(e) => setHistoryFilterPageType(e.target.value as any)}
              className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded py-0.5 px-1.5 outline-none shadow-sm cursor-pointer ml-1"
            >
              <option value="target">规划页数</option>
              <option value="completed">完成页数</option>
            </select>
            <div className="flex items-center gap-1 px-1">
              <input
                type="number"
                placeholder="最小"
                value={historyFilterMinPages}
                onChange={(e) => setHistoryFilterMinPages(e.target.value)}
                className="w-8 text-[10px] bg-transparent outline-none text-center font-medium placeholder:text-slate-300"
              />
              <span className="text-slate-300">-</span>
              <input
                type="number"
                placeholder="最大"
                value={historyFilterMaxPages}
                onChange={(e) => setHistoryFilterMaxPages(e.target.value)}
                className="w-8 text-[10px] bg-transparent outline-none text-center font-medium placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Time Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-md">
            <select
              value={historyFilterTimeType}
              onChange={(e) => setHistoryFilterTimeType(e.target.value as any)}
              className="text-[11px] font-bold text-indigo-600 bg-white border-none rounded py-1 px-2 outline-none shadow-sm cursor-pointer"
            >
              <option value="lastModified">完成时间</option>
              <option value="createdAt">创建时间</option>
            </select>

            <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

            <select
              value={historyFilterTime}
              onChange={(e) => setHistoryFilterTime(e.target.value)}
              className="text-[11px] bg-transparent border-none py-1 px-1 outline-none text-slate-600 cursor-pointer"
            >
              <option value="">快速范围</option>
              <option value="24h">24小时内</option>
              <option value="7d">7天内</option>
              <option value="30d">30天内</option>
            </select>

            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
              <input
                type="date"
                value={historyFilterStartDate}
                onChange={(e) => setHistoryFilterStartDate(e.target.value)}
                className="text-[9px] bg-transparent p-0 border-none outline-none text-slate-500"
                title="起始范围"
              />
              <span className="text-[9px] text-slate-300">-</span>
              <input
                type="date"
                value={historyFilterEndDate}
                onChange={(e) => setHistoryFilterEndDate(e.target.value)}
                className="text-[9px] bg-transparent p-0 border-none outline-none text-slate-500"
                title="结束范围"
              />
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 mx-1 hidden xl:block"></div>

          <button
            onClick={() => {
              setHistorySearchTerm("");
              setHistoryFilterStyle("");
              setHistoryFilterRatio("");
              setHistoryFilterPalette("");
              setHistoryFilterPageType("target");
              setHistoryFilterMinPages("");
              setHistoryFilterMaxPages("");
              setHistoryFilterTimeType("lastModified");
              setHistoryFilterStartDate("");
              setHistoryFilterEndDate("");
              setHistoryFilterTime("");
              setHistorySortBy("lastModified");
              setHistorySortOrder("desc");
            }}
            className="p-1.5 bg-slate-100 text-slate-500 rounded-md hover:bg-slate-200 hover:text-slate-700 transition-all"
            title="重置所有筛选"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-20 flex-1">
          <History size={48} className="mx-auto text-slate-200 mb-4" />
          <h3>暂无历史项目</h3>
        </div>
      ) : (
        <div className="space-y-4 pb-12 flex-1">
          {filteredHistory.map((session) => (
            <HistoryProjectCard
              key={session.id}
              session={session}
              isSelectionMode={isHistorySelectionMode}
              isSelected={selectedHistoryIds.has(session.id)}
              onToggleSelection={toggleHistorySelection}
              onOpen={handleOpenProject}
              onDelete={handleDeleteProject}
              onViewImage={setLightboxImage}
              showToast={showToast}
              onShowConfirm={showConfirm}
            />
          ))}
        </div>
      )}
      {/* Count Footer */}
      <div className="py-4 border-t border-slate-200 flex justify-between items-center px-6">
        <span className="text-xs text-slate-400">共筛选出 {filteredHistory.length} 个项目</span>
        <button
          onClick={handleResetAllFilters}
          className="text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-3 py-1 rounded-full transition-colors"
        >
          重置所有筛选
        </button>
      </div>
    </div>
  );
};
