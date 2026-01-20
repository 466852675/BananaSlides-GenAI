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
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { StyleConfig, StyleTemplate, GlobalStyleMap, PageType, StylePreset, AppSettings, StoredResource } from '../types';
import { ImageUploader } from './ImageUploader';
import { SharedStyleCard, SharedStyleItem } from './SharedStyleCard';
import { QuickTemplateModal } from './QuickTemplateModal';
import { Home, LayoutList, BookOpen, Flag, Type, Wand2, Edit3, Loader2 } from 'lucide-react';
import { smartRefine } from '../services/geminiService';
import { StyleTemplateEditor } from './StyleTemplateEditor';
import { useSaveTemplate, useUpdateTemplate, useDeleteTemplate } from '../api/templates';
import { useAddFavorite, useRemoveFavorite } from '../api/favorites';
import { Filter, ArrowUpNarrowWide, ArrowDownWideNarrow, ChevronDown, ChevronUp } from 'lucide-react';
import { STYLE_PRESETS, RATIO_PRESETS, COLOR_PRESETS } from '../constants';

// Helper to format Template ID
import { formatTemplateId } from '../utils/idFormatter';


const PAGE_TYPES: { type: PageType; label: string }[] = [
  { type: 'cover', label: '封面页' },
  { type: 'directory', label: '目录页' },
  { type: 'transition', label: '过渡页' },
  { type: 'content', label: '正文页' },
  { type: 'end', label: '结束页' },
];

// --- Copied Modal Component for Consistency ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "lightbox";
  maxWidth?: string;
  zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  variant = "default",
  maxWidth = "max-w-2xl",
  zIndex = "z-[100]",
}) => {
  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${zIndex}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const FilterTag: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
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

const ExpandableTagGroup: React.FC<{
  label: string;
  allTags: string[];
  presets: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}> = ({ label, allTags, presets, activeTags, onToggle, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Separate tags
  const presetTags = presets.filter(t => allTags.includes(t));
  const customTags = allTags.filter(t => !presets.includes(t));

  // Determine if expansion is needed (simple heuristic: > 1 line roughly or based on count)
  // Since we can't easily measure width in SSR/without refs, we'll use a count threshold for "potential overflow" logic,
  // OR we use the CSS max-height trick with a button that is always shown if count is high, or just allow user to expand.
  // User asked: "if not fit, show more". 
  // Let's use a CSS approach: container has logic. 
  // Actually, we can just check if total tags > threshold (e.g. 8).
  const hasManyTags = (presetTags.length + customTags.length) > 6;

  return (
    <div className={`flex items-start gap-4 px-4 transition-all duration-300 ${isExpanded ? 'h-auto py-2' : 'h-9 items-center'}`}>
      <div className="flex items-center gap-3 shrink-0 h-9">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight shrink-0 w-8 text-right">{label}</span>
      </div>

      <div className={`flex-1 flex flex-wrap items-center gap-1.5 ${!isExpanded ? 'h-9 overflow-hidden' : ''}`}>
        <FilterTag active={activeTags.length === 0} onClick={onClear}>全部</FilterTag>

        {/* Presets */}
        {presetTags.map(tag => (
          <FilterTag
            key={tag}
            active={activeTags.includes(tag)}
            onClick={() => onToggle(tag)}
          >{tag}</FilterTag>
        ))}

        {/* Separator and Custom Tags */}
        {customTags.length > 0 && (
          <>
            <div className="w-px h-3 bg-slate-200 mx-1 shrink-0" />
            {customTags.map(tag => (
              <FilterTag
                key={tag}
                active={activeTags.includes(tag)}
                onClick={() => onToggle(tag)}
              >{tag}</FilterTag>
            ))}
          </>
        )}
      </div>

      {hasManyTags && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="shrink-0 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
          title={isExpanded ? "收起" : "更多"}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
    </div>
  );
};

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

const generateTemplateId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `MB-${year}-${monthDay}-${random}`;
};

export const StyleTemplateManager: React.FC<StyleTemplateManagerProps> = ({
  // ... props ... (keep same)
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
  // ... (keep state)
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);

  // Confirmation State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void; // Added onCancel
    confirmLabel?: string;
    cancelLabel?: string; // Added cancelLabel
    variant?: 'danger' | 'primary';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const confirmAction = (title: string, message: string, action: () => Promise<void> | void, variant: 'danger' | 'primary' = 'primary') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await action();
        closeConfirm();
      },
      confirmLabel: '确定',
      variant
    });
  };

  // Debounced search logic
  React.useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  React.useEffect(() => {
    if (localSearchTerm !== searchTerm) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setSearchQuery(localSearchTerm);
        setIsSearching(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [localSearchTerm, searchTerm, setSearchQuery]);
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null);
  const [isOpeningInEditMode, setIsOpeningInEditMode] = useState(false);

  // API Hooks
  const saveTemplateMutation = useSaveTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  const deleteTemplateMutation = useDeleteTemplate();
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  // ... (keep helpers)

  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  };

  const handleToggleFavoriteInternal = (template: StyleTemplate) => {
    const existingFavorite = favorites.find(f => f.templateId === template.id);
    const isFavorited = !!existingFavorite;

    confirmAction(
      isFavorited ? '取消收藏' : '收藏模版',
      isFavorited ? `确定要取消收藏 "${template.name}" 吗？` : `确定要收藏 "${template.name}" 吗？`,
      async () => {
        try {
          if (isFavorited) {
            await removeFavoriteMutation.mutateAsync(existingFavorite.id);
            onShowToast('已取消收藏', 'info');
          } else {
            await addFavoriteMutation.mutateAsync({
              templateId: template.id,
              name: template.name,
              config: template.config,
              styleMap: template.styleMap,
              sampleImages: []
            });
            onShowToast('已添加到收藏', 'success');
          }

          if (template.id) {
            await updateTemplateMutation.mutateAsync({
              id: template.id,
              updates: {
                favoriteCount: Math.max(0, (template.favoriteCount || 0) + (isFavorited ? -1 : 1))
              }
            });
          }
        } catch (e) {
          onShowToast('操作失败', 'error');
        }
      },
      isFavorited ? 'danger' : 'primary'
    );
  };

  const handleRemoveFavoriteDirectly = (preset: StylePreset) => {
    confirmAction(
      '取消收藏',
      `确定要取消收藏 "${preset.name}" 吗？`,
      async () => {
        try {
          await removeFavoriteMutation.mutateAsync(preset.id);
          onShowToast('已取消收藏', 'info');

          if (preset.templateId) {
            const relatedTemplate = templates.find(t => t.id === preset.templateId);
            if (relatedTemplate) {
              await updateTemplateMutation.mutateAsync({
                id: preset.templateId,
                updates: {
                  favoriteCount: Math.max(0, (relatedTemplate.favoriteCount || 0) - 1)
                }
              });
            }
          }
        } catch (e) {
          onShowToast('操作失败', 'error');
        }
      },
      'danger'
    );
  };

  // Sync initial editing ID
  React.useEffect(() => {
    if (isOpen && initialEditingTemplateId) {
      const target = templates.find(t => t.id === initialEditingTemplateId)
        || favorites.find(f => f.id === initialEditingTemplateId);

      if (target) {
        const templateToEdit = { ...target, isCustom: true } as StyleTemplate;
        setEditingTemplate(templateToEdit);
        setView('creator');
        setIsOpeningInEditMode(true);
      }

      if (onClearEditingTemplateId) {
        onClearEditingTemplateId();
      }
    }
  }, [isOpen, initialEditingTemplateId, templates, favorites, onClearEditingTemplateId]);

  const handleToggleRecommend = (template: StyleTemplate) => {
    const isRecommended = !template.isRecommended;
    confirmAction(
      isRecommended ? '推荐模版' : '取消推荐',
      isRecommended ? `确定要将 "${template.name}" 设为推荐模版吗？` : `确定要取消 "${template.name}" 的推荐状态吗？`,
      async () => {
        try {
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
      },
      isRecommended ? 'primary' : 'danger'
    );
  };

  const handleApplyTemplateEnhanced = async (template: StyleTemplate) => {
    onApplyTemplate(template);
    try {
      await updateTemplateMutation.mutateAsync({
        id: template.id,
        updates: {
          usageCount: (template.usageCount || 0) + 1
        }
      });
    } catch (e) {
      console.error('更新使用次数失败:', e);
    }
    const isAlreadyFavorited = favorites.some(f => f.templateId === template.id);
    if (!isAlreadyFavorited && activeTab === 'market') {
      setTimeout(() => {
        if (window.confirm('模版应用成功！是否收藏此模版以便下次快速访问？')) {
          handleToggleFavoriteInternal(template);
        }
      }, 500);
    }
  };

  const handleApplyFavoriteEnhanced = async (preset: StylePreset) => {
    onApplyFavorite(preset);
    if (preset.templateId) {
      try {
        const relatedTemplate = templates.find(t => t.id === preset.templateId);
        if (relatedTemplate) {
          await updateTemplateMutation.mutateAsync({
            id: preset.templateId,
            updates: {
              usageCount: (relatedTemplate.usageCount || 0) + 1
            }
          });
        }
      } catch (e) {
        console.error('更新使用次数失败:', e);
      }
    }
  };

  // ... (keep filterList) ...
  const filterList = (list: StyleTemplate[]) => {
    return list
      .filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
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

  const styleTags = Array.from(new Set([...STYLE_TAGS, ...templates.map(t => t.config.styleName)])).filter(Boolean);
  const ratioTags = Array.from(new Set([...RATIO_TAGS, ...templates.map(t => t.config.aspectRatio)])).filter(Boolean);
  const paletteTags = Array.from(new Set([...PALETTE_TAGS, ...templates.map(t => t.config.colorPalette)])).filter(Boolean);

  const handleCreateNew = () => {
    const newTemplate: StyleTemplate = {
      id: generateTemplateId(),
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
    setIsOpeningInEditMode(true);
    setView('creator');
  };

  const handleQuickAnalyzeSuccess = (config: StyleConfig) => {
    const newTemplate: StyleTemplate = {
      id: generateTemplateId(),
      name: `${config.styleName}模版`,
      isCustom: true,
      createdAt: Date.now(),
      config: config
    };
    setEditingTemplate(newTemplate);
    setIsOpeningInEditMode(true);
    setView('creator');
  };

  const handleEditTemplate = (template: StyleTemplate, editMode: boolean = false) => {
    setEditingTemplate(template);
    // Force state update for isEditing prop
    setIsOpeningInEditMode(editMode);
    setView('creator');
  };

  const handleAIButtonClick = () => {
    const draft = localStorage.getItem('ai_template_draft');
    if (draft) {
      setConfirmDialog({
        isOpen: true,
        title: '恢复未保存的草稿',
        message: '检测到您上次有未保存的 AI 模版草稿，是否恢复继续编辑？',
        confirmLabel: '恢复草稿',
        cancelLabel: '开启新生成',
        onConfirm: () => {
          try {
            const template = JSON.parse(draft);
            setEditingTemplate(template);
            setIsOpeningInEditMode(true);
            setView('creator'); // NOTE: Changed from 'editor' to 'creator' to match other handlers if needed, but wait, 'editor' is not a view state?
            // Actually existing code uses 'creator' view (which shows StyleEditor).
            // Lines 582 and 595 use setView('creator').
            // Line 610 uses setView('creator').
            // So I should use setView('creator').

            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            onShowToast('已恢复上次的草稿', 'success');
          } catch (e) {
            console.error('Failed to parse draft', e);
            localStorage.removeItem('ai_template_draft');
            setIsQuickModalOpen(true);
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          }
        },
        onCancel: () => {
          localStorage.removeItem('ai_template_draft');
          setIsQuickModalOpen(true);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      setIsQuickModalOpen(true);
    }
  };

  // ... inside render ... 
  // (I will view the file first to locate handleEditTemplate definition scope)


  const handleDeleteTemplate = (id: string) => {
    confirmAction(
      '删除模板',
      '确定要删除这个模板吗？此操作不可恢复。',
      () => {
        deleteTemplateMutation.mutate(id, {
          onSuccess: () => onShowToast('模板已删除', 'success'),
          onError: () => onShowToast('删除失败', 'error')
        });
      },
      'danger'
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setLocalSearchTerm('');
    setStyleFilter([]);
    setRatioFilter([]);
    setPaletteFilter([]);
    setPageRangeFilter('all');
    setTimeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // 根据标签页预过滤模版列表
  const baseTemplates = activeTab === 'popular'
    ? templates.filter(t => t.isRecommended)
    : templates;
  const filteredTemplates = filterList(baseTemplates);

  return (
    <div className="w-full flex flex-col bg-slate-50">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="flex-1 w-full max-w-[1480px] mx-auto flex flex-col my-6 px-6 min-h-0">
        {/* Header & Filters Container - Now separated */}
        <div className="flex flex-col gap-4 mb-8 shrink-0">
          <div className="bg-white shadow-sm border border-slate-200/60 rounded-[24px] overflow-hidden z-10 flex flex-col">
            {/* Top Row: Title & Close - SIMPLIFIED FOR VIEW MODE */}
            <div className="px-8 py-5 flex justify-between items-start shrink-0">
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
                      {isOpeningInEditMode ? (
                        (templates.some(t => t.id === editingTemplate?.id) || favorites.some(f => f.templateId === editingTemplate?.id || f.id === editingTemplate?.id))
                          ? "编辑模板"
                          : "创建模板"
                      ) : "查看模板"}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {isOpeningInEditMode
                        ? (templates.some(t => t.id === editingTemplate?.id) ? "调整模板视觉与结构参数" : "定义完整的 PPT 生成视觉与结构参数")
                        : "预览模板详情与设计规范"}
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
                {view === 'gallery' && (
                  <>
                    <button
                      onClick={handleAIButtonClick}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-violet-500/20 active:scale-95 transition-all"
                    >
                      <Sparkles size={18} />
                      AI 一键生成
                    </button>
                    <button
                      onClick={handleCreateNew}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      <Plus size={18} strokeWidth={3} />
                      创建模板
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* --- Search & Enhanced Filters (Compact 3-Row Layout) --- */}
            {view === 'gallery' && (
              <div className="bg-white px-2 pt-2 pb-4 shadow-sm border border-slate-200/60 rounded-[24px] shrink-0 flex flex-col gap-3">

                {/* Row 1: Search + Time + Sort + Reset */}
                <div className="flex items-center gap-4 px-4 h-12">
                  {/* Search */}
                  <div className="relative group w-64 shrink-0">
                    <div className={`relative w-full bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-xl pl-9 pr-3 py-1.5 flex items-center transition-all duration-300 focus-within:bg-white focus-within:border-blue-200 focus-within:shadow-sm`}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="搜索模板名称或ID..."
                        className="w-full bg-transparent border-none text-xs focus:ring-0 transition-all outline-none font-bold text-slate-600 placeholder:text-slate-400 placeholder:font-medium"
                        value={localSearchTerm}
                        onChange={(e) => setLocalSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-100 shrink-0" />

                  {/* Time Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100/50">
                      <select
                        className="text-[10px] font-bold bg-white border-none rounded-md py-1 pl-2 pr-6 focus:ring-1 focus:ring-blue-100 shadow-sm outline-none cursor-pointer"
                        value={timeTypeFilter}
                        onChange={(e) => setTimeTypeFilter(e.target.value as any)}
                      >
                        <option value="lastModified">更新时间</option>
                        <option value="createdAt">创建时间</option>
                      </select>
                      <div className="flex items-center px-1">
                        <FilterTag active={timeFilter === ''} onClick={() => setTimeFilter('')}>全部</FilterTag>
                        <FilterTag active={timeFilter === '24h'} onClick={() => setTimeFilter('24h')}>24h</FilterTag>
                        <FilterTag active={timeFilter === '7d'} onClick={() => setTimeFilter('7d')}>7d</FilterTag>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                      <input
                        type="date"
                        className="text-[10px] bg-slate-50 border-none rounded-lg py-1 px-2 focus:ring-1 focus:ring-blue-100 font-bold text-slate-600 outline-none w-24"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                      />
                      <span className="text-slate-300">-</span>
                      <input
                        type="date"
                        className="text-[10px] bg-slate-50 border-none rounded-lg py-1 px-2 focus:ring-1 focus:ring-blue-100 font-bold text-slate-600 outline-none w-24"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex-1" />

                  {/* Right Actions: Sort & Reset */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                      <button
                        onClick={() => setSortBy('recommended')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${sortBy === 'recommended' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >综合</button>
                      <button
                        onClick={() => setSortBy('newest')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${sortBy === 'newest' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >最新</button>
                      <button
                        onClick={() => setSortBy('usage')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${sortBy === 'usage' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >热度</button>
                      <button
                        onClick={() => setSortBy('favorite')}
                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${sortBy === 'favorite' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >收藏</button>
                    </div>

                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all active:scale-90"
                    >
                      {sortOrder === 'asc' ? <ArrowUpNarrowWide size={14} strokeWidth={3} /> : <ArrowDownWideNarrow size={14} strokeWidth={3} />}
                    </button>

                    <div className="w-px h-4 bg-slate-100" />

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
                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all font-black group"
                    >
                      <RotateCcw size={12} className="group-active:rotate-180 transition-transform duration-500" />
                      <span className="text-[10px]">重置</span>
                    </button>

                    <div className="w-px h-4 bg-slate-100" />

                    <button
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className="flex items-center gap-1 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                      title={isFiltersExpanded ? "收起筛选" : "更多筛选"}
                    >
                      {isFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      <span className="text-[10px] font-bold">{isFiltersExpanded ? "收起" : "更多"}</span>
                    </button>
                  </div>
                </div>

                {/* Advanced Filters: Collapsible Section */}
                {isFiltersExpanded && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300 border-t border-slate-50 pt-2 flex flex-col gap-0">

                    {/* Row 2: Style */}
                    <ExpandableTagGroup
                      label="风格"
                      allTags={styleTags}
                      presets={STYLE_PRESETS}
                      activeTags={styleFilter}
                      onToggle={(tag) => setStyleFilter(styleFilter.includes(tag) ? styleFilter.filter(s => s !== tag) : [...styleFilter, tag])}
                      onClear={() => setStyleFilter([])}
                    />

                    {/* Row 3: Palette */}
                    <ExpandableTagGroup
                      label="配色"
                      allTags={paletteTags}
                      presets={COLOR_PRESETS}
                      activeTags={paletteFilter}
                      onToggle={(tag) => setPaletteFilter(paletteFilter.includes(tag) ? paletteFilter.filter(s => s !== tag) : [...paletteFilter, tag])}
                      onClear={() => setPaletteFilter([])}
                    />

                    {/* Row 4: Ratio + Pages */}
                    <div className="flex items-center gap-8 px-4 h-9">
                      {/* Ratio */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight shrink-0 w-8 text-right">比例</span>
                        <div className="flex items-center gap-1.5">
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

                      <div className="w-px h-4 bg-slate-100 shrink-0" />

                      {/* Pages */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight shrink-0 w-8 text-right">页数</span>
                        <div className="flex items-center gap-1.5">
                          <FilterTag active={pageRangeFilter === 'all'} onClick={() => setPageRangeFilter('all')}>全部</FilterTag>
                          <FilterTag active={pageRangeFilter === 'under5'} onClick={() => setPageRangeFilter('under5')}>精炼</FilterTag>
                          <FilterTag active={pageRangeFilter === '5-10'} onClick={() => setPageRangeFilter('5-10')}>中等</FilterTag>
                          <FilterTag active={pageRangeFilter === 'over10'} onClick={() => setPageRangeFilter('over10')}>详尽</FilterTag>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>


        {/* Content Area - Separated from Header */}
        <div className="flex-1 min-h-0">
          {view === 'gallery' ? (
            <div className="space-y-8">
              {activeTab === 'favorites' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {favorites.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 ring-4 ring-white">
                        <Heart size={32} className="text-slate-200" fill="currentColor" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-2">暂无收藏模版</h3>
                      <p className="text-slate-400 text-sm mb-8 text-center max-w-xs font-medium">
                        浏览集市寻找心仪设计，<br />建立属于你的专属素材库。
                      </p>
                      <button
                        onClick={() => setActiveTab('market')}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                      >
                        <LayoutTemplate size={18} />
                        去集市看看
                      </button>
                    </div>
                  ) : (
                    favorites.map((preset, index) => (
                      <div key={index} className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                        <div className="aspect-[16/10] bg-slate-50 relative overflow-hidden">
                          {(() => {
                            const previewUrl = preset.styleMap?.cover || preset.styleMap?.content || (preset.sampleImages && (preset as any).sampleImages[0]);
                            if (previewUrl) {
                              return <img src={previewUrl as string} alt={preset.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />;
                            }
                            return (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Monitor size={48} className="opacity-20 translate-y-2 group-hover:scale-110 transition-transform duration-700" />
                              </div>
                            );
                          })()}
                          <div className="absolute top-3 left-3 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">
                            My Favorite
                          </div>
                          <div className="absolute top-3 right-3 z-20">
                            <button
                              onClick={() => handleRemoveFavoriteDirectly(preset)}
                              className="p-2 bg-rose-500 text-white rounded-full shadow-lg transition-all scale-110"
                              title="取消收藏"
                            >
                              <Heart size={14} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="text-[10px] font-mono text-slate-400 mb-0.5 select-all">{formatTemplateId(preset.templateId || preset.id, preset.templateCreatedAt || preset.createdAt)}</div>
                          <h4 className="text-sm font-black text-slate-800 mb-1">{preset.name}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">{preset.config.aspectRatio}</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">{preset.config.styleName}</span>
                          </div>
                          <div className="mt-auto pt-2 border-t border-slate-50 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1"><Calendar size={10} className="shrink-0 opacity-50" /> 创建时间</span>
                              <span className="font-medium">{formatDateTime(preset.templateCreatedAt || preset.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span className="flex items-center gap-1"><Clock size={10} className="shrink-0 opacity-50" /> 更新时间</span>
                              <span className="font-medium">{formatDateTime(preset.templateUpdatedAt || preset.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-rose-500 bg-rose-50/50 p-1 rounded">
                              <span className="flex items-center gap-1 font-bold"><Heart size={10} className="shrink-0" /> 收藏时间</span>
                              <span className="font-bold">{formatDateTime(preset.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-blue-600/90 opacity-0 group-hover:opacity-100 transition-opacity p-6">
                          <button onClick={() => handleApplyFavoriteEnhanced(preset)} className="flex items-center justify-center gap-2 bg-white text-blue-600 px-5 py-2.5 rounded-xl text-sm font-black shadow-xl hover:scale-105 transition-transform active:scale-95 w-full">
                            <Sparkles size={16} /> 应用预设
                          </button>
                          <button onClick={() => {
                            // For favorites in this manager, we can simply open the editor in read-only mode
                            // We need to convert Preset to Template for the editor
                            const templateFromPreset: StyleTemplate = {
                              id: preset.templateId || preset.id,
                              name: preset.name,
                              config: preset.config,
                              styleMap: preset.styleMap,
                              isCustom: false, // Treat as read-only view
                              createdAt: preset.templateCreatedAt || preset.createdAt,
                              updatedAt: preset.templateUpdatedAt
                            };
                            handleEditTemplate(templateFromPreset, false);
                          }} className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all border border-white/20 w-full">
                            <Eye size={14} /> 查看详情
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {/* Headers removed as requested */}

                  {filteredTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                      <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 ring-4 ring-white">
                        <Search size={32} className="text-slate-200" />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800 mb-2">未找到匹配模板</h3>
                      <p className="text-slate-400 text-sm mb-8 text-center max-w-xs font-medium">
                        尝试调整关键词或重置筛选条件，<br />开启更广阔的设计可能。
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2.5 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                      >
                        <RotateCcw size={18} />
                        重置所有筛选
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                      {filteredTemplates.map((template) => (
                        <div key={template.id} className="group relative bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-[0_20px_50px_-12px_rgba(59,130,246,0.15)] hover:ring-2 hover:ring-blue-500/10 hover:-translate-y-3 transition-all duration-500 overflow-hidden">
                          <div className="aspect-[16/10] bg-slate-100 relative overflow-hidden group/img">
                            {(() => {
                              const previewUrl = template.styleMap?.cover || template.styleMap?.content || ((template as any).sampleImages && (template as any).sampleImages[0]);
                              if (previewUrl) {
                                return (
                                  <div className="w-full h-full relative">
                                    <div className="absolute inset-0 bg-slate-200 animate-pulse z-0" /> {/* Skeleton */}
                                    <img
                                      src={previewUrl as string}
                                      alt={template.name}
                                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 relative z-10 opacity-0 bg-white"
                                      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                  <LayoutTemplate size={48} className="opacity-20 translate-y-2 group-hover:scale-110 transition-transform duration-700" />
                                </div>
                              );
                            })()}
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
                            <div className="absolute top-3 right-3 flex gap-2 z-20">
                              <button
                                onClick={() => handleToggleRecommend(template)}
                                className={`p-2 rounded-full shadow-lg transition-all ${template.isRecommended
                                  ? 'bg-blue-500 text-white scale-110 ring-2 ring-blue-400 ring-offset-2 ring-offset-white/50'
                                  : 'bg-white text-slate-400 hover:text-blue-500 hover:bg-blue-50 hover:scale-105'
                                  }`}
                                title={template.isRecommended ? '取消推荐' : '热门推荐'}
                              >
                                <Star size={14} fill={template.isRecommended ? "currentColor" : "none"} strokeWidth={2.5} />
                              </button>
                              {activeTab === 'market' && (
                                <button
                                  onClick={() => handleToggleFavoriteInternal(template)}
                                  className={`p-2 rounded-full shadow-lg transition-all ${favorites.some(f => f.templateId === template.id)
                                    ? 'bg-rose-500 text-white scale-110 ring-2 ring-rose-400 ring-offset-2 ring-offset-white/50'
                                    : 'bg-white text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:scale-105'
                                    }`}
                                  title={favorites.some(f => f.templateId === template.id) ? "取消收藏" : "收藏模版"}
                                >
                                  <Heart size={14} fill={favorites.some(f => f.templateId === template.id) ? "currentColor" : "none"} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>

                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="text-[10px] font-mono text-slate-400 mb-1 select-all">{formatTemplateId(template.id, template.createdAt)}</div>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-sm font-black text-slate-800 line-clamp-1">{template.name || template.config.styleName}</h4>
                              {activeTab === 'market' && favorites.some(f => f.templateId === template.id) && (
                                <span className="bg-rose-50 text-rose-500 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0 ml-2">已收藏</span>
                              )}
                              {template.isRecommended && activeTab !== 'popular' && (
                                <span className="bg-blue-50 text-blue-500 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0 ml-2">已推荐</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold">{template.config.aspectRatio}</span>
                              <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded-md font-bold">{template.config.styleName}</span>
                            </div>



                            {/* 统计信息 - 仅集市显示 */}
                            {activeTab !== 'popular' && (
                              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-1.5" title="应用次数">
                                  <Layout size={12} className="text-slate-400" />
                                  <span className="text-xs font-black text-slate-600">{template.usageCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="推荐次数">
                                  <Star size={12} className="text-blue-400" />
                                  <span className="text-xs font-black text-slate-600">{template.recommendCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5" title="收藏次数">
                                  <Heart size={12} className="text-rose-400" />
                                  <span className="text-xs font-black text-slate-600">{template.favoriteCount || 0}</span>
                                </div>
                              </div>
                            )}

                            <div className="mt-auto space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Calendar size={10} className="shrink-0 opacity-50" /> 创建时间</span>
                                <span className="font-medium">{formatDateTime(template.createdAt)}</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span className="flex items-center gap-1"><Clock size={10} className="shrink-0 opacity-50" /> 更新时间</span>
                                <span className="font-medium">{formatDateTime(template.updatedAt || template.createdAt)}</span>
                              </div>
                              {(activeTab === 'popular' || (activeTab === 'market' && template.isRecommended)) && (
                                <div className="flex items-center justify-between text-[10px] text-blue-500 bg-blue-50/50 p-1 rounded">
                                  <span className="flex items-center gap-1 font-bold"><Sparkles size={10} className="shrink-0" /> 推荐时间</span>
                                  <span className="font-bold">{formatDateTime(template.recommendedAt || template.updatedAt || template.createdAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] z-10">
                            <button onClick={() => handleApplyTemplateEnhanced(template)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-xl hover:scale-105 hover:bg-blue-700 transition-all w-48 justify-center">
                              <Sparkles size={16} /> 应用此模版
                            </button>
                            <div className="flex gap-2 w-48">
                              <button
                                onClick={() => {
                                  // We only view details
                                  // But currently we don't have a "View Detail" state that is NOT edit mode in this component?
                                  // Actually App.tsx has one. 
                                  // In StyleTemplateManager, 'editingTemplate' triggers StyleEditor. 
                                  // We can use handleEditTemplate(template, false) if it supports readOnly?
                                  // The StyleEditor component has `initialEditMode`. 
                                  // Let's check handleEditTemplate.
                                  // It calls setEditingTemplate(template) and setIsOpeningInEditMode(isEdit).
                                  handleEditTemplate(template, false);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all border border-white/20"
                              >
                                <Eye size={14} /> 查看详情
                              </button>
                            </div>
                            {activeTab === 'market' && template.isCustom && (
                              <div className="flex gap-2 w-48">
                                <button
                                  onClick={() => handleEditTemplate(template, true)}
                                  className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all border border-white/20"
                                >
                                  <Edit3 size={14} /> 编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="flex-1 flex items-center justify-center gap-2 bg-rose-500/20 hover:bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all border border-rose-500/30"
                                >
                                  <Trash2 size={14} /> 删除
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
      {/* Global Confirmation Modal */}
      <Modal
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        title={confirmDialog.title}
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={() => {
                if (confirmDialog.onCancel) confirmDialog.onCancel();
                else closeConfirm();
              }}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors"
            >
              {confirmDialog.cancelLabel || '取消'}
            </button>
            <button
              onClick={confirmDialog.onConfirm}
              className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95 ${confirmDialog.variant === 'danger'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
            >
              {confirmDialog.confirmLabel || '确定'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${confirmDialog.variant === 'danger' ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'
            }`}>
            {confirmDialog.variant === 'danger' ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
          </div>
          <p className="text-slate-700 font-medium leading-relaxed">
            {confirmDialog.message}
          </p>
        </div>
      </Modal>
      <QuickTemplateModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onAnalyzeSuccess={handleQuickAnalyzeSuccess}
        onShowToast={onShowToast}
        appSettings={appSettings}
      />
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

  // Auto-Save Draft Logic
  React.useEffect(() => {
    if (isEditing && localTemplate) {
      const timer = setTimeout(() => {
        // Only save if it's an AI-generated template (usually has a specific ID pattern or name, but allowing all edits to be robust)
        // Storing strictly as 'ai_template_draft' implies we only support one draft at a time, which matches the spec.
        localStorage.setItem('ai_template_draft', JSON.stringify(localTemplate));
      }, 1000); // Debounce 1s

      return () => clearTimeout(timer);
    }
  }, [localTemplate, isEditing]);

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
      localStorage.removeItem('ai_template_draft'); // Clear draft on success
      setIsEditing(false);
      onShowToast('模板保存成功', 'success');
    } catch (err: any) {
      console.error('保存模板失败:', err);
      onShowToast(`保存失败: ${err.message || '未知错误'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // 计算当前结构总页数
  const currentStructureSum =
    (localTemplate.config.pageStructure?.cover || 0) +
    (localTemplate.config.pageStructure?.directory || 0) +
    (localTemplate.config.pageStructure?.transition || 0) +
    (localTemplate.config.pageStructure?.content || 0) +
    (localTemplate.config.pageStructure?.end || 0);

  const isOverLimit = currentStructureSum > localTemplate.config.targetPageCount;
  const isUnderLimit = currentStructureSum < localTemplate.config.targetPageCount;

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
    <div className="w-full max-w-5xl mx-auto flex flex-col space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StyleTemplateEditor
        template={localTemplate}
        onShowToast={onShowToast}
        isEditing={isEditing}
        onUpdateConfig={updateConfig}
        onUpdateStyleMap={updateStyleMap}
        onStructureChange={handleStructureChange}
        onSmartRefine={handleSmartRefine}
        isRefining={isRefining}
        setName={(name) => setLocalTemplate({ ...localTemplate, name })}
        appSettings={appSettings}
      />

      {/* Footer Actions - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-center items-center gap-4 z-[50] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {isEditing ? (
          <>
            <button
              onClick={() => initialEditMode ? onCancel() : setIsEditing(false)}
              className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold active:scale-95"
            >
              取消
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={!localTemplate.name || isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg shadow-lg shadow-indigo-200 transition-all font-bold active:scale-95 text-sm"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? '正在保存...' : '保存模板'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold active:scale-95"
            >
              关闭
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-lg shadow-slate-200 transition-all font-bold active:scale-95 text-sm"
            >
              <Edit3 size={16} />
              编辑模板
            </button>
          </>
        )}
      </div>


    </div>
  );
};
