import React, { useState } from 'react';
import {
  X,
  Plus,
  Heart,
  Trash2,
  Check,
  LayoutTemplate,
  Monitor,
  Palette,
  FileDigit,
  AlertCircle,
  Upload,
  Sparkles,
  Save,
  ArrowLeft,
  Search,
  RotateCcw,
  Star,
  Eye,
  Layout,
  Calendar
} from 'lucide-react';
import { StyleConfig, StyleTemplate, GlobalStyleMap, PageType, StylePreset, AppSettings, StoredResource } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from './StyleControls';
import { ImageUploader } from './ImageUploader';
import { SharedStyleCard, SharedStyleItem } from './SharedStyleCard';
import { Home, LayoutList, BookOpen, Flag, Type, Wand2, Edit3, Loader2 } from 'lucide-react';
import { smartRefine } from '../services/geminiService';
import { useSaveTemplate, useUpdateTemplate, useDeleteTemplate } from '../api/templates';
import { useAddFavorite, useRemoveFavorite } from '../api/favorites';
import { Filter, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react';

const PAGE_TYPES: { type: PageType; label: string }[] = [
  { type: 'cover', label: '封面页' },
  { type: 'directory', label: '目录页' },
  { type: 'transition', label: '过渡页' },
  { type: 'content', label: '正文页' },
  { type: 'end', label: '结束页' },
];

const FilterTag: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105 active:scale-95'
      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
  >
    {children}
  </button>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`text-sm font-black transition-all pb-2 border-b-2 ${active ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
  >
    {children}
  </button>
);

interface StyleTemplateManagerProps {
  isOpen: boolean;
  templates: StyleTemplate[];
  onApplyTemplate: (template: StyleTemplate) => void;
  onUpdateTemplates?: (templates: StyleTemplate[]) => void;
  onClose: () => void;
  activeTemplateId: string | null;
  favorites: StylePreset[];
  onApplyFavorite: (preset: StylePreset) => void;
  onDeleteFavorite?: (id: string) => void;
  onToggleFavorite?: (template: StyleTemplate) => void;
  appSettings: AppSettings;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialEditingTemplateId?: string | null;
  onClearEditingTemplateId?: () => void;
  // Lifted States
  searchTerm: string;
  setSearchQuery: (v: string) => void;
  activeTab: "market" | "popular" | "favorites";
  setActiveTab: (v: "market" | "popular" | "favorites") => void;
  styleFilter: string[];
  setStyleFilter: (v: string[]) => void;
  ratioFilter: string[];
  setRatioFilter: (v: string[]) => void;
  paletteFilter: string[];
  setPaletteFilter: (v: string[]) => void;
  pageRangeFilter: "all" | "under5" | "5-10" | "over10";
  setPageRangeFilter: (v: "all" | "under5" | "5-10" | "over10") => void;
  timeTypeFilter: "lastModified" | "createdAt" | "priority";
  setTimeTypeFilter: (v: "lastModified" | "createdAt" | "priority") => void;
  startDateFilter: string;
  setStartDateFilter: (v: string) => void;
  endDateFilter: string;
  setEndDateFilter: (v: string) => void;
  timeFilter: string;
  setTimeFilter: (v: string) => void;
  sortBy: "recommended" | "newest" | "usage" | "favorite";
  setSortBy: (v: "recommended" | "newest" | "usage" | "favorite") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (v: "asc" | "desc") => void;
}

export const STYLE_TAGS = STYLE_PRESETS;
export const RATIO_TAGS = RATIO_PRESETS;
export const PALETTE_TAGS = COLOR_PRESETS;

export const StyleTemplateManager: React.FC<StyleTemplateManagerProps> = ({
  isOpen,
  templates,
  onApplyTemplate,
  onUpdateTemplates,
  onClose,
  activeTemplateId,
  favorites,
  onApplyFavorite,
  onDeleteFavorite,
  onToggleFavorite,
  appSettings,
  onShowToast,
  initialEditingTemplateId,
  onClearEditingTemplateId,
  searchTerm,
  setSearchQuery,
  activeTab,
  setActiveTab,
  styleFilter,
  setStyleFilter,
  ratioFilter,
  setRatioFilter,
  paletteFilter,
  setPaletteFilter,
  pageRangeFilter,
  setPageRangeFilter,
  timeTypeFilter,
  setTimeTypeFilter,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  timeFilter,
  setTimeFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder
}) => {
  const [view, setView] = useState<'gallery' | 'creator'>('gallery');
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null);
  const [isOpeningInEditMode, setIsOpeningInEditMode] = useState(false);

  // API Hooks
  const saveTemplateMutation = useSaveTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  const handleToggleFavoriteInternal = (template: StyleTemplate) => {
    const existing = favorites.find(f => f.id === template.id);
    if (existing) {
      removeFavoriteMutation.mutate(template.id, {
        onSuccess: () => onShowToast('已取消收藏', 'info')
      });
    } else {
      addFavoriteMutation.mutate({
        name: template.name,
        config: template.config,
        styleMap: template.styleMap,
        sampleImages: []
      }, {
        onSuccess: () => onShowToast('已添加到收藏', 'success')
      });
    }
  };

  // Sync initial editing ID from props
  React.useEffect(() => {
    if (isOpen && initialEditingTemplateId) {
      const target = templates.find(t => t.id === initialEditingTemplateId)
        || favorites.find(f => f.id === initialEditingTemplateId);

      if (target) {
        // Ensure it's treated as a template for editing
        const templateToEdit = { ...target, isCustom: true } as StyleTemplate;
        setEditingTemplate(templateToEdit);
        setView('creator');
        setIsOpeningInEditMode(true);
      }

      // Clear the prop from parent to avoid re-triggering
      if (onClearEditingTemplateId) {
        onClearEditingTemplateId();
      }
    }
  }, [isOpen, initialEditingTemplateId, templates, favorites, onClearEditingTemplateId]);

  const handleToggleRecommend = async (template: StyleTemplate) => {
    try {
      const isRecommended = !template.isRecommended;
      await updateTemplateMutation.mutateAsync({
        id: template.id,
        updates: {
          isRecommended,
          recommendCount: (template.recommendCount || 0) + (isRecommended ? 1 : -1)
        }
      });
      onShowToast(isRecommended ? '已加入推荐' : '已取消推荐', 'success');
    } catch (e) {
      onShowToast('操作失败', 'error');
    }
  };

  if (!isOpen) return null;

  // Filtering Logic
  const filterList = (list: StyleTemplate[]) => {
    return list
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStyle = styleFilter.length === 0 || styleFilter.includes(t.config.styleName);
        const matchesRatio = ratioFilter.length === 0 || ratioFilter.includes(t.config.aspectRatio);
        const matchesPalette = paletteFilter.length === 0 || paletteFilter.includes(t.config.colorPalette);

        const matchesPageRange = pageRangeFilter === 'all' || (() => {
          const count = t.config.targetPageCount || 0;
          if (pageRangeFilter === 'under5') return count < 5;
          if (pageRangeFilter === '5-10') return count >= 5 && count <= 10;
          if (pageRangeFilter === 'over10') return count > 10;
          return true;
        })();

        // Time Filtering logic (Match History)
        const timestamp = timeTypeFilter === 'createdAt' ? t.createdAt : (t as any).lastModified || t.createdAt;

        const matchTimePreview = (() => {
          if (!timeFilter) return true;
          const now = Date.now();
          const diff = now - (timestamp || 0);
          const ONE_DAY = 24 * 60 * 60 * 1000;
          if (timeFilter === "24h") return diff <= ONE_DAY;
          if (timeFilter === "7d") return diff <= 7 * ONE_DAY;
          if (timeFilter === "30d") return diff <= 30 * ONE_DAY;
          return true;
        })();

        const matchDateRange = (() => {
          if (!startDateFilter && !endDateFilter) return true;
          const itemTime = timestamp || 0;
          if (startDateFilter && itemTime < new Date(startDateFilter).getTime()) return false;
          if (endDateFilter && itemTime > new Date(endDateFilter).getTime() + 86399999) return false;
          return true;
        })();

        return matchesSearch && matchesStyle && matchesRatio && matchesPalette && matchesPageRange && matchTimePreview && matchDateRange;
      })
      .sort((a, b) => {
        let result = 0;
        if (sortBy === 'newest') result = b.createdAt - a.createdAt;
        else if (sortBy === 'usage') result = (b.usageCount || 0) - (a.usageCount || 0);
        else if (sortBy === 'favorite') result = (b.favoriteCount || 0) - (a.favoriteCount || 0);
        else if (sortBy === 'recommended') {
          if (a.isOfficial && !b.isOfficial) result = -1;
          else if (!a.isOfficial && b.isOfficial) result = 1;
          else result = (b.usageCount || 0) - (a.usageCount || 0);
        }
        return sortOrder === 'desc' ? result : -result;
      });
  };

  // 确保标签始终有默认预设，并合并已有模版的特定标签
  const styleTags = Array.from(new Set([...STYLE_TAGS, ...templates.map(t => t.config.styleName)])).filter(Boolean);
  const ratioTags = Array.from(new Set([...RATIO_TAGS, ...templates.map(t => t.config.aspectRatio)])).filter(Boolean);
  const paletteTags = Array.from(new Set([...PALETTE_TAGS, ...templates.map(t => t.config.colorPalette)])).filter(Boolean);

  const handleCreateNew = () => {
    // ... existing create logic (omitted for brevity, keep existing implementation in mind if not replacing fully)
    const newTemplate: StyleTemplate = {
      id: `style_${Date.now()}`,
      name: '',
      isCustom: true,
      createdAt: Date.now(),
      config: {
        styleName: '极简科技',
        colorPalette: '经典蓝白',
        requirements: '',
        aspectRatio: '16:9',
        targetPageCount: 10,
        defaultVariantCount: 1,
        pageStructure: {
          cover: 1,
          directory: 1,
          transition: 2,
          content: 5,
          end: 1
        }
      }
    };
    setEditingTemplate(newTemplate);
    setView('creator');
  };

  const handleEditTemplate = (template: StyleTemplate, editMode: boolean = false) => {
    setEditingTemplate(template);
    // Force state update for isEditing prop
    // We might need a ref or separate state for initialEditMode if it's derived from ID in render
    // But since we pass it as a prop key or initial value, changing view might not confirm it if component recycles?
    // Actually StyleEditor is unmounted when view changes? Yes.
    // Wait, "initialEditMode" is only used on mount.
    // I need to ensure the logic in render considers this overrides.
    // Let's store a temporary state "forceEditMode" or just rely on ID?
    // The previous logic was: `initialEditMode={!templates.some(t => t.id === editingTemplate.id)}`
    // I should change that to use a state `isOpeningInEditMode`.
    setIsOpeningInEditMode(editMode);
    setView('creator');
  };

  // ... inside render ... 
  // (I will view the file first to locate handleEditTemplate definition scope)


  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteTemplateMutation.mutate(id, {
        onSuccess: () => onShowToast('模板已删除', 'success'),
        onError: () => onShowToast('删除失败', 'error')
      });
    }
  };

  const filteredTemplates = filterList(templates);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col bg-white shadow-sm border border-slate-200/60 my-6 rounded-[24px] overflow-hidden">
        {/* Header */}
        <div className="bg-white sticky top-0 z-10 flex flex-col">
          {/* Top Row: Title & Close - SIMPLIFIED FOR VIEW MODE */}
          <div className="px-8 py-5 flex justify-between items-start border-b border-slate-100">
            <div className="flex items-center gap-3 flex-1">
              {view === 'creator' && (
                <button
                  onClick={() => setView('gallery')}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors mr-1"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {view === 'creator' ? (
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    创建模板
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    定义完整的 PPT 生成视觉与结构参数
                  </p>
                </div>
              ) : (
                /* Gallery View: Tabs as Title */
                <div className="flex flex-col gap-1 items-start">
                  <div className="bg-slate-100/50 p-1 rounded-xl flex items-center gap-1">
                    <button
                      onClick={() => setActiveTab('market')}
                      className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'market'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      集市模版
                    </button>
                    <button
                      onClick={() => setActiveTab('popular')}
                      className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'popular'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      热门推荐
                    </button>
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'favorites'
                        ? 'bg-white text-rose-500 shadow-lg'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      我的收藏
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                <Plus size={18} strokeWidth={3} />
                创建模板
              </button>
            </div>
          </div>

          {/* --- Search & Enhanced Filters (Multi-row) --- */}
          {view === 'gallery' && (
            <div className="bg-white border-b border-slate-100 p-6 flex flex-col gap-5 px-8">
              {/* Header Row: Dedicated Search Bar */}
              <div className="w-full">
                <div className="relative group w-full md:w-96">
                  <div className={`relative w-full bg-slate-100/40 border border-slate-100/50 rounded-2xl pl-11 pr-4 flex items-center group-focus-within:bg-white group-focus-within:border-blue-200 group-focus-within:shadow-lg group-focus-within:shadow-blue-500/5 transition-all duration-300`}>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="搜索模板名称..."
                      className="w-full bg-transparent border-none py-2.5 text-sm focus:ring-0 transition-all outline-none font-medium"
                      value={searchTerm}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Filter Section: Stacked Rows for perfect alignment */}
              <div className="flex flex-col gap-4">
                {/* Style Row */}
                <div className="flex items-start gap-4">
                  <span className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-tight py-2 shrink-0">风格</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                    <FilterTag active={styleFilter.length === 0} onClick={() => setStyleFilter([])}>全部</FilterTag>
                    {styleTags.map(tag => (
                      <FilterTag
                        key={tag}
                        active={styleFilter.includes(tag)}
                        onClick={() => setStyleFilter(styleFilter.includes(tag) ? styleFilter.filter(s => s !== tag) : [...styleFilter, tag])}
                      >{tag}</FilterTag>
                    ))}
                  </div>
                </div>

                {/* Ratio Row */}
                <div className="flex items-start gap-4">
                  <span className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-tight py-2 shrink-0">比例</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                    <FilterTag active={ratioFilter.length === 0} onClick={() => setRatioFilter([])}>全部</FilterTag>
                    {ratioTags.map(tag => (
                      <FilterTag
                        key={tag}
                        active={ratioFilter.includes(tag)}
                        onClick={() => setRatioFilter(ratioFilter.includes(tag) ? ratioFilter.filter(s => s !== tag) : [...ratioFilter, tag])}
                      >{tag}</FilterTag>
                    ))}
                  </div>
                </div>

                {/* Palette Row */}
                <div className="flex items-start gap-4">
                  <span className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-tight py-2 shrink-0">配色</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                    <FilterTag active={paletteFilter.length === 0} onClick={() => setPaletteFilter([])}>全部</FilterTag>
                    {paletteTags.map(tag => (
                      <FilterTag
                        key={tag}
                        active={paletteFilter.includes(tag)}
                        onClick={() => setPaletteFilter(paletteFilter.includes(tag) ? paletteFilter.filter(s => s !== tag) : [...paletteFilter, tag])}
                      >{tag}</FilterTag>
                    ))}
                  </div>
                </div>

                {/* Page Range Row - Moved here for consistent spacing */}
                <div className="flex items-start gap-4">
                  <span className="w-12 text-[10px] font-black text-slate-400 uppercase tracking-tight py-2 shrink-0">页数</span>
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                    <FilterTag active={pageRangeFilter === 'all'} onClick={() => setPageRangeFilter('all')}>全部</FilterTag>
                    <FilterTag active={pageRangeFilter === 'under5'} onClick={() => setPageRangeFilter('under5')}>精炼</FilterTag>
                    <FilterTag active={pageRangeFilter === '5-10'} onClick={() => setPageRangeFilter('5-10')}>中等</FilterTag>
                    <FilterTag active={pageRangeFilter === 'over10'} onClick={() => setPageRangeFilter('over10')}>详尽</FilterTag>
                  </div>
                </div>
              </div>

              {/* Action Row: Time, Sorting, Reset - Cleanly separated */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-5 border-t border-slate-50 mt-1">

                <div className="w-px h-6 bg-slate-100 hidden sm:block" />

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100/50 shrink-0">
                    <select
                      className="text-[11px] font-bold bg-white border-none rounded-lg py-1 pl-2 pr-7 focus:ring-1 focus:ring-blue-100 shadow-sm"
                      value={timeTypeFilter}
                      onChange={(e) => setTimeTypeFilter(e.target.value as any)}
                    >
                      <option value="lastModified">更新时间</option>
                      <option value="createdAt">创建时间</option>
                      <option value="priority">推荐权值</option>
                    </select>
                    <div className="flex items-center gap-1 px-1">
                      <FilterTag active={timeFilter === ''} onClick={() => setTimeFilter('')}>全部</FilterTag>
                      <FilterTag active={timeFilter === '24h'} onClick={() => setTimeFilter('24h')}>24h</FilterTag>
                      <FilterTag active={timeFilter === '7d'} onClick={() => setTimeFilter('7d')}>7d</FilterTag>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-1">
                    <input
                      type="date"
                      className="text-[10px] bg-slate-50 border-none rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-blue-100 font-bold text-slate-600"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                    />
                    <span className="text-slate-300">-</span>
                    <input
                      type="date"
                      className="text-[10px] bg-slate-50 border-none rounded-lg py-1.5 px-2 focus:ring-1 focus:ring-blue-100 font-bold text-slate-600"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl">
                    <button
                      onClick={() => setSortBy('recommended')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${sortBy === 'recommended' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >综合</button>
                    <button
                      onClick={() => setSortBy('usage')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${sortBy === 'usage' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >热度</button>
                  </div>

                  <button
                    onClick={() => {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all active:scale-90"
                    title={sortOrder === 'asc' ? '正序' : '倒序'}
                  >
                    {sortOrder === 'asc' ? <ArrowUpNarrowWide size={16} strokeWidth={3} /> : <ArrowDownWideNarrow size={16} strokeWidth={3} />}
                  </button>

                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStyleFilter([]);
                      setRatioFilter([]);
                      setPaletteFilter([]);
                      setPageRangeFilter("all");
                      setTimeFilter("");
                      setStartDateFilter("");
                      setEndDateFilter("");
                      setSortBy("recommended");
                      setSortOrder("desc");
                    }}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-500 transition-all font-black group"
                  >
                    <RotateCcw size={14} className="group-active:rotate-180 transition-transform duration-500" />
                    <span className="text-[10px] uppercase tracking-widest">重置</span>
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {view === 'gallery' ? (
              <div className="space-y-8">
                {activeTab === 'favorites' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                        <Heart size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-medium">暂无收藏的预设</p>
                        <button onClick={() => setActiveTab('market')} className="text-blue-500 font-bold mt-2 text-sm hover:underline">去集市看看</button>
                      </div>
                    ) : (
                      favorites.map((preset, index) => (
                        <div key={index} className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                          <div className="aspect-[16/10] bg-slate-50 relative overflow-hidden">
                            {preset.sampleImages && preset.sampleImages.length > 0 ? (
                              <img src={preset.sampleImages[0]} alt={preset.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Monitor size={48} className="opacity-20" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">
                              My Favorite
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-black text-slate-800 mb-1">{preset.name}</h4>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md">{preset.config.aspectRatio}</span>
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md">{preset.config.styleName}</span>
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onApplyFavorite(preset)} className="flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl text-sm font-black shadow-xl hover:scale-105 transition-transform active:scale-95">
                              <Sparkles size={16} /> 应用预设
                            </button>
                            {onDeleteFavorite && (
                              <button onClick={() => onDeleteFavorite(preset.id)} className="p-2.5 bg-white/20 hover:bg-rose-500 text-white rounded-xl transition-colors">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTemplates.map((template) => (
                        <div key={template.id} className="group relative bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                          <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <LayoutTemplate size={48} className="opacity-20 translate-y-2 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              {template.isOfficial && (
                                <div className="bg-amber-400 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg flex items-center gap-1">
                                  <Check size={10} strokeWidth={4} /> OFFICIAL
                                </div>
                              )}
                              {template.isRecommended && (
                                <div className="bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg flex items-center gap-1 animate-pulse">
                                  <Star size={10} fill="currentColor" /> HOT
                                </div>
                              )}
                            </div>
                            <div className="absolute top-3 right-3 flex gap-2">
                              <button
                                onClick={() => handleToggleRecommend(template)}
                                className={`p-2 rounded-full shadow-lg transition-all ${template.isRecommended ? 'bg-blue-500 text-white scale-110' : 'bg-white/80 text-slate-400 hover:text-blue-500'}`}
                                title={template.isRecommended ? '取消推荐' : '热门推荐'}
                              >
                                <Star size={14} fill={template.isRecommended ? "currentColor" : "none"} />
                              </button>
                              <button
                                onClick={() => onToggleFavorite?.(template)}
                                className="p-2 bg-white/80 text-slate-400 hover:text-rose-500 rounded-full shadow-lg transition-all"
                                title="收藏模版"
                              >
                                <Heart size={14} />
                              </button>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-4 text-white">
                                <div className="flex items-center gap-1.5"><Layout size={12} className="opacity-70" /><span className="text-xs font-black">{template.usageCount || 0}</span></div>
                                <div className="flex items-center gap-1.5"><Star size={12} className="opacity-70" /><span className="text-xs font-black">{template.recommendCount || 0}</span></div>
                                <div className="flex items-center gap-1.5"><Heart size={12} className="opacity-70" /><span className="text-xs font-black">{template.favoriteCount || 0}</span></div>
                              </div>
                              <span className="text-[10px] text-white/60 font-medium">{new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h4 className="text-sm font-black text-slate-800 mb-2">{template.name || template.config.styleName}</h4>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold">{template.config.aspectRatio}</span>
                              <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-bold">{template.config.styleName}</span>
                              <span className="bg-rose-50 text-rose-500 text-[10px] px-2 py-0.5 rounded-md font-bold">{template.config.colorPalette}</span>
                              <span className="ml-auto text-slate-400 text-[10px] font-bold">{template.config.targetPageCount}P</span>
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                            <button onClick={() => onApplyTemplate(template)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-xl hover:scale-105 hover:bg-blue-700 transition-all">
                              <Sparkles size={16} /> 应用此模版
                            </button>
                          </div>
                        </div>
                      ))}
                      {filteredTemplates.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Sparkles size={48} className="mb-4 opacity-20" />
                          <p className="text-sm font-medium">暂无匹配的模版</p>
                          {activeTab === 'market' && (
                            <button onClick={handleCreateNew} className="mt-6 flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                              <Plus size={16} /> 创建首个模版
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : (
              editingTemplate && (
                <StyleEditor
                  template={editingTemplate}
                  onSave={(updated) => {
                    if (updated.id && templates.some(t => t.id === updated.id)) {
                      updateTemplateMutation.mutate({ id: updated.id, updates: updated }, {
                        onSuccess: () => {
                          onShowToast('模板更新成功', 'success');
                          setView('gallery');
                        },
                        onError: () => onShowToast('更新失败', 'error')
                      });
                    } else {
                      saveTemplateMutation.mutate(updated, {
                        onSuccess: () => {
                          onShowToast('模板保存成功', 'success');
                          setView('gallery');
                        },
                        onError: () => onShowToast('保存失败', 'error')
                      });
                    }
                  }}
                  onCancel={() => setView('gallery')}
                  initialEditMode={isOpeningInEditMode || !templates.some(t => t.id === editingTemplate.id)}
                  appSettings={appSettings}
                  onShowToast={onShowToast}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



const StyleEditor: React.FC<{
  template: StyleTemplate;
  onSave: (template: StyleTemplate) => void;
  onCancel: () => void;
  initialEditMode?: boolean;
  appSettings: AppSettings;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}> = ({ template, onSave, onCancel, initialEditMode = false, appSettings, onShowToast }) => {
  const [localTemplate, setLocalTemplate] = useState<StyleTemplate>(template);
  const [customColor, setCustomColor] = useState<string>('');
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 上传单个图片到服务器
  const uploadStyleImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`图片上传失败: ${errText}`);
    }
    const { url } = await res.json();
    return url;
  };

  // 序列化 styleMap，将 File 对象转为服务器 URL
  const serializeStyleMap = async (styleMap: GlobalStyleMap | undefined): Promise<GlobalStyleMap> => {
    const result: GlobalStyleMap = { cover: null, directory: null, transition: null, content: null, end: null, custom: null };
    if (!styleMap) return result;

    for (const [type, value] of Object.entries(styleMap)) {
      if (value instanceof File) {
        try {
          result[type as PageType] = await uploadStyleImage(value);
        } catch (err) {
          console.error(`上传 ${type} 图片失败:`, err);
          throw err;
        }
      } else {
        result[type as PageType] = value;
      }
    }
    return result;
  };

  // 异步保存处理
  const handleSaveTemplate = async () => {
    if (!localTemplate.name) return;

    setIsSaving(true);
    onShowToast('正在上传图片并保存模板...', 'info');

    try {
      const serializedMap = await serializeStyleMap(localTemplate.styleMap);
      const savedTemplate: StyleTemplate = {
        ...localTemplate,
        styleMap: serializedMap
      };
      onSave(savedTemplate);
      setIsEditing(false);
      onShowToast('模板保存成功', 'success');
    } catch (err: any) {
      console.error('保存模板失败:', err);
      onShowToast(`保存失败: ${err.message || '未知错误'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const updateConfig = (key: keyof StyleConfig, value: any) => {
    setLocalTemplate(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const handleStructureChange = (key: keyof StyleConfig['pageStructure'], value: number) => {
    setLocalTemplate(prev => ({
      ...prev,
      config: {
        ...prev.config,
        pageStructure: { ...prev.config.pageStructure, [key]: value }
      }
    }));
  };

  const updateStyleMap = (type: PageType, file: StoredResource | null) => {
    setLocalTemplate(prev => ({
      ...prev,
      styleMap: {
        ...(prev.styleMap || { cover: null, directory: null, transition: null, content: null, end: null, custom: null }),
        [type]: file
      }
    }));
  };

  const handleSmartRefine = async () => {
    if (!localTemplate.config.requirements) return;

    setIsRefining(true);
    onShowToast('正在调用 AI 服务优化提示词...', 'info');
    try {
      // Pass appSettings to enable correct API configuration for AI
      const refined = await smartRefine(localTemplate.config.requirements, 'requirement');
      updateConfig('requirements', refined);
      onShowToast('AI 润色已完成，内容已更新', 'success');
    } catch (error: any) {
      console.error(error);
      onShowToast(`AI 修饰失败: ${error.message || '未知错误'}`, 'error');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Visual & Style Config */}
        <div className="space-y-8">
          {/* Template Info */}
          <section className="space-y-4">
            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} /> 基础信息
            </h5>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block px-1">模板名称</label>
              <input
                type="text"
                placeholder="例如：科技蓝商务演示..."
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                value={localTemplate.name}
                disabled={!isEditing}
                onChange={(e) => setLocalTemplate({ ...localTemplate, name: e.target.value })}
              />
            </div>
          </section>

          {/* Style Reference Uploads - NEW */}
          <section className="space-y-4">
            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Monitor size={16} /> 视觉参考 (Style References)
            </h5>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-700 flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5 shrink-0" />
              <p>为不同页面类型上传参考图，AI 将精准复刻设计风格。未上传的类型将自动使用“正文页”风格。</p>
            </div>
            <div className={`grid grid-cols-3 gap-3 ${!isEditing ? 'opacity-80 pointer-events-none' : ''}`}>
              {PAGE_TYPES.map(pt => (
                <div key={pt.type} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">
                    {pt.type === 'cover' ? <Home size={10} /> :
                      pt.type === 'directory' ? <LayoutList size={10} /> :
                        pt.type === 'transition' ? <BookOpen size={10} /> :
                          pt.type === 'end' ? <Flag size={10} /> : <FileDigit size={10} />}
                    {pt.label}
                  </div>
                  <div className="h-24">
                    <ImageUploader
                      variant="style-ref"
                      files={localTemplate.styleMap?.[pt.type] ? [localTemplate.styleMap[pt.type] as any] : []}
                      onFilesSelected={(files) => updateStyleMap(pt.type, files[0])}
                      onRemoveFile={() => updateStyleMap(pt.type, null)}
                      label="上传"
                      subLabel=""
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Style Params */}
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block px-1">风格描述</label>
              <div className={`flex flex-wrap gap-2 mb-2 ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                {STYLE_PRESETS.map(s => (
                  <button
                    key={s}
                    onClick={() => updateConfig('styleName', s)}
                    className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${localTemplate.config.styleName === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="输入自定义风格描述..."
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                value={localTemplate.config.styleName}
                disabled={!isEditing}
                onChange={(e) => updateConfig('styleName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block px-1">画面比例</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                  value={localTemplate.config.aspectRatio}
                  disabled={!isEditing}
                  onChange={(e) => updateConfig('aspectRatio', e.target.value)}
                >
                  {RATIO_PRESETS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 block px-1">配色方案</label>
                <div className="space-y-2">
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                    value={COLOR_PRESETS.includes(localTemplate.config.colorPalette) ? localTemplate.config.colorPalette : '自定义'}
                    disabled={!isEditing}
                    onChange={(e) => {
                      if (e.target.value !== '自定义') {
                        updateConfig('colorPalette', e.target.value);
                        setCustomColor('');
                      } else {
                        updateConfig('colorPalette', '自定义');
                      }
                    }}
                  >
                    {COLOR_PRESETS.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="自定义">自定义...</option>
                  </select>
                  {(!COLOR_PRESETS.includes(localTemplate.config.colorPalette) || localTemplate.config.colorPalette === '自定义') && (
                    <div className={`flex gap-2 animate-in fade-in slide-in-from-top-1 ${!isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
                      <Palette className="text-slate-400 mt-2" size={16} />
                      <input
                        type="text"
                        placeholder="例如: #FF5733 或 莫兰迪粉..."
                        className="w-full px-4 py-2 bg-slate-50 border-b-2 border-slate-200 focus:border-blue-500 outline-none text-sm"
                        value={COLOR_PRESETS.includes(localTemplate.config.colorPalette) ? customColor : localTemplate.config.colorPalette}
                        onChange={(e) => {
                          setCustomColor(e.target.value);
                          updateConfig('colorPalette', e.target.value);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Structure Config */}
        <div className="space-y-4 h-full flex flex-col">
          <section className="space-y-3">
            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileDigit size={16} /> 结构规划
            </h5>

            <div className={`bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100 ${!isEditing ? 'opacity-80 pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-600">默认生成总页数</span>
                <input
                  type="number"
                  className="w-14 text-center bg-white py-1.5 rounded-lg text-sm font-black text-blue-600 shadow-sm outline-none"
                  value={localTemplate.config.targetPageCount}
                  onChange={(e) => updateConfig('targetPageCount', parseInt(e.target.value) || 10)}
                />
              </div>

              <div className="space-y-2">
                <StructureItem label="章节过渡" value={localTemplate.config.pageStructure.transition} onChange={(v) => handleStructureChange('transition', v)} />
                <StructureItem label="内容正文" value={localTemplate.config.pageStructure.content} onChange={(v) => handleStructureChange('content', v)} />
                <div className="flex justify-between items-center p-2 bg-white/50 border border-slate-200/50 rounded-xl opacity-60">
                  <span className="text-[10px] font-bold text-slate-400 italic">封面、目录、结束页 (默认为 1P)</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2 flex-1 flex flex-col">
            <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <LayoutTemplate size={16} /> AI 视觉指令预设 (Style Prompt)
            </h5>
            <div className="relative group flex-1">
              <textarea
                placeholder="在此预设该风格的特定提示词或排版要求..."
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none h-[420px] custom-scrollbar disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                value={localTemplate.config.requirements}
                disabled={!isEditing}
                onChange={(e) => updateConfig('requirements', e.target.value)}
              />
              {isEditing && (
                <button
                  onClick={handleSmartRefine}
                  disabled={isRefining || !localTemplate.config.requirements}
                  className="absolute bottom-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-xl text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm border border-blue-100 group-hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI 智能润色"
                >
                  {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                </button>
              )}
            </div>
          </section>

          <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50">
            <div className="flex gap-4">
              <div className="shrink-0 p-3 bg-white rounded-2xl shadow-sm h-fit">
                <AlertCircle className="text-blue-500" size={20} />
              </div>
              <div>
                <h6 className="text-sm font-bold text-blue-900 mb-1">模板提示</h6>
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  完善的视觉参考图和结构规划能让 AI 更好地理解您的设计意图。保存后，您可以在创建新项目时一键应用此模板。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-8 border-t border-slate-100 flex justify-end gap-4">
        {isEditing ? (
          <>
            <button
              onClick={() => initialEditMode ? onCancel() : setIsEditing(false)}
              className="px-8 py-3 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              取消
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={!localTemplate.name || isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white px-10 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 enabled:active:scale-95"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? '保存中...' : '保存模板'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancel}
              className="px-8 py-3 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              关闭
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-10 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-slate-900/20 active:scale-95"
            >
              <Edit3 size={18} />
              编辑模板
            </button>
          </>
        )}
      </div>
    </div>
  );

};

const StructureItem: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm">
    <span className="text-sm font-bold text-slate-700">{label}</span>
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
      >
        <Plus size={14} className="rotate-45" />
      </button>
      <span className="text-sm font-black text-slate-800 w-4 text-center">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
      >
        <Plus size={14} />
      </button>
      <span className="text-xs font-bold text-slate-300">P</span>
    </div>
  </div>
);
