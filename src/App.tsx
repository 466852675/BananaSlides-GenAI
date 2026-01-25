import React, { useState, useRef, useEffect, useCallback, ClipboardEvent } from "react";
import { PointsBadge } from './components/PointsBadge';
import { createPortal } from 'react-dom';
import {
  Wand2,
  LayoutGrid,
  History,
  Trash2,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  Upload,
  Clipboard,
  Plus,
  Settings2,
  Layers,
  Heart,
  ArrowRight,
  ArrowLeft,
  Eye,
  RefreshCcw,
  Calendar,
  Search,
  Filter,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Edit3,
  MoreHorizontal,
  Check,
  ListChecks,
  Sparkles,

  Loader2,
  Flag,
  BookOpen,
  Home,
  LayoutList,
  FileDigit,
  ZoomIn,
  Clock,
  Clock3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  Settings,
  BookTemplate,
  Menu,
  Presentation,
  Maximize2,
  Minimize,
  Download,
  FileDown,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  RotateCcw,
} from "lucide-react";
import { ImageUploader } from "./components/ImageUploader";
import {
  StyleControls,
} from "./components/StyleControls";
import {
  STYLE_PRESETS,
  COLOR_PRESETS,
  RATIO_PRESETS,
} from "./constants";
import { ResultCard } from "./components/ResultCard";
import {
  StyleConfig,
  GeneratedSlide,
  StylePreset,
  ProjectSession,
  PageType,
  GlobalStyleMap,
  AppSettings,
  StoredResource,
  StyleTemplate,
  ProjectStatus
} from "./types";
import {
  generateSlideVariant,
  smartRefine,
} from "./services/geminiService";

import { ConfirmDialog } from "./components/ConfirmDialog";
import { OutlineGenerator } from "./components/OutlineGenerator";
import {
  GlobalSettingsModal,
  DEFAULT_SETTINGS,
} from "./components/GlobalSettingsModal";
import { Toast, ToastMessage } from "./components/Toast";
import {
  exportToZip,
  exportToPdf,
  exportToPptx,
} from "./services/exportService";
import { Dashboard } from "./components/Dashboard";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { StyleTemplateManager, FilterTag } from "./components/StyleTemplateManager";
import { StyleTemplateEditor } from './components/StyleTemplateEditor';
import { CreateProjectModal } from "./components/CreateProjectModal";
import { SharedStyleCard } from "./components/SharedStyleCard";
import { LandingPage } from "./components/LandingPageComp";
import { UserWidget } from "./components/auth";
import { ProfileCenter } from './components/user/ProfileCenter';
import { PointsHistory } from './components/user/PointsHistory';
import { AdminLayout } from "./components/admin";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, useSyncProjectSlides } from './api/projects';
import { useTemplates, useSaveTemplate } from './api/templates';
import { useFavorites, useAddFavorite, useRemoveFavorite } from './api/favorites';
import { useAppSettings, useAppSettingsMasked, useUpdateAppSettings } from './api/settings';
import { useQueryClient } from "@tanstack/react-query";
import { HistorySidebar } from "./components/HistorySidebar";
import { SnapshotPreviewBanner } from "./components/SnapshotPreviewBanner";
import { client, uploadFile } from "./api/client";
import { ProjectSnapshot, useHistory, useProjectSnapshots, useCreateSnapshot, useRestoreSnapshot, useForkSnapshot } from "./api/history";
import { resolveResourceUrl } from "./utils/resource";
import { StartProjectModal } from "./components/StartProjectModal";

import { generateId } from "./utils";

// --- Constants ---
const DEFAULT_STYLE_CONFIG: StyleConfig = {
  styleName: "",
  aspectRatio: "16:9",
  colorPalette: "",
  targetPageCount: 10,
  pageStructure: {
    cover: 1,
    directory: 1,
    transition: 2,
    content: 5,
    end: 1,
  },
  defaultVariantCount: 4,
  requirements: "",
};

const SETTINGS_STORAGE_KEY = "bananaslides_global_settings_v1";
const PROJECTS_STORAGE_KEY = "bananaslides_projects_v1";
const TEMPLATES_STORAGE_KEY = "bananaslides_templates_v1";
const ONBOARDING_STORAGE_KEY = "bananaslides_onboarding_v1";

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  [x: string]: any;
  public state = { hasError: false, error: null as Error | null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">程序遇到了一点问题</h2>
            <p className="text-slate-500 mb-6 text-sm">
              检测到未捕获的异常，可能是由于本地缓存数据与新版本不兼容导致的。
            </p>
            <div className="bg-slate-50 p-4 rounded-lg mb-6 text-left overflow-auto max-h-32">
              <code className="text-xs text-slate-600 font-mono break-all leading-relaxed">
                {this.state.error?.message || "Unknown Error"}
              </code>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all"
              >
                尝试刷新页面
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                清除缓存并重置
              </button>
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-400">BananaSlides Gen-AI Error Protection</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Modal Component ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "lightbox";
  maxWidth?: string;
  zIndex?: string; // New Prop for Z-Index
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

  if (variant === "lightbox") {
    return (
      <div
        className={`fixed inset-0 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md ${zIndex}`}
        onClick={onClose}
      >
        <div className="relative max-w-7xl max-h-screen w-full h-full flex flex-col items-center justify-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-50"
          >
            <X size={32} />
          </button>
          <div
            className="w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 ${zIndex}`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[90vh]`}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-all"
          >
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

// --- Cascading Filter Component (Duplicated from Dashboard for isolation) ---
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
    const handleScroll = (event: Event) => {
      // Ignore scroll events originating from within the menu itself
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

// --- History Project Card with Pagination ---
const HistoryProjectCard: React.FC<{
  session: ProjectSession;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onViewImage: (url: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ session, isSelectionMode, isSelected, onToggleSelection, onOpen, onDelete, onViewImage, showToast }) => {
  const [thumbPage, setThumbPage] = useState(0);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExport = async (type: 'zip' | 'pdf' | 'pptx') => {
    setIsExportMenuOpen(false);
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

        {/* Page Count Overlay */}
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
            <div className="flex flex-wrap gap-2">
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

        {/* Filmstrip View - Use 15 items per page for consistency */}
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
            {/* Fill empty slots logic omitted as flex handles it well, sticking to left */}
          </div>

          {/* Pagination Controls */}
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

const App: React.FC = () => {
  const queryClient = useQueryClient();

  // Project Start & Batch Generation State
  const [startProjectModalData, setStartProjectModalData] = useState<{
    isOpen: boolean;
    project: ProjectSession | null;
    pendingItems: GeneratedSlide[];
  }>({
    isOpen: false,
    project: null,
    pendingItems: []
  });
  const [pendingAutoBatch, setPendingAutoBatch] = useState<string | null>(null);





  // --- State ---
  const [viewMode, setViewMode] = useState<
    "landing" | "dashboard" | "workbench" | "history" | "history-detail" | "templates" | "admin"
  >(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // 检查是否访问管理后台
    if (window.location.pathname === '/admin') return 'admin';
    return urlParams.get('project') ? 'workbench' : 'landing';
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const handleCloseToast = useCallback(() => setToast(null), []);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPointsHistory, setShowPointsHistory] = useState(false);

  // Scrolled State for Header Animation
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- Dashboard Filter State ---
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [dashboardFilterStyle, setDashboardFilterStyle] = useState<string[]>([]);
  const [dashboardFilterRatio, setDashboardFilterRatio] = useState<string[]>([]);
  const [dashboardFilterPalette, setDashboardFilterPalette] = useState<string[]>([]);
  const [dashboardTimeType, setDashboardTimeType] = useState<"lastModified" | "createdAt">("lastModified");
  const [dashboardTimeFilter, setDashboardTimeFilter] = useState<string>("");
  const [dashboardStartDate, setDashboardStartDate] = useState<string>("");
  const [dashboardEndDate, setDashboardEndDate] = useState<string>("");
  const [dashboardSortOrder, setDashboardSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dashboardSortBy, setDashboardSortBy] = useState<'createdAt' | 'lastModified' | 'progress'>('lastModified');

  // Settings with Persistence
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  // Real-time Settings from Backend
  // Use MASKED settings for security. API Keys will appear as ••••
  // The backend now handles merging these masked keys correctly on save.
  const { data: serverSettings, isLoading: isSettingsLoading } = useAppSettingsMasked();
  const updateSettingsMutation = useUpdateAppSettings();
  const [isSettingsMigrated, setIsSettingsMigrated] = useState(false);

  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Sync Server Settings to Local State & Auto-migrate
  useEffect(() => {
    // 1. Initial Migration: If we have LocalStorage but server is empty
    if (!isSettingsLoading && !serverSettings && !isSettingsMigrated) {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            console.log("[Settings Migration] Uploading local settings to backend database...");
            updateSettingsMutation.mutate(parsed);
            setIsSettingsMigrated(true);
          }
        } catch (e) {
          console.warn("Migration failed", e);
        }
      }
    }

    // 2. Load from Server if available
    if (serverSettings && typeof serverSettings === 'object') {
      const merged = {
        ...DEFAULT_SETTINGS,
        ...serverSettings,
        ai: {
          ...DEFAULT_SETTINGS.ai,
          ...(serverSettings.ai || {}),
          models: {
            ...DEFAULT_SETTINGS.ai.models,
            ...(serverSettings.ai?.models || {}),
          },
          customCombo:
            serverSettings.ai?.customCombo || DEFAULT_SETTINGS.ai.customCombo,
        },
        performance: {
          ...DEFAULT_SETTINGS.performance,
          ...(serverSettings.performance || {}),
        },
        imageGeneration: {
          ...DEFAULT_SETTINGS.imageGeneration,
          ...(serverSettings.imageGeneration || {}),
        },
        docParser: {
          ...DEFAULT_SETTINGS.docParser,
          ...(serverSettings.docParser || {}),
          baseUrl: (serverSettings.docParser?.baseUrl?.includes('/api/v') || serverSettings.docParser?.baseUrl?.includes('/v1') || serverSettings.docParser?.baseUrl?.includes('/v4'))
            ? DEFAULT_SETTINGS.docParser.baseUrl
            : (serverSettings.docParser?.baseUrl || DEFAULT_SETTINGS.docParser.baseUrl)
        }
      };
      setAppSettings(merged);
    }
  }, [serverSettings, isSettingsLoading]);

  // Data - Work Bench
  // Changed from File[] to Map
  const [styleMap, setStyleMap] = useState<GlobalStyleMap>({
    cover: null,
    directory: null,
    transition: null,
    content: null,
    end: null,
    custom: null,
  });

  const [activePreviewType, setActivePreviewType] = useState<PageType>("cover");

  const [config, setConfig] = useState<StyleConfig>({
    styleName: "",
    colorPalette: "",
    requirements: "",
    aspectRatio: "16:9",
    defaultVariantCount: 1, // Default 1 variant per slide
    targetPageCount: 10, // Default 10
    pageStructure: {
      cover: 1,
      directory: 1,
      transition: 0,
      content: 7, // 10 - 1 - 1 - 1
      end: 1,
    },
  });
  const [isPresetSaved, setIsPresetSaved] = useState(false);
  const [saveToFavorites, setSaveToFavorites] = useState(true);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const [items, setItems] = useState<GeneratedSlide[]>([]);
  const [hasUserInteraction, setHasUserInteraction] = useState(false); // 标记用户是否进行了操作


  // Multi-Project State (Replaced with React Query)
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const syncSlidesMutation = useSyncProjectSlides();


  // --- Effects ---

  // --- Effects ---
  useEffect(() => {
    // Listen for fullscreen change events (e.g. user presses Esc)
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('project') || null;
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Replaced Local State with React Query
  const { data: styleTemplates = [] } = useTemplates();
  const { data: favorites = [] } = useFavorites();

  // Migration Hooks
  const saveTemplateMutation = useSaveTemplate();
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();

  // One-Time Migration Logic (LocalStorage -> SQLite)
  useEffect(() => {
    const migrateData = async () => {
      // 1. Migrate Templates
      const TEMPLATES_KEY = "bananaslides_templates_v1";
      const localTemplates = localStorage.getItem(TEMPLATES_KEY);
      if (localTemplates) {
        try {
          const parsed = JSON.parse(localTemplates);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // We iterate and upload. Note: This creates a burst of requests.
            // For massive data, batching is better, but user likely has < 20 templates.
            for (const t of parsed) {
              // Only migrate if valid name
              if (t.name) {
                await saveTemplateMutation.mutateAsync({
                  name: t.name,
                  config: t.config,
                  styleMap: t.styleMap,
                  isCustom: true // Ensure marked as custom
                });
              }
            }
            localStorage.removeItem(TEMPLATES_KEY);
            setToast({ id: 'mig-tmpl', message: '已成功将您的“自定义模板”迁移至数据库', type: 'success' });
          }
        } catch (e) { console.error("Template Migration Failed", e); }
      }

      // 2. Migrate Favorites
      const FAVORITES_KEY = "bananaslides_favorites_v1";
      const localFavorites = localStorage.getItem(FAVORITES_KEY);
      if (localFavorites) {
        try {
          const parsed = JSON.parse(localFavorites);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const f of parsed) {
              if (f.name) {
                await addFavoriteMutation.mutateAsync({
                  name: f.name,
                  config: f.config,
                  styleMap: f.styleMap,
                  sampleImages: f.sampleImages || []
                });
              }
            }
            localStorage.removeItem(FAVORITES_KEY);
            setToast({ id: 'mig-fav', message: '已成功将您的“收藏夹”迁移至数据库', type: 'success' });
          }
        } catch (e) { console.error("Favorite Migration Failed", e); }
      }
    };

    // Run migration once on mount (with slight delay to let app load)
    const timer = setTimeout(migrateData, 1000);
    return () => clearTimeout(timer);
  }, []); // Run once

  // Clean up legacy storage to prevent QuotaExceededError
  useEffect(() => {
    try {
      if (localStorage.getItem("bananaslides_templates_v1")) {
        console.log('[Cleanup] Removing legacy templates from localStorage...');
        localStorage.removeItem("bananaslides_templates_v1");
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Track the currently active template ID
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() => {
    return localStorage.getItem("bananaslides_active_template_id_v1") || null;
  });

  // Persist active template ID (Keep in LocalStorage as UI state)
  useEffect(() => {
    try {
      if (activeTemplateId) {
        localStorage.setItem("bananaslides_active_template_id_v1", activeTemplateId);
      } else {
        localStorage.removeItem("bananaslides_active_template_id_v1");
      }
    } catch (e) {
      console.warn('LocalStorage quota exceeded for activeTemplateId', e);
    }
  }, [activeTemplateId]);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
  });

  const [isStyleManagerOpen, setIsStyleManagerOpen] = useState(false);

  // Active project data (migrated from current session state)
  const currentProject = projects.find(p => p.id === currentProjectId);
  const activeSession = currentProject; // Alias for backward compatibility and header logic

  // Track previous project ID to avoid overwriting unsaved changes
  const prevProjectIdRef = useRef<string | null>(null);


  // --- Notification Polling (Global) ---
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Use centralized axios client for proxy compatibility
        client.get('/notifications/poll')
          .then((notifications: any) => {
            if (Array.isArray(notifications) && notifications.length > 0) {
              notifications.forEach(note => {
                // Show Toast
                setToast({
                  id: note.id,
                  message: note.message,
                  type: 'success'
                });

                // Refresh History if open
                if (note.type === 'snapshot_summary') {
                  queryClient.invalidateQueries({ queryKey: ['snapshots'] });
                }
              });
            }
          })
          .catch(err => console.error("Poll error (silent):", err));
      } catch (e) {
        // Ignore
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [queryClient, setViewMode]);

  // Sync URL with Project ID (Routing)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (viewMode === 'workbench' && currentProjectId) {
      if (url.searchParams.get('project') !== currentProjectId) {
        url.searchParams.set('project', currentProjectId);
        window.history.pushState({}, '', url.toString());
      }
    } else if (viewMode === 'dashboard' || viewMode === 'landing') {
      if (url.searchParams.has('project')) {
        url.searchParams.delete('project');
        window.history.pushState({}, '', url.toString());
      }
    }
  }, [viewMode, currentProjectId]);

  // Sync Workbench State with Current Project (only when actually switching projects)
  useEffect(() => {


    // Only sync when in workbench AND switching to a different project
    if (viewMode === 'workbench' && currentProjectId && currentProjectId !== prevProjectIdRef.current) {
      if (currentProject) {
        console.log('[Workbench] Loading project data:', currentProjectId);
        console.log('[Workbench] Project items count:', currentProject.items?.length || 0);

        // 标记正在加载数据，防止触发用户交互检测
        isLoadingDataRef.current = true;

        setConfig(currentProject.globalConfig);
        setItems(currentProject.items);
        // 同步更新 Ref,防止初次加载时的竞态
        configRef.current = currentProject.globalConfig;
        itemsRef.current = currentProject.items;
        if (currentProject.globalStyleMap) {
          setStyleMap(currentProject.globalStyleMap);
          styleMapRef.current = currentProject.globalStyleMap;
        }
        // 重置用户交互标志和初始长度,因为这是从数据库加载的数据
        setHasUserInteraction(false);
        initialItemsLengthRef.current = currentProject.items.length;
        console.log('[Workbench] Data loaded, hasUserInteraction reset to false');

        // 延迟重置加载标志，确保状态更新已处理
        setTimeout(() => {
          isLoadingDataRef.current = false;
        }, 100);

        // 只有在数据加载成功后才更新 prevProjectIdRef
        prevProjectIdRef.current = currentProjectId;
      }
      // 如果 currentProject 为 null,不更新 prevProjectIdRef,等待下次触发
    }
  }, [currentProjectId, currentProject, viewMode]);

  // 当回到仪表盘时，我们不再重置 prevProjectIdRef.current
  // 这样如果用户立即重新进入同一个项目，由于 prevProjectIdRef.current 已经匹配，
  // 我们就不会触发 useEffect 来从后端重新加载（可能过时的）数据，从而保留了本地最新的状态。


  // Refs for Auto-Save
  const isLoadingDataRef = useRef(false); // 防止加载数据时触发用户交互检测
  const itemsRef = useRef(items);
  const configRef = useRef(config);
  const styleMapRef = useRef(styleMap);
  const currentProjectIdRef = useRef(currentProjectId);

  // 用于跟踪初始加载的 items 长度
  const initialItemsLengthRef = useRef<number | null>(null);

  // Update Refs on change
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    styleMapRef.current = styleMap;
  }, [styleMap]);
  useEffect(() => {
    currentProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  // 检测用户交互:当 items 变化且不是初始加载或数据加载时,设置 hasUserInteraction
  const prevItemsLengthRef = useRef<number | null>(null);

  useEffect(() => {
    // 如果正在加载数据，跳过并更新 prevItemsLengthRef
    if (isLoadingDataRef.current) {
      console.log('[UserInteraction] Skipped: Loading data in progress');
      prevItemsLengthRef.current = items.length;
      return;
    }

    // 如果是首次运行，只记录初始长度
    if (prevItemsLengthRef.current === null) {
      prevItemsLengthRef.current = items.length;
      return;
    }

    // 如果长度没有变化，跳过
    if (items.length === prevItemsLengthRef.current) {
      return;
    }

    // 更新之前的长度记录
    const oldLength = prevItemsLengthRef.current;
    prevItemsLengthRef.current = items.length;

    // 如果 items 从空变成有内容，可能是加载数据后的首次变化，不触发
    if (oldLength === 0 && items.length > 0) {
      console.log('[UserInteraction] Skipped: Initial data load from 0 to', items.length);
      return;
    }

    // 真正的用户操作：长度发生了变化
    if (!hasUserInteraction) {
      console.log('[UserInteraction] Detected: items changed from', oldLength, 'to', items.length);
      setHasUserInteraction(true);
    }
  }, [items.length, hasUserInteraction]);

  // History Page State
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilterStyle, setHistoryFilterStyle] = useState("");
  const [historyFilterRatio, setHistoryFilterRatio] = useState("");
  const [historyFilterPalette, setHistoryFilterPalette] = useState(""); // New Palette Filter
  const [historyFilterPageType, setHistoryFilterPageType] = useState<"target" | "completed">("target"); // New Page Filter Type
  const [historyFilterMinPages, setHistoryFilterMinPages] = useState("");
  const [historyFilterMaxPages, setHistoryFilterMaxPages] = useState("");
  const [historyFilterTimeType, setHistoryFilterTimeType] = useState<"lastModified" | "createdAt" | "priority">("lastModified"); // New Time Dimension
  const [historyFilterStartDate, setHistoryFilterStartDate] = useState("");
  const [historyFilterEndDate, setHistoryFilterEndDate] = useState("");
  const [historyFilterTime, setHistoryFilterTime] = useState("");
  const [historySortBy, setHistorySortBy] = useState<"lastModified" | "createdAt" | "pages">("lastModified");
  const [historySortOrder, setHistorySortOrder] = useState<"asc" | "desc">("desc");
  const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    new Set()
  );



  // Template Page State
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [templateCategoryTab, setTemplateCategoryTab] = useState<"market" | "popular" | "favorites">("market");
  const [templateFilterStyle, setTemplateFilterStyle] = useState<string[]>([]);
  const [templateFilterRatio, setTemplateFilterRatio] = useState<string[]>([]);
  const [templateFilterPalette, setTemplateFilterPalette] = useState<string[]>([]);
  const [templateFilterPageRange, setTemplateFilterPageRange] = useState<"all" | "under5" | "5-10" | "over10">("all");
  const [templateFilterTimeType, setTemplateFilterTimeType] = useState<"lastModified" | "createdAt" | "priority">("priority");
  const [templateFilterStartDate, setTemplateFilterStartDate] = useState("");
  const [templateFilterEndDate, setTemplateFilterEndDate] = useState("");
  const [templateFilterTime, setTemplateFilterTime] = useState("");
  const [templateSortBy, setTemplateSortBy] = useState<"recommended" | "newest" | "usage" | "favorite">("recommended");
  const [templateSortOrder, setTemplateSortOrder] = useState<"asc" | "desc">("desc");

  // Data - Favorites (Presets)
  // Data - Favorites (Replaced with React Query)
  // Logic moved to migration effect above

  // Sync defaultVariantCount to all items when global setting changes
  React.useEffect(() => {
    if (config.defaultVariantCount && items.length > 0) {
      setItems(prev => prev.map(item => {
        // Only update if different to avoid re-renders? No, simple update is fine.
        // Force update to match global setting
        return { ...item, variantCount: config.defaultVariantCount };
      }));
    }
  }, [config.defaultVariantCount]); // Only run when defaultVariantCount changes

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isRefiningRequirements, setIsRefiningRequirements] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isImageTaskModalOpen, setIsImageTaskModalOpen] = useState(false);

  const [isOutlineGeneratorOpen, setIsOutlineGeneratorOpen] = useState(false);
  const [outlineInitialTopic, setOutlineInitialTopic] = useState(""); // Cache for outline
  const [outlineResetKey, setOutlineResetKey] = useState(0); // KEY for force resetting OutlineGenerator
  const [outlineGeneratorSource, setOutlineGeneratorSource] = useState<'workbench' | 'dashboard'>('workbench');

  // Favorites UI State
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState("");

  // Favorites Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [filterRatio, setFilterRatio] = useState("");
  const [filterPalette, setFilterPalette] = useState(""); // New Palette Filter
  const [filterPageCount, setFilterPageCount] = useState("");
  const [filterTime, setFilterTime] = useState("");

  const [selectedPresetForDetail, setSelectedPresetForDetail] =
    useState<StylePreset | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "danger" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => { },
  });

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [tempStyleMap, setTempStyleMap] = useState<GlobalStyleMap>({
    ...styleMap,
  });
  const [tempImageFiles, setTempImageFiles] = useState<StoredResource[]>([]);


  const styleInputRef = useRef<HTMLInputElement>(null);

  // --- History Mode State ---
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<ProjectSnapshot | null>(null);
  const isPreviewMode = !!previewSnapshot;
  const { restoreSnapshot } = useHistory();


  const handleEnterPreview = (snapshot: ProjectSnapshot) => {
    try {
      const data = JSON.parse(snapshot.data);
      // Load snapshot data into state
      // Note: This temporarily replaces the "live" state in memory.
      // Auto-save MUST be disabled while isPreviewMode is true.
      if (data.globalConfig) setConfig(data.globalConfig);
      if (data.items) setItems(data.items);
      if (data.globalStyleMap) setStyleMap(data.globalStyleMap);

      setPreviewSnapshot(snapshot);
      setToast({ id: Date.now().toString(), message: "已加载历史版本视图 (只读)", type: "info" });
    } catch (e) {
      console.error("Failed to load snapshot data", e);
      setToast({ id: Date.now().toString(), message: "快照数据解析失败", type: "error" });
    }
  };

  const handleExitPreview = () => {
    setPreviewSnapshot(null);
    // Revert to live project data
    if (currentProject) {
      setConfig(currentProject.globalConfig);
      setItems(currentProject.items);
      if (currentProject.globalStyleMap) setStyleMap(currentProject.globalStyleMap);
    }
    setToast({ id: Date.now().toString(), message: "已退出预览模式", type: "success" });
  };

  const handleRestoreCurrentSnapshot = async () => {
    if (!previewSnapshot || !currentProjectId) return;
    if (!confirm(`确定要恢复到版本 v${previewSnapshot.version} 吗？\n当前项目中未保存的修改将会被覆盖。`)) return;

    const loadingId = Date.now().toString();
    setToast({ id: loadingId, message: "正在恢复版本...", type: "info" });

    try {
      // Parse snapshot data
      const snapshotData = JSON.parse(previewSnapshot.data);
      const { globalConfig, styleMap: snapshotStyleMap, items: snapshotItems } = snapshotData;

      // Update frontend state with snapshot data
      if (globalConfig) setConfig(globalConfig);
      if (snapshotStyleMap) setStyleMap(snapshotStyleMap);
      if (snapshotItems) setItems(snapshotItems);

      // Persist to backend - update current project with snapshot data
      await updateProjectMutation.mutateAsync({
        id: currentProjectId,
        data: {
          globalConfig: globalConfig || config,
          globalStyleMap: snapshotStyleMap || {},
        }
      });

      // Sync slides to current project
      if (snapshotItems && snapshotItems.length > 0) {
        await syncSlidesMutation.mutateAsync({
          projectId: currentProjectId,
          slides: snapshotItems
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['projects'] });

      setToast({ id: Date.now().toString(), message: `已恢复到版本 v${previewSnapshot.version}`, type: "success" });
      setPreviewSnapshot(null); // Exit preview
    } catch (e) {
      console.error("Restore snapshot failed:", e);
      setToast({ id: Date.now().toString(), message: "恢复失败", type: "error" });
    }
  };

  const handleForkSnapshot = async () => {
    if (!previewSnapshot) return;
    if (!confirm(`确定要将版本 v${previewSnapshot.version} 另存为新项目吗？\n这将创建一个包含该历史版本所有数据的全新项目。`)) return;

    const loadingId = Date.now().toString();
    setToast({ id: loadingId, message: "正在创建新项目...", type: "info" });

    try {
      // Parse snapshot data
      const snapshotData = JSON.parse(previewSnapshot.data);
      // FIX: styleMap key in ProjectSession is 'globalStyleMap'
      const { title: snapshotTitle, globalConfig, globalStyleMap: snapshotStyleMap, items: snapshotItems } = snapshotData;

      // Get project name. PRIORITY: Snapshot Title > Project Title > Cover Page Title > Default
      const coverPageTitle = snapshotItems?.[0]?.title;
      const originalTitle = currentProject?.title || globalConfig?.styleName || "项目";
      // Use snapshot title if available, otherwise original title, otherwise cover page title
      const baseTitle = snapshotTitle || originalTitle || coverPageTitle;

      // Use V1.X format where X is the snapshot version, with 【复制】 prefix
      // FIX: Logic to avoid duplicate names (e.g. V1.1, V1.1.1, V1.1.2)
      const baseVersionTitle = `【复制】${baseTitle} V1.${previewSnapshot.version}`;
      let newTitle = baseVersionTitle;

      // Check for duplicates and increment suffix
      // Check exact match first
      if (projects.some(p => p.title === newTitle)) {
        let counter = 1;
        // Try .1, .2, .3 suffix
        while (projects.some(p => p.title === `${baseVersionTitle}.${counter}`)) {
          counter++;
        }
        newTitle = `${baseVersionTitle}.${counter}`;
      }

      const newProject = await createProjectMutation.mutateAsync({
        title: newTitle,
        status: 'idle',
        globalConfig: globalConfig || { ...config },
        globalStyleMap: snapshotStyleMap || {},
        isPinned: false
      });

      // Generate new IDs for forked items to avoid unique constraint conflicts
      const forkedItems = snapshotItems?.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substring(2, 11) // Generate new unique ID
      })) || [];

      // If there are items, sync them to the new project
      if (forkedItems.length > 0) {
        await syncSlidesMutation.mutateAsync({
          projectId: newProject.id,
          slides: forkedItems
        });
      }

      // Switch to the new project
      setCurrentProjectId(newProject.id);
      prevProjectIdRef.current = newProject.id;
      setConfig(globalConfig || config);
      setStyleMap(snapshotStyleMap || {});
      setItems(forkedItems);
      setPreviewSnapshot(null); // Exit preview
      setViewMode('workbench');

      showToast(`已创建新项目: ${newTitle}`, "success");
    } catch (e) {
      console.error("Fork snapshot failed:", e);
      showToast("创建项目失败", "error");
    }
  };


  // --- Effects ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Auto-save config changes
  useEffect(() => {
    if (!currentProjectId || isPreviewMode) return;

    const timer = setTimeout(() => {
      updateProjectMutation.mutate({
        id: currentProjectId,
        data: { globalConfig: config }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [config, currentProjectId, updateProjectMutation, isPreviewMode]);

  // Auto-save styleMap changes
  useEffect(() => {
    if (!currentProjectId || isPreviewMode) return;

    const timer = setTimeout(() => {
      updateProjectMutation.mutate({
        id: currentProjectId,
        data: { globalStyleMap: styleMap }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [styleMap, currentProjectId, updateProjectMutation, isPreviewMode]);

  // --- Auto-Save Interval (3 Minutes) ---
  // --- Auto-Save Interval (Duplicate removed) ---
  // The primary auto-save is handled by the useEffect near line 1700 using mutations.

  // Auto-save items changes (for delete/add operations)
  // CRITICAL: Must use syncSlidesMutation, NOT updateProjectMutation
  // updateProjectMutation doesn't support items update (see projects.ts line 281-283)
  useEffect(() => {
    if (!currentProjectId || isPreviewMode || !hasUserInteraction || isProcessing) return; // Wait until processing finishes

    const timer = setTimeout(() => {
      syncSlidesMutation.mutate({
        projectId: currentProjectId,
        slides: items
      });
    }, 200); // 缩短防抖时间至 200ms,减少数据丢失风险

    return () => clearTimeout(timer);
  }, [items, currentProjectId, syncSlidesMutation, isPreviewMode, hasUserInteraction]);

  // 强制同步逻辑：当离开工作台或切换项目时执行
  const flushAutoSave = useCallback(() => {
    if (!currentProjectIdRef.current || isPreviewMode) return;

    // config 和 styleMap 会在 useEffect 中防抖保存，
    // flushAutoSave 主要是为了确保在页面卸载等紧急时刻强制执行一次
    console.log('[FlushAutoSave] Project:', currentProjectIdRef.current);

    // 同步配置和风格
    updateProjectMutation.mutate({
      id: currentProjectIdRef.current,
      data: {
        globalConfig: configRef.current,
        globalStyleMap: styleMapRef.current
      }
    });

    // 同步幻灯片内容 (只有在有交互即内容发生变化时才强制同步 items)
    if (hasUserInteraction && itemsRef.current.length > 0) {
      syncSlidesMutation.mutate({
        projectId: currentProjectIdRef.current,
        slides: itemsRef.current
      });
    }

    console.log('[AutoSave] Flushed changes for project:', currentProjectIdRef.current);
  }, [updateProjectMutation, syncSlidesMutation, isPreviewMode, hasUserInteraction]);

  // 监听视图切换，只有在从 'workbench' 切换到 'dashboard' 时才强制保存
  const prevViewModeRef = useRef(viewMode);
  useEffect(() => {
    // Only flush if the previous view mode was 'workbench' and the current is 'dashboard'
    // This prevents flushing on initial load or other view mode changes
    if (prevViewModeRef.current === 'workbench' && viewMode === 'dashboard') {
      flushAutoSave();
    }
    // Always update the ref to the current viewMode for the next render cycle
    prevViewModeRef.current = viewMode;
  }, [viewMode, flushAutoSave]);

  // 监听页面刷新/关闭事件,确保数据被保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!currentProjectIdRef.current || isPreviewMode) return;

      console.log('[BeforeUnload] Saving data before page unload...');
      flushAutoSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flushAutoSave, isPreviewMode]);

  // 监听标签页可见性变化,在切换标签页时也保存数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && currentProjectIdRef.current && !isPreviewMode) {
        console.log('[VisibilityChange] Tab hidden, saving data...');
        flushAutoSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushAutoSave, isPreviewMode]);


  // --- Helpers ---


  const showToast = useCallback((message: string, type: ToastMessage["type"] = "info") => {
    setToast({ id: Date.now().toString(), message, type });
  }, []);

  const getProviderName = (task: "text" | "image" | "vision") => {
    if (
      appSettings.ai.provider === "CustomCombo" &&
      appSettings.ai.customCombo
    ) {
      return "Custom Combo";
    }
    return appSettings.ai.provider;
  };

  /* import { resolveResourceUrl } from "./utils/resource"; removed from here */

  const getFavoriteThumbnail = (preset: StylePreset) => {
    // Priority 1: Uploaded Reference Images (Specific Order)
    const map = preset.styleMap;
    if (map) {
      if (map.cover) return resolveResourceUrl(map.cover);
      if (map.directory) return resolveResourceUrl(map.directory);
      if (map.transition) return resolveResourceUrl(map.transition);
      if (map.content) return resolveResourceUrl(map.content);
      if (map.end) return resolveResourceUrl(map.end);
    }
    // Legacy single file support
    if (preset.styleFile) return resolveResourceUrl(preset.styleFile);

    // Priority 2: Generated Samples (Assuming index 0 is high priority due to save logic)
    if (preset.sampleImages && preset.sampleImages.length > 0) {
      return preset.sampleImages[0];
    }

    return null;
  };

  // --- Logic for Page Types Limits & Assignment ---

  const getNextPageType = (currentItemsCount: number): PageType => {
    // Logic to assign type based on sequence: Cover -> Directory -> ... -> End
    // This is a heuristic for adding single pages manually.
    // 1. Cover first
    if (currentItemsCount === 0 && (config.pageStructure?.cover || 0) > 0)
      return "cover";
    // 2. Directory second
    if (currentItemsCount === 1 && (config.pageStructure?.directory || 0) > 0)
      return "directory";
    // 3. End last (only if we are adding the absolute last allowed page)
    if (
      currentItemsCount === config.targetPageCount - 1 &&
      (config.pageStructure?.end || 0) > 0
    )
      return "end";

    // 4. Check limits for Transition vs Content
    const currentTransitions = items.filter(
      (i) => i.pageType === "transition"
    ).length;
    if (currentTransitions < (config.pageStructure?.transition || 0)) {
      // If we haven't used up transition quota, maybe suggest transition?
      // But usually manual adds are content. Let's default to content unless specific.
    }
    return "content";
  };

  const validateAddPage = (typeToAdd: PageType = "content"): boolean => {
    // 1. Check Total
    if (items.length >= config.targetPageCount) {
      showToast(
        `无法添加：当前页面数量 (${items.length}) 已达到全局设定的上限 (${config.targetPageCount})。请先在全局设置中增加页面数量。`,
        'error'
      );
      return false;
    }
    return true;
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "info" = "info"
  ) => {
    setConfirmation({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirm = () => {
    setConfirmation((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfigChange = (key: keyof StyleConfig, value: any) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      configRef.current = next;
      return next;
    });
    setIsPresetSaved(false);

    // 只要有任何配置更新，就标记用户交互，触发自动保存
    if (!hasUserInteraction) {
      setHasUserInteraction(true);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    // Double save: LocalStorage for instant local boot, Backend for persistence
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    updateSettingsMutation.mutate(newSettings);
    showToast("全局设置已保存并同步至云端数据库", "success");
  };

  // --- Outline / Topic Logic ---
  const openOutlineGenerator = (initialText: string = "", source: 'workbench' | 'dashboard' = 'workbench') => {
    // 1. Check Total Limit before opening (only if adding to current project)
    if (source === 'workbench' && items.length >= config.targetPageCount) {
      showToast(
        `当前页面已满 (${items.length}/${config.targetPageCount})，请先清理页面或增加全局页面数量上限。`,
        'error'
      );
      return;
    }
    setOutlineGeneratorSource(source);
    setOutlineInitialTopic(initialText); // Use passed text or keep existing cache
    setIsOutlineGeneratorOpen(true);
  };



  const handleCreateProjectFromOutline = async (slides: GeneratedSlide[], topic: string) => {
    try {
      showToast("正在创建项目...", "loading");

      const newProjectId = generateId();
      const coverTitle = slides.find(s => s.pageType === 'cover')?.title;
      const finalTitle = coverTitle || topic || "智能生成演示文稿";

      const newProjectData: Partial<ProjectSession> = {
        title: finalTitle,
        items: slides,
        status: "generating", // Start as generating since we might have pending tasks
        methods: ['text', 'file'] // Assume mixed or at least intelligent
      };

      // 1. Create Project via Mutation (Backend + React Query Update)
      // Note: createProjectMutation handles optimistic updates or invalidation
      const createdProject = await createProjectMutation.mutateAsync({
        title: finalTitle,
        status: 'generating',
        globalConfig: DEFAULT_STYLE_CONFIG,
        globalStyleMap: {
          cover: null,
          directory: null,
          transition: null,
          content: null,
          end: null,
          custom: null,
        },
        isPinned: false
      });

      // 2. Sync Items (Slides)
      // Since createProjectMutation might only create the shell, we need to sync items to it.
      if (slides.length > 0) {
        await syncSlidesMutation.mutateAsync({
          projectId: createdProject.id,
          slides: slides
        });
      }

      // 3. Switch Context & Navigate
      setCurrentProjectId(createdProject.id);
      prevProjectIdRef.current = createdProject.id;

      // Load into local state immediately to avoid lag
      // Load into local state immediately to avoid key
      const newConfig = createdProject.globalConfig || DEFAULT_STYLE_CONFIG;
      const newStyleMap = createdProject.globalStyleMap || {
        cover: null,
        directory: null,
        transition: null,
        content: null,
        end: null,
        custom: null,
      };

      setConfig(newConfig);
      configRef.current = newConfig;
      setStyleMap(newStyleMap);
      styleMapRef.current = newStyleMap;
      setItems(slides);
      itemsRef.current = slides;
      setLocalTitle(finalTitle);

      // 4. Navigate
      setViewMode('workbench');
      showToast("项目已创建并导入大纲内容", "success");

    } catch (error) {
      console.error("Failed to create project from outline:", error);
      showToast("创建项目失败", "error");
    }
  };

  const handleOutlineImport = (slides: GeneratedSlide[]) => {
    // Branch logic based on Source
    if (outlineGeneratorSource === 'dashboard') {
      // Create New Project logic
      // We need the topic for title. OutlineGenerator doesn't pass it back strictly in onFinish,
      // but we have outlineInitialTopic? Or better, we can infer from first slide or generic.
      // Actually, OutlineGenerator should ideally pass the topic back or we use state.
      // Let's use outlineInitialTopic if set, or just "智能生成项目"
      handleCreateProjectFromOutline(slides, outlineInitialTopic || "智能生成演示文稿");
      setOutlineResetKey(prev => prev + 1); // Reset generator for next time
      return;
    }


    // Existing Workbench Logic (Append)
    // Check if importing causes overflow
    if (items.length + slides.length > config.targetPageCount) {
      const allowed = config.targetPageCount - items.length;
      alert(
        `导入部分成功：全局限制为 ${config.targetPageCount} 页，仅导入了前 ${allowed} 页。`
      );
      const importedSlides = slides.slice(0, allowed);
      setItems((prev) => [...prev, ...importedSlides]);

      // Sync to database
      if (currentProjectIdRef.current) {
        const slidesToSync = [...items, ...importedSlides].map(slide => {
          if (slide.contentType === 'image' && slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
            return { ...slide, variants: [slide.previewUrl, ...slide.variants] };
          }
          return slide;
        });
        syncSlidesMutation.mutate({
          projectId: currentProjectIdRef.current,
          slides: slidesToSync
        });
        setHasUserInteraction(true); // 标记交互以触发保存
      } else {
        console.warn('[handleOutlineImport] No currentProjectId, skipping sync!');
      }
    } else {
      setItems((prev) => [...prev, ...slides]);
      // Update methods
      if (currentProjectIdRef.current) {
        const project = projects.find(p => p.id === currentProjectIdRef.current);
        if (project && !project.methods.includes('file')) {
          updateProjectMutation.mutate({
            id: project.id,
            data: { methods: [...project.methods, 'file'] }
          });
        }

        // Sync slides to database
        const slidesToSync = [...items, ...slides].map(slide => {
          if (slide.contentType === 'image' && slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
            return { ...slide, variants: [slide.previewUrl, ...slide.variants] };
          }
          return slide;
        });
        syncSlidesMutation.mutate({
          projectId: currentProjectIdRef.current,
          slides: slidesToSync
        });
        setHasUserInteraction(true); // 标记交互以触发保存
        setOutlineResetKey(prev => prev + 1); // Reset generator for next time
        setTimeout(
          () => showToast(`已成功添加 ${slides.length} 个页面`, "success"),
          100
        );
      }
    }
  };

  // --- Workbench Actions ---
  const clearWorkbench = () => {
    if (items.length === 0) return;
    showConfirm(
      "清空工作台",
      "确定要清空工作台的所有任务吗？此操作将同时清空大纲生成的缓存内容，下次打开将重新开始。",
      () => {
        setItems([]);
        setOutlineInitialTopic(""); // Clear cache
        setOutlineResetKey((prev) => prev + 1); // Increment key to force re-mount
        // Do NOT clear project ID or return to dashboard if we are inside a project
        // setCurrentProjectId(null); 
        // setViewMode('dashboard'); 

        // If we are NOT in a project context (e.g. quick start), then maybe we stay? 
        // Actually, user expects to stay in the workbench to start over.
        // So we just remove these two lines.

        closeConfirm();
        setHasUserInteraction(true); // 标记交互以触发保存
        showToast("工作台已清空", "success");
      },
      "danger"
    );
  };

  const handleDeletePage = (id: string) => {
    showConfirm(
      "删除页面任务",
      "确定要删除此页面任务吗？",
      () => {
        setItems((prev) => prev.filter((i) => i.id !== id));
        closeConfirm();
        setHasUserInteraction(true); // 标记交互以触发保存
      },
      "danger"
    );
  };

  const handleDuplicatePage = (id: string) => {
    if (items.length >= config.targetPageCount) {
      showToast("无法复制：已达到最大页数限制。", 'error');
      return;
    }
    const itemToClone = items.find((i) => i.id === id);
    if (!itemToClone) return;

    const newItem: GeneratedSlide = {
      ...itemToClone,
      id: Math.random().toString(36).substr(2, 9),
      title: itemToClone.title ? `${itemToClone.title} (副本)` : undefined,
      status: "idle",
      variants: [],
      createdAt: Date.now(),
    };

    setItems((prev) => [...prev, newItem]);
    setHasUserInteraction(true); // 标记交互以触发保存
  };

  // --- Favorites Logic ---
  const filteredFavorites = favorites.filter((fav) => {
    const matchSearch = fav.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchStyle = !filterStyle || fav.config.styleName === filterStyle;
    const matchRatio = !filterRatio || fav.config.aspectRatio === filterRatio;
    const matchPalette =
      !filterPalette || fav.config.colorPalette === filterPalette;
    const matchPageCount =
      !filterPageCount ||
      fav.config.targetPageCount.toString() === filterPageCount;

    let matchTime = true;
    if (filterTime) {
      const now = Date.now();
      const diff = now - fav.createdAt;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (filterTime === "24h") matchTime = diff <= ONE_DAY;
      else if (filterTime === "7d") matchTime = diff <= 7 * ONE_DAY;
      else if (filterTime === "30d") matchTime = diff <= 30 * ONE_DAY;
    }

    return (
      matchSearch &&
      matchStyle &&
      matchRatio &&
      matchPalette &&
      matchPageCount &&
      matchTime
    );
  });

  // --- History Logic ---
  const filteredHistory = projects.filter((session) => {
    const matchSearch =
      session.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      session.id.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      (session.displayId || "").toLowerCase().includes(historySearchTerm.toLowerCase());
    const matchStyle =
      !historyFilterStyle ||
      session.globalConfig.styleName === historyFilterStyle;
    const matchRatio =
      !historyFilterRatio ||
      session.globalConfig.aspectRatio === historyFilterRatio;
    const matchPalette =
      !historyFilterPalette ||
      session.globalConfig.colorPalette === historyFilterPalette;
    const multiplier = historySortOrder === "desc" ? -1 : 1;
    const timeRef = historyFilterTimeType === "lastModified" ? "lastModified" : "createdAt";

    const matchPageRange = (() => {
      const target = historyFilterPageType === "target"
        ? session.globalConfig.targetPageCount
        : session.items.filter(i => i.status === 'success' || i.status === 'completed').length;

      const min = historyFilterMinPages ? parseInt(historyFilterMinPages) : 0;
      const max = historyFilterMaxPages ? parseInt(historyFilterMaxPages) : Infinity;
      return target >= min && target <= max;
    })();

    let matchTime = true;
    if (historyFilterTime) {
      const now = Date.now();
      const diff = now - session[timeRef]; // Linkage with time dimension
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (historyFilterTime === "24h") matchTime = diff <= ONE_DAY;
      else if (historyFilterTime === "7d") matchTime = diff <= 7 * ONE_DAY;
      else if (filterTime === "30d") matchTime = diff <= 30 * ONE_DAY;
    }

    const matchDateRange = (() => {
      if (!historyFilterStartDate && !historyFilterEndDate) return true;
      const timestamp = session[timeRef]; // Linkage with time dimension
      if (historyFilterStartDate) {
        const start = new Date(historyFilterStartDate).getTime();
        if (timestamp < start) return false;
      }
      if (historyFilterEndDate) {
        const end = new Date(historyFilterEndDate).getTime() + (24 * 60 * 60 * 1000 - 1);
        if (timestamp > end) return false;
      }
      return true;
    })();

    return (
      session.status === 'completed' &&
      matchSearch &&
      matchStyle &&
      matchRatio &&
      matchPalette &&
      matchTime &&
      matchDateRange &&
      matchPageRange
    );
  }).sort((a, b) => {
    const multiplier = historySortOrder === "desc" ? -1 : 1;
    if (historySortBy === "lastModified") return multiplier * (a.lastModified - b.lastModified);
    if (historySortBy === "createdAt") return multiplier * (a.createdAt - b.createdAt);
    if (historySortBy === "pages") return multiplier * (a.items.length - b.items.length);
    return 0;
  });

  // --- Refinement Handlers ---
  const handleRefineRequirements = async () => {
    if (!config.requirements.trim()) return;
    setIsRefiningRequirements(true);
    try {
      const refined = await smartRefine(
        config.requirements,
        "requirement"
      );
      handleConfigChange("requirements", refined);
      showToast("设计要求修饰成功", "success");
    } catch (error) {
      console.error(error);
      showToast("AI 修饰服务调用失败", "error");
    } finally {
      setIsRefiningRequirements(false);
    }
  };

  const handleRefineSlideContent = async (text: string): Promise<string> => {
    if (!text.trim()) return text;
    try {
      const refined = await smartRefine(text, "content");
      showToast("内容修饰成功", "success");
      return refined;
    } catch (error) {
      console.error(error);
      showToast("AI 修饰服务调用失败", "error");
      throw error;
    }
  };

  // --- Add Text Page Logic (Direct) ---
  const handleAddTextPage = () => {
    if (!validateAddPage()) return; // Check limits

    const nextType = getNextPageType(items.length);
    const newItem: GeneratedSlide = {
      id: Math.random().toString(36).substr(2, 9),
      contentType: "text",
      pageType: nextType,
      originalFile: null,
      title: "添加文本页面",
      textContent: "",
      previewUrl: "",
      variants: [],
      variantCount: 1,
      status: "idle",
      createdAt: Date.now(),
    };

    setItems((prev) => [...prev, newItem]);
    // Update methods
    if (currentProjectIdRef.current) {
      const project = projects.find(p => p.id === currentProjectIdRef.current);
      if (project && !project.methods.includes('text')) {
        updateProjectMutation.mutate({
          id: project.id,
          data: { methods: [...project.methods, 'text'] }
        });
      }

      // Sync slides to database
      const slidesToSync = [...items, newItem].map(slide => {
        if (slide.contentType === 'image' && slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
          return { ...slide, variants: [slide.previewUrl, ...slide.variants] };
        }
        return slide;
      });
      syncSlidesMutation.mutate({
        projectId: currentProjectIdRef.current,
        slides: slidesToSync
      });
    }
    setHasUserInteraction(true); // 标记交互以触发保存
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      100
    );
  };

  const confirmImageTasks = async () => {
    if (tempImageFiles.length === 0) return;

    const availableSlots = config.targetPageCount - items.length;
    if (availableSlots < tempImageFiles.length) {
      showToast(
        `无法全部添加：选择了 ${tempImageFiles.length} 张图片，但剩余空位只有 ${availableSlots} 个。请先调整全局页数。`,
        'error'
      );
      return;
    }

    showToast("正在上传图片...", "loading");

    let currentCount = items.length;

    try {
      const newItems = await Promise.all(tempImageFiles.map(async (file) => {
        const type = getNextPageType(currentCount);
        currentCount++;

        let finalUrl = "";

        // Force upload immediately to ensure we only store URL strings
        if (file instanceof File) {
          try {
            finalUrl = await uploadFile(file);
          } catch (e) {
            console.error("Manual upload failed", e);
            throw new Error(`图片上传失败: ${file.name}`);
          }
        } else if (typeof file === 'string') {
          finalUrl = file;
        } else {
          // Fallback for StoredResource unexpected type
          finalUrl = resolveResourceUrl(file);
        }

        if (!finalUrl) throw new Error("无法获取图片URL");

        return {
          id: generateId(),
          contentType: "image" as const,
          pageType: type,
          title: "添加图片页面",
          // CRITICAL FIX: Store URL string, NEVER File object
          originalFile: finalUrl,
          previewUrl: finalUrl,
          variants: [finalUrl],
          variantCount: 1,
          status: "idle" as const,
          createdAt: Date.now(),
        };
      }));

      setItems((prev) => [...prev, ...newItems]);
      // Sync slides to database
      // Normalize slides: ensure previewUrl is in variants for images
      const slidesToSync = [...items, ...newItems].map(slide => {
        if (slide.contentType === 'image' && slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
          return {
            ...slide,
            variants: [slide.previewUrl, ...slide.variants]
          };
        }
        return slide;
      });

      syncSlidesMutation.mutate({
        projectId: currentProjectId,
        slides: slidesToSync
      });

      setHasUserInteraction(true); // 标记交互以触发保存
      showToast("图片添加成功", "success");
    } catch (error: any) {
      showToast(error.message || "添加图片失败", "error");
    }

    // Update methods
    if (currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId);
      if (project && !project.methods.includes('image')) {
        updateProjectMutation.mutate({
          id: project.id,
          data: { methods: [...(project.methods || []), 'image'] }
        });
      }
    }


    setIsImageTaskModalOpen(false);
    setTempImageFiles([]);
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      100
    );
  };

  // 1. Save Preset / Template Logic
  const openSavePresetModal = () => {
    setPresetNameInput(
      `${config.styleName || "新风格"} ${new Date().toLocaleDateString()}`
    );
    setSaveToLibrary(true); // Default: Add to Library
    setSaveToFavorites(false); // Default: Do not add to favorites
    setIsSavePresetModalOpen(true);
  };

  const confirmSavePreset = () => {
    if (!presetNameInput.trim()) return;

    // Check if at least one option is selected
    if (!saveToLibrary && !saveToFavorites) {
      showToast("请至少选择一项保存位置", "error");
      return;
    }

    // --- Quota Check ---
    if (saveToLibrary && styleTemplates.length >= 200) {
      showToast("自定义模板数量已达上限 (200)，请删除部分模板后再试", "error");
      return;
    }
    if (saveToFavorites && favorites.length >= 20) {
      showToast("我的收藏数量已达上限 (20)，请删除部分收藏后再试", "error");
      return;
    }

    showConfirm("确认保存", "确定保存当前配置为模版吗？", async () => {
      try {
        setToast({ id: "save-preset", message: "正在保存...", type: "loading" });

        // Helper: Upload single image
        const uploadStyleImage = async (file: File): Promise<string> => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (!res.ok) throw new Error(`图片上传失败: ${res.statusText}`);
          const { url } = await res.json();
          return url;
        };

        // Helper: Serialize styleMap
        const serializedStyleMap: GlobalStyleMap = { ...styleMap };
        for (const [type, value] of Object.entries(styleMap)) {
          if (value instanceof File) {
            serializedStyleMap[type as PageType] = await uploadStyleImage(value);
          }
        }

        if (saveToFavorites) {
          await addFavoriteMutation.mutateAsync({
            name: presetNameInput,
            config,
            styleMap: serializedStyleMap,
            sampleImages: []
          });
        }

        if (saveToLibrary) {
          await saveTemplateMutation.mutateAsync({
            name: presetNameInput,
            config,
            styleMap: serializedStyleMap,
            isCustom: true
          });
        }

        setIsSavePresetModalOpen(false);
        setIsPresetSaved(true);
        showToast("保存成功", "success");
        closeConfirm();
      } catch (err: any) {
        console.error("保存预设失败:", err);
        showToast(`保存失败: ${err.message || "未知错误"}`, "error");
        closeConfirm();
      }
    });
  };

  const handleApplyPresetRequest = (preset: StylePreset) => {
    showConfirm("应用预设", "确定覆盖当前设置吗？", () => {
      setConfig({ ...preset.config });
      configRef.current = { ...preset.config };

      // Restore style map if available, otherwise clear or use deprecated file
      let nextStyleMap: GlobalStyleMap;
      if (preset.styleMap) {
        nextStyleMap = { ...preset.styleMap };
      } else {
        // Legacy support
        nextStyleMap = {
          cover: preset.styleFile || null,
          directory: preset.styleFile || null,
          transition: preset.styleFile || null,
          content: preset.styleFile || null,
          end: preset.styleFile || null,
          custom: null,
        };
      }
      setStyleMap(nextStyleMap);
      styleMapRef.current = nextStyleMap;

      setIsPresetSaved(true);
      setIsFavoritesModalOpen(false);
      setSelectedPresetForDetail(null);
      setHasUserInteraction(true); // 标记交互以触发保存
      closeConfirm();
    });
  };

  const handleApplyTemplate = (template: StyleTemplate) => {
    const nextConfig = { ...template.config };
    setConfig(nextConfig);
    configRef.current = nextConfig;

    const nextStyleMap = template.styleMap || { cover: null, directory: null, transition: null, content: null, end: null, custom: null };
    setStyleMap({ ...nextStyleMap });
    styleMapRef.current = { ...nextStyleMap };

    // Force set active template for tracking
    setActiveTemplateId(template.id);
    setActiveTemplateId(template.id);
    setHasUserInteraction(true); // 标记交互以触发保存
  };

  const handleToggleFavorite = (template: StyleTemplate) => {
    const isFav = favorites.some((f) => f.id === template.id);
    if (isFav) {
      removeFavoriteMutation.mutate(template.id);
      showToast("已取消收藏", "success");
    } else {
      // --- Quota Check ---
      if (favorites.length >= 20) {
        showToast("我的收藏数量已达上限 (20)，请删除部分收藏后再试", "error");
        return;
      }

      // Create StylePreset from Template
      const newPreset: StylePreset = {
        id: template.id,
        name: template.name || template.config.styleName,
        config: template.config,
        styleMap: template.styleMap || { cover: null, directory: null, transition: null, content: null, end: null, custom: null },
        createdAt: Date.now(),
        sampleImages: []
      };
      // For adding favorite, actually the backend expects just the ID if it's linking, 
      // OR the full object if it's a new favorite.
      // Based on `useAddFavorite`, it takes `Omit<FavoriteDTO, 'id' | 'createdAt'>`.
      // So we pass the data.
      addFavoriteMutation.mutate({
        templateId: template.id,
        name: newPreset.name,
        config: newPreset.config,
        styleMap: newPreset.styleMap,
        sampleImages: newPreset.sampleImages
      });
      showToast("已添加至收藏夹", "success");
    }
  };

  const handleDeleteFavoriteRequest = (id: string) => {
    showConfirm(
      "删除预设",
      "确定删除吗？",
      () => {
        removeFavoriteMutation.mutate(id);
        if (selectedPresetForDetail?.id === id)
          setSelectedPresetForDetail(null);
        closeConfirm();
      },
      "danger"
    );
  };



  // Manual save if needed (like after generating)
  const syncCurrentProject = () => {
    if (!currentProjectId) return;

    // We only update Thumbnail and Status here for now. 
    // Items are saved via Auto-Save.

    const coverItem = items.find((i) => i.pageType === "cover");
    const firstItem = items[0];
    const bestItem = coverItem || firstItem;

    let thumbUrl = currentProject?.thumbnailUrl;

    if (bestItem) {
      if (bestItem.variants && bestItem.variants.length > 0) {
        thumbUrl = bestItem.variants[0];
      } else if (bestItem.previewUrl) {
        thumbUrl = bestItem.previewUrl;
      }
    }

    // Fallback to style reference
    if ((!thumbUrl || thumbUrl.startsWith('blob:')) && !bestItem && styleMap.cover) {
      thumbUrl = resolveResourceUrl(styleMap.cover);
    } else if ((!thumbUrl || thumbUrl.startsWith('blob:')) && !bestItem && !styleMap.cover) {
      thumbUrl = undefined;
    }

    const newStatus = items.some(i => i.status === 'generating') ? 'generating' :
      (items.length > 0 && items.every(i => i.status === 'success')) ? 'completed' :
        items.length === 0 ? 'generating' : currentProject?.status || 'idle';

    // Check for changes
    const configChanged = JSON.stringify(currentProject?.globalConfig) !== JSON.stringify(config);
    const styleMapChanged = JSON.stringify(currentProject?.globalStyleMap) !== JSON.stringify(styleMap);
    const statusChanged = currentProject?.status !== newStatus;
    const thumbChanged = currentProject?.thumbnailUrl !== thumbUrl;

    // Only mutate if changed
    if (currentProject && (statusChanged || thumbChanged || configChanged || styleMapChanged)) {
      updateProjectMutation.mutate({
        id: currentProjectId,
        data: {
          thumbnailUrl: thumbUrl,
          status: newStatus,
          globalConfig: config,
          globalStyleMap: styleMap,
          lastModified: Date.now()
        }
      });
    }
  };

  // Auto-sync Project State on content changes (Debounced)
  useEffect(() => {
    if (currentProjectId && (items.length > 0 || config)) {
      const timer = setTimeout(() => {
        syncCurrentProject();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [items, config, styleMap, currentProjectId]);


  // Generation Logic
  const processItem = async (item: GeneratedSlide) => {
    try {
      const contentSource =
        item.contentType === "text"
          ? item.textContent || ""
          : (item.originalFile!); // Non-null assertion is safe per our types logic here, or let type inference handle StoredResource

      setItems((prev) =>
        prev.map((res) =>
          res.id === item.id
            ? {
              ...res,
              status: "generating",
              errorMessage: undefined,
              variants: [],
            }
            : res
        )
      );
      const count = item.variantCount || 1;

      const promises = [];
      for (let i = 0; i < count; i++) {
        const label = `Option ${i + 1}`;
        promises.push(
          generateSlideVariant(
            contentSource,
            null, // styleFile由后端智能匹配逻辑处理
            config,
            label,
            item.title,
            item.contentType, // Pass 'text' or 'image'
            item.pageType, // ✅ 传递页面类型
            item.textContent, // ✅ 传递完整文本内容
            styleMap, // ✅ 传递全局风格映射
            items.map(i => i.title).filter(t => !!t) // ✅ 传递本项目所有页面标题作为参考
          )
        );
      }
      const generatedVariants = await Promise.all(promises);
      setItems((prev) =>
        prev.map((res) =>
          res.id === item.id
            ? {
              ...res,
              variants: generatedVariants,
              // Keep original previewUrl (uploaded image) unchanged, generated images go to variants
              // previewUrl stays as the original upload for display on the left side
              status: "success"
            }
            : res
        )
      );

      // Return the generated variants so they can be used for syncing
      return {
        itemId: item.id,
        variants: generatedVariants,
        previewUrl: generatedVariants[0] || item.previewUrl
      };
    } catch (error: any) {
      setItems((prev) =>
        prev.map((res) =>
          res.id === item.id
            ? { ...res, status: "error", errorMessage: error.message }
            : res
        )
      );
      throw error; // Re-throw to be caught by batch handler
    }
  };



  const handleGenerateBatch = async () => {
    const itemsToProcess = items.filter(
      (item) => item.status === "idle" || item.status === "error"
    );
    if (itemsToProcess.length === 0) return;

    setIsProcessing(true);
    const providerName = getProviderName("image");
    showToast(
      `正在调用 ${providerName} API 批量生成图片，请耐心等待⌛️`,
      "loading"
    );

    setItems((prev) =>
      prev.map((item) =>
        item.status === "idle" || item.status === "error"
          ? { ...item, status: "generating" }
          : item
      )
    );

    // Use Concurrency from Settings, default high if undefined (unlimited)
    const CONCURRENCY_LIMIT = appSettings.performance.imageConcurrency || 99;

    const activePromises = new Set<Promise<void>>();
    const generatedResults: Array<{ itemId: string; variants: string[]; previewUrl: string }> = [];
    let failureCount = 0;

    for (const item of itemsToProcess) {
      while (activePromises.size >= CONCURRENCY_LIMIT)
        await Promise.race(activePromises);

      const operation = processItem(item)
        .then((result) => {
          if (result) {
            generatedResults.push(result);
          }
        })
        .catch(() => {
          failureCount++;
        });
      const effectivePromise: Promise<void> = operation.then(() => {
        activePromises.delete(effectivePromise);
      });
      activePromises.add(effectivePromise);
    }
    await Promise.all(activePromises);

    setIsProcessing(false);

    // Sync all generated slides to database
    if (currentProjectId && generatedResults.length > 0) {
      setItems((currentItems) => {
        // Create a map of generated results for quick lookup
        const resultsMap = new Map(generatedResults.map(r => [r.itemId, r]));

        const slidesToSync = currentItems.map(slide => {
          const result = resultsMap.get(slide.id);
          if (result) {
            // Use the generated variants for this item
            return {
              ...slide,
              variants: result.variants,
              previewUrl: result.previewUrl
            };
          }
          // For other slides, ensure previewUrl is in variants
          if (slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
            return {
              ...slide,
              variants: [slide.previewUrl, ...slide.variants]
            };
          }
          return slide;
        });


        return slidesToSync;
      });
    } else {
      console.warn('[handleGenerateBatch] No currentProjectId, skipping sync');
    }

    // 检查是否所有幻灯片都已完成并更新项目状态
    // 如果所有现有项都已成功 (且至少有一个项),则标记为已完成
    setItems((currentItems) => {
      const allCompleted = currentItems.length > 0 &&
        currentItems.every(i => i.status === 'success');

      if (allCompleted && currentProjectId) {
        updateProjectMutation.mutate({
          id: currentProjectId,
          data: { status: 'completed' }
        });
      }
      return currentItems;
    });

    if (failureCount > 0) {
      showToast(
        `调用 ${providerName} API 完成,但有 ${failureCount} 张生成失败`,
        "error"
      );
    } else {
      showToast(`调用 ${providerName} API 服务成功`, "success");
    }
  };

  const handleSingleGenerate = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      const providerName = getProviderName("image");
      showToast(`调用 ${providerName} API 生成单页中...`, "loading");
      try {
        const result = await processItem(item);

        // Sync to database after successful generation
        if (currentProjectId && result) {
          setItems((currentItems) => {
            const slidesToSync = currentItems.map(slide => {
              // Use the returned variants for the generated item
              // DO NOT overwrite previewUrl - keep the original uploaded image on the left side
              if (slide.id === result.itemId) {
                return {
                  ...slide,
                  variants: result.variants
                  // previewUrl is intentionally NOT updated here to preserve the original upload
                };
              }
              // For other slides, ensure previewUrl is in variants
              if (slide.previewUrl && !slide.variants.includes(slide.previewUrl)) {
                return {
                  ...slide,
                  variants: [slide.previewUrl, ...slide.variants]
                };
              }
              return slide;
            });

            syncSlidesMutation.mutate({
              projectId: currentProjectId,
              slides: slidesToSync
            });

            return slidesToSync;
          });
        }

        // 检查是否所有幻灯片都已完成并更新项目状态
        setItems((currentItems) => {
          const allCompleted = currentItems.length > 0 &&
            currentItems.every(i => i.status === 'success');

          if (allCompleted && currentProjectId) {
            updateProjectMutation.mutate({
              id: currentProjectId,
              data: { status: 'completed' }
            });
          }
          return currentItems;
        });

        showToast(`调用 ${providerName} API 服务成功`, "success");
      } catch (error: any) {
        showToast(`调用 ${providerName} API 失败: ${error.message}`, "error");
      }
    }
  };

  const handleRegenerate = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "generating", variants: [] } : i
      )
    );

    const providerName = getProviderName("image");
    showToast(`重新调用 ${providerName} API 生成中...`, "loading");
    try {
      const result = await processItem(item);

      // 同步到数据库
      if (currentProjectId && result) {
        setItems((currentItems) => {
          const slidesToSync = currentItems.map(slide => {
            if (slide.id === result.itemId) {
              return {
                ...slide,
                variants: result.variants,
                status: 'success' as const
              };
            }
            return slide;
          });

          syncSlidesMutation.mutate({
            projectId: currentProjectId,
            slides: slidesToSync
          });

          return slidesToSync;
        });

        // 更新项目整体状态
        setItems((currentItems) => {
          const allCompleted = currentItems.length > 0 &&
            currentItems.every(i => i.status === 'success');

          if (allCompleted && currentProjectId) {
            updateProjectMutation.mutate({
              id: currentProjectId,
              data: { status: 'completed' }
            });
          }
          return currentItems;
        });
      }

      showToast(`调用 ${providerName} API 服务成功`, "success");
    } catch (e) {
      showToast(`调用 ${providerName} API 失败`, "error");
    }
  };

  // Export Logic
  const handleBatchExport = async (type: "zip" | "pdf" | "pptx") => {
    const title = config.styleName || "bananaslides-genai";
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${title}_${timestamp}`;

    showToast("正在准备并下载导出文件...", "loading");

    try {
      if (type === "zip") {
        await exportToZip(items, filename);
      } else if (type === "pdf") {
        await exportToPdf(items, filename);
      } else if (type === "pptx") {
        await exportToPptx(items, filename);
      }
      setIsExportMenuOpen(false);
      showToast("导出成功", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e.message || "导出失败，请重试", "error");
    }
  };

  // Drag Drop
  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) =>
    e.preventDefault();
  const handleDrop = (index: number) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedItemIndex(null);
    setHasUserInteraction(true); // 标记交互以触发保存
  };

  // Helper for updates
  const handleUpdateItem = (id: string, updates: Partial<GeneratedSlide>) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      itemsRef.current = next;
      return next;
    });

    // 只要有任何更新，就标记用户交互，触发自动保存
    if (!hasUserInteraction) {
      setHasUserInteraction(true);
    }
  };

  // Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e: any) => {
      if (!isImageTaskModalOpen && !isStyleModalOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      const pastedImageFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.startsWith("image/")) {
          // Since paste doesn't trigger uploader, we sadly cannot auto-upload easily here without logic.
          // For now, let's keep it as File for paste, BUT tempImageFiles is StoredResource[].
          // StoredResource accepts File. So this is fine!
          const file = clipboardItems[i].getAsFile();
          if (file) pastedImageFiles.push(file);
        }
      }
      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        if (isImageTaskModalOpen)
          setTempImageFiles((prev) => [...prev, ...pastedImageFiles]);
        else if (isStyleModalOpen) {
          // Paste to the 'cover' slot or 'content' by default in temp map?
          // Actually, let's just add to cover for now as default paste behavior
          setTempStyleMap((prev) => ({ ...prev, cover: pastedImageFiles[0] }));
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [isImageTaskModalOpen, isStyleModalOpen]);

  // Missing Functions Definitions
  const openStyleModal = () => {
    setTempStyleMap({ ...styleMap }); // Initialize temp map with current
    setIsStyleModalOpen(true);
  };
  const openImageTaskModal = () => setIsImageTaskModalOpen(true);

  const handleTempStylePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "pasted-style.png", {
            type: imageType,
          });
          // Default paste to cover
          setTempStyleMap((prev) => ({ ...prev, cover: file }));
          return;
        }
      }
      showToast("剪贴板中没有图片", 'error');
    } catch (e) {
      console.error(e);
      showToast("无法读取剪贴板，请尝试 Ctrl+V", 'error');
    }
  };

  const handleTempImageTaskPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const newFiles: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `pasted-${Date.now()}.png`, {
            type: imageType,
          });
          newFiles.push(file);
        }
      }
      if (newFiles.length > 0) {
        setTempImageFiles((prev) => [...prev, ...newFiles]);
      } else {
        showToast("剪贴板中没有图片", 'error');
      }
    } catch (e) {
      console.error(e);
      showToast("无法读取剪贴板，请尝试 Ctrl+V", 'error');
    }
  };

  const handleBatchDeleteHistory = () => {
    if (selectedHistoryIds.size === 0) return;
    showConfirm(
      "批量删除",
      `确定删除选中的 ${selectedHistoryIds.size} 个项目吗？`,
      () => {
        // Batch delete
        const ids = Array.from(selectedHistoryIds);
        // Not optimal to loop mutations but fine for small batch
        ids.forEach(id => deleteProjectMutation.mutate(id));

        setSelectedHistoryIds(new Set());
        closeConfirm();
      },
      "danger"
    );
  };

  const handleDeleteSession = (id: string) => {
    showConfirm(
      "删除项目",
      "确定删除此历史记录吗？",
      () => {
        deleteProjectMutation.mutate(id);
        if (currentProjectId === id) {
          setCurrentProjectId(null);
          setViewMode("history");
          setIsHistoryOpen(false); // Ensure history sidebar closes
        }
        closeConfirm();
      },
      "danger"
    );
  };

  const handleRestoreSession = (session: ProjectSession) => {
    showConfirm("恢复项目", "恢复将覆盖当前工作台内容，确定吗？", () => {
      setItems(session.items);
      setConfig(session.globalConfig);
      if (session.globalStyleMap) {
        setStyleMap(session.globalStyleMap);
      } else {
        // Fallback or empty
      }
      setCurrentProjectId(session.id);
      prevProjectIdRef.current = session.id;
      setViewMode("workbench");
      closeConfirm();
    });
  };

  // --- PROJECT ACTIONS ---
  // --- PROJECT ACTIONS ---
  const handleOpenCreateProjectModal = () => {
    setIsCreateProjectModalOpen(true);
  };

  const doCreateProject = async (title: string) => {
    if (!title) return;

    // Default Style Configuration
    const defaultConfig: StyleConfig = {
      styleName: "极简科技",
      colorPalette: "经典蓝白",
      requirements: "",
      aspectRatio: "16:9",
      defaultVariantCount: 1, // Default 1 variant per slide
      targetPageCount: 10,
      pageStructure: {
        cover: 1,
        directory: 1,
        transition: 0,
        content: 7,
        end: 1,
      },
    };

    try {
      const newProject = await createProjectMutation.mutateAsync({
        title,
        status: 'idle',
        globalConfig: defaultConfig,
        globalStyleMap: {
          cover: null,
          directory: null,
          transition: null,
          content: null,
          end: null,
          custom: null
        },
        isPinned: false
      });


      setCurrentProjectId(newProject.id);
      prevProjectIdRef.current = newProject.id;
      setConfig(defaultConfig);
      setStyleMap({
        cover: null,
        directory: null,
        transition: null,
        content: null,
        end: null,
        custom: null
      });

      // Clear Items
      setItems([]);

      setViewMode('workbench');
      showToast(`已创建新项目: ${title}`, "success");
    } catch (e) {
      console.error("[doCreateProject] Failed to create project:", e);
      showToast("创建项目失败", "error");
    }
  };

  // Reset All Filters (Global)
  const handleResetAllFilters = () => {
    // History Filters
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

    // Dashboard Filters
    setDashboardSearchQuery("");
    setDashboardStatusFilter("all");
    setDashboardFilterStyle([]);
    setDashboardFilterRatio([]);
    setDashboardFilterPalette([]);
    setDashboardTimeType("lastModified");
    setDashboardTimeFilter("");
    setDashboardStartDate("");
    setDashboardEndDate("");
    setDashboardSortBy("lastModified");
    setDashboardSortOrder("desc");

    // Template Filters
    setTemplateSearchTerm("");
    setTemplateCategoryTab("market");
    setTemplateFilterStyle([]);
    setTemplateFilterRatio([]);
    setTemplateFilterPalette([]);
    setTemplateFilterPageRange("all");
    setTemplateFilterTimeType("lastModified");
    setTemplateFilterStartDate("");
    setTemplateFilterEndDate("");
    setTemplateFilterTime("");
    setTemplateSortBy("recommended");
    setTemplateSortOrder("desc");

    showToast("所有筛选已重置", "info");
  };

  const handleOpenProject = async (id: string, view: "editor" | "workbench" = "editor") => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const sanitizedItems = project.items.map(item => {
      // Ensure variants array exists and contains previewUrl if it's an image
      if (item.contentType === 'image' && item.previewUrl && !item.variants.includes(item.previewUrl)) {
        return { ...item, variants: [item.previewUrl, ...item.variants] };
      }
      return item;
    });
    setItems(sanitizedItems);
    setConfig(project.globalConfig);

    // Defense: Sanitize Style Map
    if (project.globalStyleMap) {
      setStyleMap(project.globalStyleMap);
    } else {
      // Legacy globalStyleFiles logic removed
    }

    setCurrentProjectId(id);
    prevProjectIdRef.current = id;

    // NEW: Read-Only Mode for Completed Projects
    if (project.status === 'completed') {
      setViewMode('history-detail');
      // Ensure scrolling to top
      window.scrollTo(0, 0);
    } else {
      setViewMode('workbench');
    }
  };

  const handleRestoreToEdit = (id: string) => {
    showConfirm(
      "恢复编辑",
      "确定要将此项目恢复为草稿状态吗？这将允许您修改内容和配置。",
      () => {
        updateProjectMutation.mutate({
          id,
          data: { status: 'generating' } // Reset to generating to allow edits? Or just active.
        });
        // Set View to Workbench
        setCurrentProjectId(id);
        prevProjectIdRef.current = id;
        setViewMode('workbench');
        closeConfirm();
        showToast("项目已恢复编辑状态", "success");
      },
      "info"
    );
  };

  const handleDeleteProject = (id: string) => {
    showConfirm(
      "删除项目",
      "确定要永久删除此项目吗？此操作不可恢复。",
      () => {
        deleteProjectMutation.mutate(id);
        if (currentProjectId === id) {
          setCurrentProjectId(null);
          prevProjectIdRef.current = null;
          setIsHistoryOpen(false); // Ensure history sidebar closes if open
        }
        showToast("项目已删除", "success");
        closeConfirm();
      },
      "danger"
    );
  };

  const handleTogglePin = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      updateProjectMutation.mutate({ id, data: { isPinned: !project.isPinned } });
    }
  };

  const handleTogglePause = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      updateProjectMutation.mutate({
        id,
        data: { status: project.status === 'generating' ? 'paused' : 'generating' }
      });
    }
  };


  // --- Header Sync Logic (Title <-> Cover) ---
  const handleUpdateProjectTitle = (newTitle: string) => {
    if (!currentProjectId) return;

    // 1. Update Project Metadata
    updateProjectMutation.mutate({
      id: currentProjectId,
      data: { title: newTitle }
    });

    // 2. Sync to Cover Page (if exists) - Update ONLY title, keep content independent
    setItems(prev => prev.map(item => {
      if (item.pageType === 'cover') {
        return { ...item, title: newTitle };
      }
      return item;
    }));
  };

  // Sync: Cover Content -> Project Title (Reverse) - REMOVED per user request
  // Project title is now independent from cover page content.
  useEffect(() => {
    // Logic removed to separate project title from cover page
  }, []);
  const [localTitle, setLocalTitle] = useState("");

  // Sync active project title to local state when project changes
  useEffect(() => {
    if (activeSession?.title) {
      setLocalTitle(activeSession.title);
    } else {
      setLocalTitle("");
    }
  }, [activeSession?.id, activeSession?.title]);

  const handleTitleBlur = () => {
    if (localTitle.trim() !== activeSession?.title) {
      handleUpdateProjectTitle(localTitle);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };






  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "completed");
    } catch (e) {
      // Quietly fail
    }
  }, [showOnboarding === false]);

  const toggleHistorySelection = (id: string) => {
    const newSet = new Set(selectedHistoryIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedHistoryIds(newSet);
  };


  const hasAnyStyle = Object.values(styleMap).some((f) => f !== null);

  // Helper for Style Modal Types
  const PAGE_TYPES: { type: PageType; label: string }[] = [
    { type: "cover", label: "封面页 (Cover)" },
    { type: "directory", label: "目录页 (Directory)" },
    { type: "transition", label: "章节过渡 (Transition)" },
    { type: "content", label: "内容正文 (Content)" },
    { type: "end", label: "结束页 (End)" },
  ];

  const isFull = items.length >= config.targetPageCount;

  const handleStartProjectRequest = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const validItems = project.items.filter(i => i.title || i.textContent || i.originalFile || i.previewUrl);

    if (validItems.length === 0) {
      showToast("项目没有有效的待生成任务", "info");
      return;
    }

    const pendingItems = validItems.filter(i => i.status !== 'success');

    if (pendingItems.length === 0) {
      handleOpenProject(projectId);
      return;
    }

    setStartProjectModalData({
      isOpen: true,
      project,
      pendingItems
    });
  };

  const handleConfirmBatchStart = () => {
    const { project } = startProjectModalData;
    if (project) {
      handleOpenProject(project.id);
      setPendingAutoBatch(project.id); // Trigger auto batch in useEffect
    }
    setStartProjectModalData(prev => ({ ...prev, isOpen: false }));
  };

  // Auto-trigger batch generation when project opens with pending flag
  useEffect(() => {
    if (pendingAutoBatch && currentProjectId === pendingAutoBatch) {
      if (items.length > 0) { // Wait for items to load
        // Small delay to ensure state is ready
        const timer = setTimeout(() => {
          handleGenerateBatch();
          setPendingAutoBatch(null); // Clear flag
        }, 500);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoBatch, currentProjectId, items]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-y-scroll">
      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmation.isOpen}
        title={confirmation.title}
        message={confirmation.message}
        onConfirm={confirmation.onConfirm}
        onCancel={closeConfirm}
        type={confirmation.type}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={handleCloseToast} />

      {/* Global Settings Modal */}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        currentSettings={appSettings}
        onSave={handleSaveSettings}
        readOnly={!!previewSnapshot}
        showToast={showToast}
      />

      {/* Snapshot Preview Banner */}
      {previewSnapshot && (
        <div className="fixed top-0 left-0 right-0 z-[60]">
          <SnapshotPreviewBanner
            snapshot={previewSnapshot}
            onRestore={handleRestoreCurrentSnapshot}
            onFork={handleForkSnapshot}
            onExit={handleExitPreview}
          />
        </div>
      )}

      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentProject={currentProject || null}
        liveProjectData={currentProject ? {
          ...currentProject,
          items,  // Real-time items with variants (images)
          globalConfig: config,
          globalStyleMap: styleMap
        } : null}
        settings={appSettings}
        onPreview={handleEnterPreview}
        showToast={showToast}
      />

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreate={doCreateProject}
      />

      {/* Outline Generator Modal - Pass Config and KEY for reset */}
      <OutlineGenerator
        key={outlineResetKey}
        isOpen={isOutlineGeneratorOpen}
        onClose={() => setIsOutlineGeneratorOpen(false)}
        onFinish={handleOutlineImport}
        initialTopic={outlineInitialTopic}
        config={config}
        appSettings={appSettings}
        onShowToast={showToast}
      />

      {/* Lightbox */}
      <Modal
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        variant="lightbox"
        zIndex="z-[200]"
      >
        {lightboxImage && (
          <img
            src={lightboxImage}
            alt="Full size view"
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
          />
        )}
      </Modal>



      {/* Save Preset Modal */}
      <Modal
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        title="保存为模版"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={() => setIsSavePresetModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              取消
            </button>
            <button
              onClick={confirmSavePreset}
              disabled={!saveToFavorites && !saveToLibrary}
              className={`px-6 py-2 rounded-lg text-white transition-all ${(!saveToFavorites && !saveToLibrary)
                ? "bg-slate-200 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-600"
                }`}
            >
              下一步
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            预设名称
          </label>
          <input
            type="text"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="例如：科技感蓝色商务风"
            autoFocus
          />

          <div className="flex flex-col gap-3 mt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-200"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">添加至模版库 (推荐)</span>
                <span className="text-xs text-slate-400">将配置保存为可复用的模版，方便后续调用</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={saveToFavorites}
                onChange={(e) => setSaveToFavorites(e.target.checked)}
                className="w-4 h-4 text-indigo-500 rounded border-slate-300 focus:ring-indigo-200"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-700">收藏至我的收藏</span>
                <span className="text-xs text-slate-400">同时添加到个人收藏夹中</span>
              </div>
            </label>
          </div>



          {(!saveToFavorites && !saveToLibrary) && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle size={14} />
              <span>请至少选择一个保存位置</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Favorites List Modal */}
      <Modal
        isOpen={isFavoritesModalOpen}
        onClose={() => setIsFavoritesModalOpen(false)}
        title="我的收藏"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-between items-center w-full px-1">
            <span className="text-xs text-slate-500 font-medium">
              共找到 {filteredFavorites.length} 个预设
            </span>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Top Search Bar - Clean & Wide */}
          <div className="flex flex-col gap-4">
            <div className="relative w-full">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="搜索收藏的风格..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-sm"
              />
            </div>

            {/* Filter Tags - Consistent with StyleTemplateManager */}
            <div className="space-y-4">
              {/* Row 1: Style Presets */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">风格:</span>
                <FilterTag active={!filterStyle} onClick={() => setFilterStyle("")}>全部</FilterTag>
                {STYLE_PRESETS.map((s) => (
                  <FilterTag key={s} active={filterStyle === s} onClick={() => setFilterStyle(s)}>{s}</FilterTag>
                ))}
              </div>

              {/* Row 2: Palette */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">配色:</span>
                <FilterTag active={!filterPalette} onClick={() => setFilterPalette("")}>全部</FilterTag>
                {COLOR_PRESETS.map((c) => (
                  <FilterTag key={c} active={filterPalette === c} onClick={() => setFilterPalette(c)}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full border border-black/10" style={{ backgroundColor: c.split(',')[0] }}></span>
                      {c}
                    </span>
                  </FilterTag>
                ))}
              </div>

              {/* Row 3: Ratio + Page Count */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">比例:</span>
                  <FilterTag active={!filterRatio} onClick={() => setFilterRatio("")}>全部</FilterTag>
                  {RATIO_PRESETS.map((r) => (
                    <FilterTag key={r} active={filterRatio === r} onClick={() => setFilterRatio(r)}>{r}</FilterTag>
                  ))}
                </div>

                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">页数:</span>
                  <input
                    type="text"
                    placeholder="目标页数"
                    value={filterPageCount}
                    onChange={(e) => setFilterPageCount(e.target.value)}
                    className="w-20 text-xs border border-slate-200 bg-slate-50 focus:bg-white rounded-lg py-1.5 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-center transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredFavorites.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
              <Heart size={48} className="mx-auto mb-3 text-slate-200" />
              <p>没有找到匹配的风格预设</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredFavorites.map((fav) => (
                <div key={fav.id} className="h-[300px] w-full relative group">
                  <div className="absolute inset-0 origin-top-left" style={{ transform: 'scale(1)', width: '100%', height: '100%' }}>
                    <SharedStyleCard
                      item={fav}
                      onDetail={() => setSelectedPresetForDetail(fav)}
                      onApply={() => handleApplyPresetRequest(fav)}
                      onDelete={() => handleDeleteFavoriteRequest(fav.id)}
                      variant="favorites"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>


      {/* Template Detail Modal - Read-only */}
      <Modal
        isOpen={!!selectedPresetForDetail}
        onClose={() => setSelectedPresetForDetail(null)}
        title="查看模板"
        maxWidth="max-w-6xl"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setSelectedPresetForDetail(null)}
              className="px-6 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold"
            >
              关闭
            </button>
            <button
              onClick={() => {
                const fav = selectedPresetForDetail;
                if (fav) {
                  setSelectedPresetForDetail(null);
                  handleApplyPresetRequest(fav);
                }
              }}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-200 transition-all font-bold text-sm"
            >
              应用此模板
            </button>
          </div>
        }
      >
        {selectedPresetForDetail && (
          <StyleTemplateEditor
            template={{ ...selectedPresetForDetail, isCustom: false }}
            isEditing={false}
            onUpdateConfig={() => { }}
            onUpdateStyleMap={() => { }}
            onStructureChange={() => { }}
            setName={() => { }}
            onShowToast={showToast}
            appSettings={appSettings}
            onViewImage={(url) => setLightboxImage(url)}
          />
        )}
      </Modal>

      {/* Style Reference Modal - NEW LAYOUT with 5 Slots */}
      <Modal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        title="上传风格参考图"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={() =>
                setTempStyleMap({
                  cover: null,
                  directory: null,
                  transition: null,
                  content: null,
                  end: null,
                  custom: null,
                })
              }
              className="px-4 py-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100"
            >
              全部清空
            </button>
            <button
              onClick={async () => {
                // Ensure all files in tempStyleMap are uploaded before saving
                const finalStyleMap = { ...tempStyleMap };
                let hasUploads = false;

                showToast("正在保存风格配置...", "loading");

                try {
                  // Iterate all keys in style map
                  for (const key of Object.keys(finalStyleMap)) {
                    const k = key as keyof GlobalStyleMap;
                    const val = finalStyleMap[k];

                    if (val instanceof File) {
                      hasUploads = true;
                      try {
                        const url = await uploadFile(val);
                        finalStyleMap[k] = url;
                      } catch (e) {
                        console.error(`Failed to upload style image for ${k}`, e);
                        showToast(`上传失败: ${k}`, "error");
                        return; // Stop if upload fails
                      }
                    }
                  }

                  setStyleMap(finalStyleMap);
                  setIsStyleModalOpen(false);
                  setIsPresetSaved(false);
                  showToast("风格配置已更新", "success");
                } catch (e) {
                  showToast("保存风格失败", "error");
                }
              }}
              className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg"
            >
              确定使用
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-700 flex items-start gap-2">
            <Sparkles size={16} className="mt-0.5 shrink-0" />
            <p>
              请为不同页面类型分别上传参考图，AI
              将根据页面类型智能匹配设计风格。未上传的类型将自动使用“内容正文”的风格作为替补。
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PAGE_TYPES.map((pt) => (
              <div key={pt.type} className="flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  {pt.type === "cover" ? (
                    <Home size={12} />
                  ) : pt.type === "directory" ? (
                    <LayoutList size={12} />
                  ) : pt.type === "transition" ? (
                    <BookOpen size={12} />
                  ) : pt.type === "end" ? (
                    <Flag size={12} />
                  ) : (
                    <FileText size={12} />
                  )}
                  {pt.label}
                </div>
                <div className="h-32">
                  <ImageUploader
                    variant="style-ref"
                    files={
                      tempStyleMap[pt.type]
                        ? [tempStyleMap[pt.type] as StoredResource]
                        : []
                    }
                    onFilesSelected={(files) =>
                      setTempStyleMap((prev) => ({
                        ...prev,
                        [pt.type]: files[0],
                      }))
                    }
                    onRemoveFile={() =>
                      setTempStyleMap((prev) => ({ ...prev, [pt.type]: null }))
                    }
                    label="点击上传"
                    subLabel="参考图"
                    autoUpload={true} // Enable backend upload
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Image Task Modal */}
      <Modal
        isOpen={isImageTaskModalOpen}
        onClose={() => setIsImageTaskModalOpen(false)}
        title="添加图片素材任务"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setIsImageTaskModalOpen(false)}
              className="flex-1 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              取消
            </button>
            <button
              onClick={confirmImageTasks}
              disabled={tempImageFiles.length === 0}
              className={`flex-1 py-2 rounded-lg font-medium shadow-sm transition-all ${tempImageFiles.length === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200"
                }`}
            >
              确认添加 ({tempImageFiles.length})
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <ImageUploader
              files={[]}
              onFilesSelected={(f) =>
                setTempImageFiles((prev) => [...prev, ...f])
              }
              onRemoveFile={() => { }}
              label={
                tempImageFiles.length > 0 ? "继续添加图片" : "点击选择图片"
              }
              multiple={true}
              autoUpload={true} // Enable backend upload
            />
            <button
              onClick={handleTempImageTaskPaste}
              className="w-full py-3 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Clipboard size={16} /> 从剪贴板粘贴
            </button>
          </div>
          {tempImageFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700">
                已选择 ({tempImageFiles.length})
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {tempImageFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={resolveResourceUrl(file)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() =>
                          setTempImageFiles((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="bg-red-500 text-white p-1.5 rounded-full"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ErrorBoundary>
        <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-600 flex flex-col overflow-x-hidden">



          {/* Header - Global (Except Landing & Admin) */}
          {viewMode !== 'landing' && viewMode !== 'admin' && (
            <>
              <header
                className={`fixed z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                  ${isScrolled
                    ? "top-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl rounded-full bg-white/75 backdrop-blur-xl border border-white/60 shadow-lg px-2 h-14"
                    : "top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 shadow-sm"
                  }`}
              >
                <div className={`mx-auto flex items-center justify-between relative h-full transition-all duration-500
                  ${isScrolled ? "px-4 w-full" : "max-w-[1480px] px-6"}`}
                >

                  {/* LEFT SECTION: Logo + Context Navigation */}
                  <div className={`flex items-center gap-6 z-10 shrink-0 ${(viewMode === 'workbench' || viewMode === 'history-detail') ? '' : 'w-[300px]'}`}>
                    <div
                      className="flex items-center gap-2.5 cursor-pointer group"
                      onClick={() => setViewMode('landing')}
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                        <div className="relative flex items-center justify-center w-6 h-6">
                          <div className="absolute w-4 h-3 bg-white/20 rounded-sm -rotate-12 translate-x-1 -translate-y-1" />
                          <div className="absolute w-4 h-3 bg-white/40 rounded-sm rotate-12 -translate-x-1" />
                          <div className="relative w-4.5 h-3.5 bg-white rounded-[2px] shadow-sm flex items-center justify-center z-10">
                            <Presentation size={10} className="text-blue-600" />
                          </div>
                          <Sparkles size={8} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse z-20" />
                          <Sparkles size={6} className="absolute -bottom-0.5 -left-0.5 text-white/80 animate-bounce delay-75 z-20" />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">BananaSlides</h1>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 block">GenAI PPT</span>
                      </div>
                    </div>

                    {/* Workbench Context: Back Button & Title */}
                    {(viewMode === 'workbench' || viewMode === 'history-detail') && (
                      <>
                        <div className="h-8 w-px bg-slate-200/80"></div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setViewMode(viewMode === 'history-detail' ? 'history' : 'dashboard');
                              setIsHistoryOpen(false);
                            }}
                            className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all text-xs font-bold whitespace-nowrap"
                          >
                            <div className="bg-white p-1 rounded-lg shadow-sm">
                              <ArrowLeft size={12} />
                            </div>
                            返回
                          </button>

                          {/* ID Badge - Moved before title */}
                          {activeSession?.displayId && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 whitespace-nowrap shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</span>
                              <span className="text-xs font-mono font-bold text-slate-500">{activeSession.displayId}</span>
                            </div>
                          )}

                          {/* Project Title Input/Display - Optimized */}
                          <div className="relative group">
                            {viewMode === 'workbench' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={localTitle}
                                  onChange={(e) => setLocalTitle(e.target.value)}
                                  onBlur={handleTitleBlur}
                                  onKeyDown={handleTitleKeyDown}
                                  className="text-sm font-bold text-slate-800 bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 hover:bg-slate-50 focus:bg-white rounded-lg px-3 py-1.5 outline-none transition-all w-[400px] placeholder:text-slate-400"
                                  placeholder="输入项目名称..."
                                />
                                <Edit3 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            ) : (
                              <h2 className="text-sm font-bold text-slate-800 px-3 py-1.5 select-text cursor-default border border-transparent whitespace-nowrap max-w-[400px] truncate" title={activeSession?.title || "未命名项目"}>
                                {activeSession?.title || "未命名项目"}
                              </h2>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CENTER SECTION: Global Navigation (3 Tabs) */}
                  {(viewMode === 'dashboard' || viewMode === 'history' || viewMode === 'templates') ? (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <nav className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                        <button
                          onClick={() => setViewMode("dashboard")}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "dashboard"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          <Home size={14} /> 创作室
                        </button>
                        <button
                          onClick={() => setViewMode("history")}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "history"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          <History size={14} /> 历史库
                        </button>
                        <button
                          onClick={() => setViewMode("templates")}
                          className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === "templates"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          <BookTemplate size={14} /> 模版间
                        </button>
                      </nav>
                    </div>
                  ) : (
                    /* Placeholder for center alignment if needed in workbench, or keep empty */
                    <div className="absolute left-1/2 -translate-x-1/2"></div>
                  )}

                  {/* RIGHT SECTION: Tools */}
                  <div className="flex items-center gap-3 z-10 w-[300px] justify-end">

                    {viewMode === 'workbench' && (
                      <button
                        onClick={() => setIsHistoryOpen(true)}
                        className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                        title="历史版本"
                      >
                        <History size={18} />
                      </button>
                    )}

                    <button
                      onClick={toggleFullscreen}
                      className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                      title={isFullscreen ? "退出全屏" : "全屏模式"}
                    >
                      {isFullscreen ? <Minimize size={18} /> : <Maximize2 size={18} />}
                    </button>

                    <button
                      onClick={() => setIsGlobalSettingsOpen(true)}
                      className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                      title="全局设置"
                    >
                      <Settings size={18} />
                    </button>

                    {/* 用户组件 */}
                    {/* User Widget */}
                    <UserWidget
                      onAdminClick={() => setViewMode('admin')}
                      onProfileClick={() => setShowProfile(true)}
                      onPointsClick={() => setShowPointsHistory(true)}
                    />
                  </div>
                </div>
              </header>
              <div className="h-16 shrink-0" />
            </>
          )}
          {viewMode === "admin" ? (
            <AdminLayout onBack={() => setViewMode('dashboard')} />
          ) : viewMode === "landing" ? (
            <LandingPage onEnter={() => setViewMode('dashboard')} />
          ) : (
            viewMode !== 'templates' ? (
              <main className="w-full max-w-[1480px] mx-auto px-6 py-6 space-y-8 flex-1">
                {viewMode === "dashboard" && (
                  <Dashboard
                    projects={projects}
                    onCreateProject={handleOpenCreateProjectModal}
                    onOpenProject={handleOpenProject}
                    onTogglePause={handleTogglePause}
                    onDeleteProject={handleDeleteProject}
                    onTogglePin={handleTogglePin}
                    onStartProject={handleStartProjectRequest}
                    onOpenSmartGenerate={() => openOutlineGenerator('', 'dashboard')}
                    // Lifted States
                    searchQuery={dashboardSearchQuery}
                    setSearchQuery={setDashboardSearchQuery}
                    statusFilter={dashboardStatusFilter}
                    setStatusFilter={setDashboardStatusFilter}
                    styleFilter={dashboardFilterStyle}
                    setStyleFilter={setDashboardFilterStyle}
                    ratioFilter={dashboardFilterRatio}
                    setRatioFilter={setDashboardFilterRatio}
                    paletteFilter={dashboardFilterPalette}
                    setPaletteFilter={setDashboardFilterPalette}
                    timeTypeFilter={dashboardTimeType}
                    setTimeTypeFilter={setDashboardTimeType}
                    startDateFilter={dashboardStartDate}
                    setStartDateFilter={setDashboardStartDate}
                    endDateFilter={dashboardEndDate}
                    setEndDateFilter={setDashboardEndDate}
                    timeFilter={dashboardTimeFilter}
                    setTimeFilter={setDashboardTimeFilter}
                    sortBy={dashboardSortBy}
                    setSortBy={setDashboardSortBy}
                    sortOrder={dashboardSortOrder}
                    setSortOrder={setDashboardSortOrder}
                  />
                )}

                {viewMode === "workbench" && (
                  <>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] px-3 py-1 rounded-br-lg font-bold tracking-wide z-10 flex items-center gap-1">
                        <Settings2 size={10} /> 全局设置 (Global Settings)
                      </div>

                      {/* --- Moved Save Preset & Favorites Buttons Here --- */}
                      <div className="absolute top-4 right-6 flex items-center gap-3 z-10">
                        <button
                          onClick={openSavePresetModal}
                          disabled={isPresetSaved}
                          className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all font-medium shadow-sm ${isPresetSaved
                            ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 placeholder-opacity-100" // placeholder-opacity used to ensure class existence? No just use safe fallback
                            } ${!isPresetSaved ? "hover:scale-105 active:scale-95" : ""}`}
                          title={isPresetSaved ? "已保存为模版" : "保存当前配置为模版"}
                        >
                          {isPresetSaved ? <CheckCircle2 size={14} /> : <Save size={14} />} {isPresetSaved ? "已保存" : "保存模版"}
                        </button>

                        <button
                          onClick={() => setViewMode('templates')}
                          className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all font-medium bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200`}
                        >
                          <BookTemplate size={14} /> 模版库
                        </button>
                        <button
                          onClick={() => setIsFavoritesModalOpen(true)}
                          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all font-medium shadow-sm"
                        >
                          <BookTemplate size={14} /> 我的收藏
                        </button>

                        <div className="h-4 w-px bg-slate-100 mx-1"></div>

                        <button
                          onClick={() => {
                            showConfirm(
                              "清空工作台设置",
                              "确定要重置当前的所有设置（及风格参考图）为系统默认状态吗？此操作无法撤销。",
                              () => {
                                setConfig(DEFAULT_STYLE_CONFIG);
                                configRef.current = DEFAULT_STYLE_CONFIG;
                                setStyleMap({
                                  cover: null,
                                  directory: null,
                                  transition: null,
                                  content: null,
                                  end: null,
                                  custom: null,
                                });
                                styleMapRef.current = {
                                  cover: null,
                                  directory: null,
                                  transition: null,
                                  content: null,
                                  end: null,
                                  custom: null,
                                };
                                // 清除预览快照模式
                                setPreviewSnapshot(null);
                                setIsPresetSaved(false);
                                closeConfirm();
                                showToast("工作台设置已重置", "success");
                              },
                              "danger"
                            );
                          }}
                          className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all font-medium shadow-sm"
                          title="清空当前设置，恢复默认"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>

                      {/* Updated Layout: Top Row (Left 1/3, Right 2/3) + Bottom Row */}
                      {/* Updated Layout: Top Row (Left 1/3, Right 2/3) + Bottom Row */}
                      <div className="flex flex-col gap-6 mt-6 min-w-0 w-full">
                        <div className="flex flex-col lg:flex-row gap-6 lg:h-[450px] w-full min-w-0">
                          {/* Left 1/3: Global Style Images - CAROUSEL PREVIEW */}
                          <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group min-w-0">
                            {hasAnyStyle ? (
                              <>
                                {/* Main View Area */}
                                {/* Main View Area */}
                                <div className="flex-1 relative bg-slate-100 w-full min-h-0">
                                  {styleMap[activePreviewType] ? (
                                    <div className="absolute inset-2 flex items-center justify-center">
                                      <img
                                        src={resolveResourceUrl(
                                          styleMap[activePreviewType]!
                                        )}
                                        alt={activePreviewType}
                                        className="w-full h-full object-contain cursor-zoom-in"
                                        onClick={() =>
                                          setLightboxImage(
                                            resolveResourceUrl(
                                              styleMap[activePreviewType]!
                                            )
                                          )
                                        }
                                      />
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 p-4">
                                      <div
                                        onClick={openStyleModal}
                                        className="w-full h-full border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50"
                                      >
                                        <div className="bg-white p-4 rounded-full mb-4 shadow-sm text-rose-500 border border-slate-100">
                                          <Upload size={24} />
                                        </div>
                                        <h4 className="font-bold text-slate-700 mb-1">
                                          上传风格参考图
                                        </h4>
                                        <p className="text-xs text-slate-400 px-4">
                                          支持为封面、目录、正文等不同页面分别设置风格
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Top Label Badge */}
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-white text-xs font-bold shadow-sm">
                                    {
                                      PAGE_TYPES.find(
                                        (p) => p.type === activePreviewType
                                      )?.label
                                    }
                                  </div>

                                  {/* Hover Controls */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <button
                                      onClick={openStyleModal}
                                      disabled={!!previewSnapshot}
                                      className={`pointer-events-auto flex flex-col items-center justify-center gap-1 bg-white hover:bg-rose-50 text-rose-600 w-24 h-12 rounded-lg shadow-lg transition-all ${previewSnapshot ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <span className="text-xs font-bold flex items-center gap-1">
                                        <Upload size={14} /> 管理参考图
                                      </span>
                                    </button>
                                  </div>
                                </div>

                                {/* Bottom Carousel / Tabs */}
                                <div className="h-14 bg-white border-t border-slate-200 flex items-center px-2 gap-2 overflow-x-auto custom-scrollbar shrink-0 w-full">
                                  {PAGE_TYPES.map((pt) => (
                                    <button
                                      key={pt.type}
                                      onClick={() => setActivePreviewType(pt.type)}
                                      className={`flex-1 min-w-[50px] h-10 rounded border transition-all relative overflow-hidden group/thumb
                                                        ${activePreviewType ===
                                          pt.type
                                          ? "border-indigo-500 ring-1 ring-indigo-500"
                                          : "border-slate-200 hover:border-slate-300"
                                        }
                                                    `}
                                      title={pt.label}
                                    >
                                      {styleMap[pt.type] ? (
                                        <img
                                          src={resolveResourceUrl(styleMap[pt.type]!)}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                        </div>
                                      )}
                                      {/* Active Indicator */}
                                      {activePreviewType === pt.type && (
                                        <div className="absolute inset-0 border-2 border-indigo-500 rounded pointer-events-none"></div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 p-4">
                                <div
                                  onClick={openStyleModal}
                                  className="w-full h-full border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center text-center bg-slate-50"
                                >
                                  <div className="bg-white p-4 rounded-full mb-4 shadow-sm text-rose-500 border border-slate-100">
                                    <Upload size={24} />
                                  </div>
                                  <h4 className="font-bold text-slate-700 mb-1">
                                    上传风格参考图
                                  </h4>
                                  <p className="text-xs text-slate-400 px-4">
                                    支持为封面、目录、正文等不同页面分别设置风格
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right 2/3: Controls */}
                          <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-xl p-5 h-full overflow-y-auto custom-scrollbar min-w-0">
                            <StyleControls
                              config={config}
                              onChange={handleConfigChange}
                              readOnly={!!previewSnapshot}
                            />
                          </div>
                        </div>

                        {/* Bottom Row: Requirements (Increased Height) */}
                        <div className="flex flex-col">
                          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <LinkIcon size={14} className="text-slate-500" />{" "}
                            全局设计要求
                          </h3>
                          <div className="relative w-full">
                            <textarea
                              value={config.requirements}
                              onChange={(e) =>
                                handleConfigChange("requirements", e.target.value)
                              }
                              placeholder={`例如：封面使用极简科技风格，主色调为深蓝与白色，标题使用无衬线字体，正文排版清晰，强调商务专业感...`}
                              disabled={!!previewSnapshot}
                              className={`w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all resize-none h-[140px] ${previewSnapshot ? 'opacity-70 cursor-not-allowed' : ''}`}
                            />
                            <button
                              onClick={handleRefineRequirements}
                              disabled={
                                !!previewSnapshot || isRefiningRequirements || !(config.requirements || '').trim()
                              }
                              className={`absolute bottom-3 right-3 p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all shadow-sm
                                        ${!(config.requirements || '').trim()
                                  ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-50"
                                  : isRefiningRequirements
                                    ? "bg-indigo-50 text-indigo-400 cursor-wait"
                                    : "bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 hover:shadow-md"
                                }
                                    `}
                              title="AI 智能修饰设计要求"
                            >
                              {isRefiningRequirements ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Sparkles size={14} />
                              )}
                              {isRefiningRequirements ? "修饰中..." : "AI 修饰"}
                              {!isRefiningRequirements && <PointsBadge actionCode="style_apply" compact showIcon={false} className="ml-1" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                        {/* ... same ... */}
                        <div>
                          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Layers size={22} className="text-slate-700" /> 页面任务列表{" "}
                            <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">
                              {items.length} / {config.targetPageCount} P
                            </span>
                          </h2>
                          <p className="text-sm text-slate-500 mt-1 ml-1">
                            在此添加具体的幻灯片内容素材，每个任务将对应生成一页 PPT
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleAddTextPage}
                            disabled={!!previewSnapshot}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap ${previewSnapshot ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Plus size={14} /> 添加文本页面
                          </button>
                          <button
                            onClick={openImageTaskModal}
                            disabled={!!previewSnapshot}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap ${previewSnapshot ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Plus size={14} /> 添加图片页面
                          </button>
                          <div className="h-5 w-px bg-slate-200 mx-0.5"></div>

                          <button
                            onClick={() => openOutlineGenerator()}
                            disabled={!!previewSnapshot}
                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-lg text-xs font-medium transition-all shadow-md hover:shadow-lg whitespace-nowrap ${previewSnapshot ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="AI 智能生成 PPT 大纲（支持一句话或解析文件）"
                          >
                            <Sparkles size={14} /> 智能生成页面
                          </button>

                          <button
                            onClick={handleGenerateBatch}
                            disabled={!!previewSnapshot || items.length === 0 || isProcessing}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all transform active:scale-95 whitespace-nowrap ${items.length === 0 || isProcessing
                              ? "bg-rose-300 cursor-not-allowed"
                              : "bg-rose-400 hover:bg-rose-500 hover:shadow-rose-100"
                              }`}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={14} className="animate-spin" /> 生成中...
                              </>
                            ) : (
                              <>
                                <Wand2 size={14} /> 批量生成图片 <PointsBadge actionCode="slide_image" compact showIcon={false} className="text-white/80 bg-white/20 px-1.5 rounded-full" />
                              </>
                            )}
                          </button>

                          <div className="relative">
                            <button
                              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                              disabled={
                                items.filter((i) => i.status === "success").length === 0
                              }
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm whitespace-nowrap ${items.filter((i) => i.status === "success").length === 0
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200"
                                }`}
                            >
                              <Download size={14} /> 导出
                            </button>
                            {isExportMenuOpen && (
                              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                  onClick={() => handleBatchExport("zip")}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2"
                                >
                                  <ImageIcon size={14} /> 导出图片 (ZIP)
                                </button>
                                <button
                                  onClick={() => handleBatchExport("pdf")}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 border-t border-slate-100"
                                >
                                  <FileDown size={14} /> 导出 PDF
                                </button>
                                <button
                                  onClick={() => handleBatchExport("pptx")}
                                  className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 flex items-center gap-2 border-t border-slate-100"
                                >
                                  <Presentation size={14} /> 导出 PPTX
                                </button>
                              </div>
                            )}
                            {/* Close export menu when clicking outside - simple implementation via overlay or effect could be added, here relying on toggle */}
                            {isExportMenuOpen && (
                              <div
                                className="fixed inset-0 z-[90] cursor-default"
                                onClick={() => setIsExportMenuOpen(false)}
                              ></div>
                            )}
                          </div>

                          <div className="h-6 w-px bg-slate-200 mx-1"></div>
                          <button
                            onClick={clearWorkbench}
                            disabled={!!previewSnapshot}
                            className={`p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ${previewSnapshot ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="清空列表"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="min-h-[300px]">
                        {items.length === 0 ? (
                          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl h-[400px] flex flex-col items-center justify-center p-8">
                            <div className="bg-white p-4 rounded-full mb-6 shadow-sm border border-slate-100">
                              <LayoutGrid size={32} className="text-slate-300" />
                            </div>
                            <h2 className="text-lg font-medium text-slate-700 mb-2">
                              暂无任务
                            </h2>
                            <p className="text-slate-400 text-sm mb-8">
                              请添加需要生成 PPT 的内容素材 (目标{" "}
                              {config.targetPageCount} 页)
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-5">
                            {items.map((item, index) => (
                              <ResultCard
                                key={item.id}
                                item={item}
                                index={index + 1}
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e)}
                                onDrop={() => handleDrop(index)}
                                onGenerateSingle={() => handleSingleGenerate(item.id)}
                                onRegenerate={() => handleRegenerate(item.id)}
                                onUpdate={(updates) =>
                                  handleUpdateItem(item.id, updates)
                                }
                                onDelete={() => handleDeletePage(item.id)}
                                onDuplicate={() => handleDuplicatePage(item.id)}
                                onViewImage={(url) => setLightboxImage(url)}
                                onRefineContent={handleRefineSlideContent}
                                readOnly={!!previewSnapshot}
                              />
                            ))}

                            {/* Quick Add Card at the end of the grid */}
                            <div
                              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all group min-h-[350px]
                                    ${isFull
                                  ? "border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-70"
                                  : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                }
                                `}
                            >
                              <div
                                className={`p-3 rounded-full mb-2 transition-all ${isFull
                                  ? "bg-slate-100 text-slate-400"
                                  : "bg-white text-indigo-500 shadow-sm group-hover:shadow-md group-hover:scale-110"
                                  }`}
                              >
                                <Plus size={24} />
                              </div>

                              {isFull ? (
                                <div className="text-center">
                                  <span className="font-bold text-slate-500 block mb-1">
                                    页面上限已达
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    已达到全局设置的 {config.targetPageCount} 页
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <span className="font-bold text-slate-700 mb-2">
                                    快速添加页面 (P{items.length + 1})
                                  </span>
                                  <div className="flex gap-3 w-full max-w-xs">
                                    <button
                                      onClick={handleAddTextPage}
                                      className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm font-medium text-slate-600 hover:text-indigo-600"
                                    >
                                      <FileText size={18} /> 文本页面
                                    </button>
                                    <button
                                      onClick={openImageTaskModal}
                                      className="flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all text-sm font-medium text-slate-600 hover:text-blue-600"
                                    >
                                      <ImageIcon size={18} /> 图片页面
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {viewMode === "history" && (
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
                        {/* Derived Data for History Filters */}
                        {(() => {
                          const historyStyleTags = Array.from(new Set(projects.filter(p => p.status === 'completed').map(p => p.globalConfig?.styleName).filter(Boolean))) as string[];
                          const historyPaletteTags = Array.from(new Set(projects.filter(p => p.status === 'completed').map(p => p.globalConfig?.colorPalette).filter(Boolean))) as string[];

                          return (
                            <>
                              <CascadingFilter
                                label="风格"
                                value={historyFilterStyle}
                                active={!!historyFilterStyle}
                                systemOptions={STYLE_PRESETS}
                                customOptions={historyStyleTags.filter(t => !STYLE_PRESETS.includes(t))}
                                onChange={(val) => setHistoryFilterStyle(val)}
                              />
                            </>
                          );
                        })()}
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
                        {(() => {
                          const historyPaletteTags = Array.from(new Set(projects.filter(p => p.status === 'completed').map(p => p.globalConfig?.colorPalette).filter(Boolean))) as string[];

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
                        {/* 规模筛选 */}
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

                        {/* 时间联动筛选 */}
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

                        <div className="flex items-center gap-1.5">
                          <select
                            value={historySortBy}
                            onChange={(e) => setHistorySortBy(e.target.value as any)}
                            className="text-[11px] font-bold border border-slate-200 bg-white text-slate-700 rounded-md py-1.5 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                          >
                            <option value="lastModified">按完成时间</option>
                            <option value="createdAt">按创建时间</option>
                            <option value="pages">按页数</option>
                          </select>
                          <button
                            onClick={() => setHistorySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-indigo-200 transition-all shadow-sm"
                            title={historySortOrder === 'desc' ? "倒序(新在前)" : "正序(旧在前)"}
                          >
                            {historySortOrder === 'desc' ? <ArrowDownNarrowWide size={14} className="text-indigo-500" /> : <ArrowUpNarrowWide size={14} className="text-indigo-500" />}
                          </button>

                          <div className="w-px h-6 bg-slate-100 mx-0.5"></div>

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
                    </div>

                    {/* History List - Horizontal Layout */}
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
                )}

                {/* History Detail View - Updated Layout Match */}
                {viewMode === "history-detail" && activeSession && (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        onClick={() => setViewMode("history")}
                        className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-sm font-medium transition-colors"
                        title="返回历史列表"
                      >
                        <ArrowRight size={16} className="rotate-180" /> 返回列表
                      </button>

                      <div className="h-4 w-px bg-slate-300 mx-2"></div>

                      <h2 className="text-xl font-bold text-slate-800">
                        {activeSession.title}
                      </h2>
                      <span className="text-slate-400 text-sm">
                        ({activeSession.items.length} 页)
                      </span>

                      {/* Restore Button */}
                      <button
                        onClick={() => handleRestoreToEdit(activeSession.id)}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors shadow-sm"
                      >
                        <Edit3 size={14} /> 恢复编辑
                      </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden mb-8">
                      <div className="absolute top-0 left-0 bg-slate-500 text-white text-[10px] px-3 py-1 rounded-br-lg font-bold tracking-wide z-10 flex items-center gap-1">
                        <Settings2 size={10} /> 历史快照
                      </div>

                      <div className="flex flex-col gap-6 mt-6">
                        <div className="flex flex-col lg:flex-row gap-6 lg:h-[450px]">
                          {/* Left 1/3: Images - Single View */}
                          <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group">
                            {activeSession.globalStyleMap?.cover ? (
                              <>
                                <img
                                  src={typeof activeSession.globalStyleMap.cover === 'string'
                                    ? activeSession.globalStyleMap.cover
                                    : URL.createObjectURL(activeSession.globalStyleMap.cover)
                                  }
                                  className="w-full h-full object-contain bg-slate-50"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                  <button
                                    onClick={() =>
                                      setLightboxImage(
                                        typeof activeSession.globalStyleMap?.cover === 'string'
                                          ? activeSession.globalStyleMap.cover
                                          : URL.createObjectURL(activeSession.globalStyleMap?.cover!)
                                      )
                                    }
                                    className="flex flex-col items-center justify-center gap-1 bg-white/90 hover:bg-white text-slate-800 w-16 h-16 rounded-lg backdrop-blur shadow-sm transition-all"
                                  >
                                    <ZoomIn size={24} />
                                    <span className="text-[10px] font-medium">
                                      查看大图
                                    </span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs p-8 text-center flex-col gap-2">
                                <ImageIcon size={32} />
                                <span>无参考图</span>
                              </div>
                            )}
                          </div>

                          {/* Right 2/3: Controls (Read Only) */}
                          <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-xl p-5 h-full overflow-y-auto custom-scrollbar pointer-events-none opacity-90">
                            <StyleControls
                              config={activeSession.globalConfig}
                              onChange={() => { }}
                              readOnly={true}
                            />
                          </div>
                        </div>

                        {/* Bottom: Requirements */}
                        <div className="flex flex-col pointer-events-none opacity-90">
                          <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                            <LinkIcon size={14} className="text-slate-500" />{" "}
                            全局设计要求
                          </h3>
                          <textarea
                            value={activeSession.globalConfig.requirements}
                            readOnly
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none h-[140px]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      {activeSession.items.map((item, index) => (
                        <ResultCard
                          key={item.id}
                          item={item}
                          index={index + 1}
                          onViewImage={(url) => setLightboxImage(url)}
                          readOnly={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </main>
            ) : (
              <main className="flex-1">
                {/* Style Template Manager (Full View) */}
                {viewMode === 'templates' && (
                  <div className="flex-1 bg-slate-50 flex flex-col min-h-screen">
                    <StyleTemplateManager
                      isOpen={true} // Full view mode is always open
                      onClose={() => setViewMode('workbench')}
                      onApplyTemplate={handleApplyTemplate}
                      templates={styleTemplates}
                      activeTemplateId={activeTemplateId || ""}
                      initialEditingTemplateId={editingTemplateId}
                      onClearEditingTemplateId={() => setEditingTemplateId(null)}
                      favorites={favorites}
                      onApplyFavorite={handleApplyPresetRequest}
                      onToggleFavorite={(template) => {
                        const existingFavorite = favorites.find(f => f.templateId === template.id);
                        if (existingFavorite) {
                          removeFavoriteMutation.mutate(existingFavorite.id, {
                            onSuccess: () => showToast('已取消收藏', 'info')
                          });
                        } else {
                          addFavoriteMutation.mutate({
                            templateId: template.id,
                            name: template.name,
                            config: template.config,
                            styleMap: template.styleMap,
                            sampleImages: []
                          }, {
                            onSuccess: () => showToast('已添加到收藏', 'success')
                          });
                        }
                      }}
                      appSettings={appSettings}
                      onShowToast={showToast}
                      // Lifted States
                      searchTerm={templateSearchTerm}
                      setSearchQuery={setTemplateSearchTerm}
                      activeTab={templateCategoryTab}
                      setActiveTab={setTemplateCategoryTab}
                      styleFilter={templateFilterStyle}
                      setStyleFilter={setTemplateFilterStyle}
                      ratioFilter={templateFilterRatio}
                      setRatioFilter={setTemplateFilterRatio}
                      paletteFilter={templateFilterPalette}
                      setPaletteFilter={setTemplateFilterPalette}
                      pageRangeFilter={templateFilterPageRange}
                      setPageRangeFilter={setTemplateFilterPageRange}
                      timeTypeFilter={templateFilterTimeType}
                      setTimeTypeFilter={setTemplateFilterTimeType}
                      startDateFilter={templateFilterStartDate}
                      setStartDateFilter={setTemplateFilterStartDate}
                      endDateFilter={templateFilterEndDate}
                      setEndDateFilter={setTemplateFilterEndDate}
                      timeFilter={templateFilterTime}
                      setTimeFilter={setTemplateFilterTime}
                      sortBy={templateSortBy}
                      setSortBy={setTemplateSortBy as any}
                      sortOrder={templateSortOrder}
                      setSortOrder={setTemplateSortOrder}
                    />
                  </div>
                )}
              </main>
            )
          )}


          {/* Onboarding Guide */}
          {showOnboarding && viewMode !== 'landing' && (
            <OnboardingGuide
              isOpen={showOnboarding}
              onClose={() => setShowOnboarding(false)}
            />
          )}
        </div>

        {/* User Modals */}
        <ProfileCenter isOpen={showProfile} onClose={() => setShowProfile(false)} />
        <PointsHistory isOpen={showPointsHistory} onClose={() => setShowPointsHistory(false)} />

        <StartProjectModal
          isOpen={startProjectModalData.isOpen}
          onClose={() => setStartProjectModalData(prev => ({ ...prev, isOpen: false }))}
          project={startProjectModalData.project}
          pendingItems={startProjectModalData.pendingItems}
          onConfirmBatch={handleConfirmBatchStart}
          onOpenProject={() => {
            if (startProjectModalData.project) {
              handleOpenProject(startProjectModalData.project.id);
            }
            setStartProjectModalData(prev => ({ ...prev, isOpen: false }));
          }}
        />
      </ErrorBoundary >
    </div>
  );
};

export default App;
