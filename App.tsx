import React, { useState, useRef, useEffect, ClipboardEvent } from "react";
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
  FileInput,
  Loader2,
  Flag,
  BookOpen,
  Home,
  LayoutList,
  FileDigit,
  ZoomIn,
  Clock,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Settings,
  BookTemplate,
  Maximize,
  Minimize,
  Download,
  FileDown,
  Presentation,
} from "lucide-react";
import { ImageUploader } from "./components/ImageUploader";
import {
  StyleControls,
  STYLE_PRESETS,
  COLOR_PRESETS,
  RATIO_PRESETS,
} from "./components/StyleControls";
import { ResultCard } from "./components/ResultCard";
import {
  StyleConfig,
  GeneratedSlide,
  StylePreset,
  ProjectSession,
  PageType,
  GlobalStyleMap,
  AppSettings,
} from "./types";
import {
  generateSlideVariant,
  extractTextFromFile,
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
import { StyleTemplateManager } from "./components/StyleTemplateManager";
import { SharedStyleCard } from "./components/SharedStyleCard";
import { StyleTemplate, ProjectStatus } from "./types";

// --- Constants ---
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

const App: React.FC = () => {
  // --- State ---
  const [viewMode, setViewMode] = useState<
    "dashboard" | "workbench" | "history" | "history-detail" | "templates"
  >("dashboard");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Settings with Persistence
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        let parsed;
        try { parsed = JSON.parse(saved); } catch { parsed = {}; }
        if (parsed && typeof parsed === 'object') {
             // Merge with DEFAULT_SETTINGS to ensure all fields exist (deep merge simulation)
            return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            ai: {
                ...DEFAULT_SETTINGS.ai,
                ...(parsed.ai || {}),
                models: {
                ...DEFAULT_SETTINGS.ai.models,
                ...(parsed.ai?.models || {}),
                },
                customCombo:
                parsed.ai?.customCombo || DEFAULT_SETTINGS.ai.customCombo,
            },
            performance: {
                ...DEFAULT_SETTINGS.performance,
                ...(parsed.performance || {}),
            },
            imageGeneration: {
                ...DEFAULT_SETTINGS.imageGeneration,
                ...(parsed.imageGeneration || {}),
            },
            };
        }
      }
    } catch (e) {
      console.warn("Failed to load settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

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

  // Multi-Project State
  const [projects, setProjects] = useState<ProjectSession[]>(() => {
    try {
      const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
              // Sanitize: Ensure items is always an array to prevent Dashboard crashes
              return parsed.map((p: any) => ({
                  ...p,
                  items: Array.isArray(p.items) ? p.items : [],
                  // Ensure other critical fields
                  globalConfig: p.globalConfig || { ...DEFAULT_SETTINGS }, // partial fallback
              }));
          }
      }
    } catch (e) {
      console.warn("Failed to load projects", e);
    }
    return [];
  });

  // --- Effects ---
  useEffect(() => {
    // Sync local storage state on load
    const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (savedProjects) {
        try {
           const parsed = JSON.parse(savedProjects);
           // Defensive check: ensure items is array
           if (parsed && Array.isArray(parsed.items)) {
             setProjects(parsed);
           }
        } catch(e) { console.error("Failed to load projects", e)}
    }

    const savedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (savedTemplates) {
         try {
            const parsed = JSON.parse(savedTemplates);
             if (Array.isArray(parsed)) {
                setStyleTemplates(parsed);
             }
         } catch(e) { console.error("Failed to load templates", e) }
    }

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

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [styleTemplates, setStyleTemplates] = useState<StyleTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (saved) {
          const parsed = JSON.parse(saved);
          return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      console.warn("Failed to load templates", e);
    }
    return [];
  });

  // Track the currently active template ID (defaulting to the first system template or null)
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(() => {
     return localStorage.getItem("bananaslides_active_template_id_v1") || null;
  });
  
  // Persist active template ID
  useEffect(() => {
     if (activeTemplateId) {
         localStorage.setItem("bananaslides_active_template_id_v1", activeTemplateId);
     } else {
         localStorage.removeItem("bananaslides_active_template_id_v1");
     }
  }, [activeTemplateId]);

  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem(ONBOARDING_STORAGE_KEY);
  });

  const [isStyleManagerOpen, setIsStyleManagerOpen] = useState(false);

  // Active project data (migrated from current session state)
  const currentProject = projects.find(p => p.id === currentProjectId);

  // Sync Workbench State with Current Project
  useEffect(() => {
    if (currentProject) {
      setConfig(currentProject.globalConfig);
      setItems(currentProject.items);
      if (currentProject.globalStyleMap) setStyleMap(currentProject.globalStyleMap);
    }
  }, [currentProjectId]);

  // Refs for Auto-Save
  const itemsRef = useRef(items);
  const configRef = useRef(config);
  const styleMapRef = useRef(styleMap);
  const currentProjectIdRef = useRef(currentProjectId);

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

  // History Page State
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyFilterStyle, setHistoryFilterStyle] = useState("");
  const [historyFilterRatio, setHistoryFilterRatio] = useState("");
  const [historyFilterPalette, setHistoryFilterPalette] = useState(""); // New Palette Filter
  const [historyFilterPageCount, setHistoryFilterPageCount] = useState("");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("");
  const [historyFilterTime, setHistoryFilterTime] = useState("");
  const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(
    new Set()
  );

  // Data - Favorites (Presets)
  const [favorites, setFavorites] = useState<StylePreset[]>([]);

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isRefiningRequirements, setIsRefiningRequirements] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isImageTaskModalOpen, setIsImageTaskModalOpen] = useState(false);

  const [isOutlineGeneratorOpen, setIsOutlineGeneratorOpen] = useState(false);
  const [outlineInitialTopic, setOutlineInitialTopic] = useState(""); // Cache for outline
  const [outlineResetKey, setOutlineResetKey] = useState(0); // KEY for force resetting OutlineGenerator

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
    onConfirm: () => {},
  });

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [tempStyleMap, setTempStyleMap] = useState<GlobalStyleMap>({
    ...styleMap,
  });
  const [tempImageFiles, setTempImageFiles] = useState<File[]>([]);

  const outlineFileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null); // For replacing style image

  // --- Effects ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // --- Auto-Save Interval (3 Minutes) ---
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Check if there is data to save
      if (itemsRef.current.length > 0 && currentProjectIdRef.current) {
        console.log(
          "Auto-saving project session...",
          currentProjectIdRef.current
        );
        // We use the setProjects updater directly now
        setProjects(prev => prev.map(p => {
            if (p.id === currentProjectIdRef.current) {
                return {
                    ...p,
                    items: itemsRef.current,
                    globalConfig: configRef.current,
                    globalStyleMap: styleMapRef.current,
                    lastModified: Date.now()
                };
            }
            return p;
        }));
        showToast("已自动保存当前进度", "info");
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(intervalId);
  }, []);

  // --- Helpers ---


  const showToast = (message: string, type: ToastMessage["type"] = "info") => {
    setToast({ id: Date.now().toString(), message, type });
  };

  const getProviderName = (task: "text" | "image" | "vision") => {
    if (
      appSettings.ai.provider === "CustomCombo" &&
      appSettings.ai.customCombo
    ) {
      return "Custom Combo";
    }
    return appSettings.ai.provider;
  };

  const getFavoriteThumbnail = (preset: StylePreset) => {
    // Priority 1: Uploaded Reference Images (Specific Order)
    const map = preset.styleMap;
    if (map) {
      if (map.cover) return URL.createObjectURL(map.cover);
      if (map.directory) return URL.createObjectURL(map.directory);
      if (map.transition) return URL.createObjectURL(map.transition);
      if (map.content) return URL.createObjectURL(map.content);
      if (map.end) return URL.createObjectURL(map.end);
    }
    // Legacy single file support
    if (preset.styleFile) return URL.createObjectURL(preset.styleFile);

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
    if (currentItemsCount === 0 && config.pageStructure.cover > 0)
      return "cover";
    // 2. Directory second
    if (currentItemsCount === 1 && config.pageStructure.directory > 0)
      return "directory";
    // 3. End last (only if we are adding the absolute last allowed page)
    if (
      currentItemsCount === config.targetPageCount - 1 &&
      config.pageStructure.end > 0
    )
      return "end";

    // 4. Check limits for Transition vs Content
    const currentTransitions = items.filter(
      (i) => i.pageType === "transition"
    ).length;
    if (currentTransitions < config.pageStructure.transition) {
      // If we haven't used up transition quota, maybe suggest transition?
      // But usually manual adds are content. Let's default to content unless specific.
    }
    return "content";
  };

  const validateAddPage = (typeToAdd: PageType = "content"): boolean => {
    // 1. Check Total
    if (items.length >= config.targetPageCount) {
      alert(
        `无法添加：当前页面数量 (${items.length}) 已达到全局设定的上限 (${config.targetPageCount})。\n请先在全局设置中增加页面数量。`
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
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsPresetSaved(false);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setAppSettings(newSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
  };

  // --- Outline / Topic Logic ---
  const openOutlineGenerator = (initialText: string = "") => {
    // 1. Check Total Limit before opening
    if (items.length >= config.targetPageCount) {
      alert(
        `当前页面已满 (${items.length}/${config.targetPageCount})，请先清理页面或增加全局页面数量上限。`
      );
      return;
    }
    setOutlineInitialTopic(initialText); // Use passed text or keep existing cache
    setIsOutlineGeneratorOpen(true);
  };

  const handleOutlineFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check limit
    if (items.length >= config.targetPageCount) {
      alert(`当前页面已满，无法导入。`);
      e.target.value = "";
      return;
    }

    setIsReadingFile(true);
    const providerName = getProviderName("vision");
    showToast(`调用 ${providerName} API 识别文件中...`, "loading");

    try {
      const text = await extractTextFromFile(file, appSettings);
      openOutlineGenerator(text);
      showToast(`调用 ${providerName} API 识别成功`, "success");
    } catch (err) {
      console.error("File read error", err);
      showToast(`调用 ${providerName} API 失败`, "error");
      alert("读取文件失败，请重试或直接复制内容。");
    } finally {
      setIsReadingFile(false);
      e.target.value = "";
    }
  };

  const handleOutlineImport = (slides: GeneratedSlide[]) => {
    // Check if importing causes overflow
    if (items.length + slides.length > config.targetPageCount) {
      const allowed = config.targetPageCount - items.length;
      alert(
        `导入部分成功：全局限制为 ${config.targetPageCount} 页，仅导入了前 ${allowed} 页。`
      );
      setItems((prev) => [...prev, ...slides.slice(0, allowed)]);
    } else {
      setItems((prev) => [...prev, ...slides]);
      // Update methods
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectIdRef.current && !p.methods.includes('file')) {
              return { ...p, methods: [...p.methods, 'file'] };
          }
          return p;
      }));
      setTimeout(
        () => showToast(`已成功添加 ${slides.length} 个页面`, "success"),
        100
      );
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
        setCurrentProjectId(null); // Clear project ID
        setViewMode('dashboard'); // Return to dashboard
        closeConfirm();
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
      },
      "danger"
    );
  };

  const handleDuplicatePage = (id: string) => {
    if (items.length >= config.targetPageCount) {
      alert("无法复制：已达到最大页数限制。");
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
    const matchSearch = session.title
      .toLowerCase()
      .includes(historySearchTerm.toLowerCase());
    const matchStyle =
      !historyFilterStyle ||
      session.globalConfig.styleName === historyFilterStyle;
    const matchRatio =
      !historyFilterRatio ||
      session.globalConfig.aspectRatio === historyFilterRatio;
    const matchPalette =
      !historyFilterPalette ||
      session.globalConfig.colorPalette === historyFilterPalette;
    const matchPageCount =
      !historyFilterPageCount ||
      session.globalConfig.targetPageCount.toString() ===
        historyFilterPageCount;
    const matchStatus =
      !historyFilterStatus || session.status === historyFilterStatus;

    let matchTime = true;
    if (historyFilterTime) {
      const now = Date.now();
      const diff = now - session.lastModified;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (historyFilterTime === "24h") matchTime = diff <= ONE_DAY;
      else if (historyFilterTime === "7d") matchTime = diff <= 7 * ONE_DAY;
      else if (historyFilterTime === "30d") matchTime = diff <= 30 * ONE_DAY;
    }

    return (
      matchSearch &&
      matchStyle &&
      matchRatio &&
      matchPalette &&
      matchStatus &&
      matchTime &&
      matchPageCount
    );
  });

  // --- Refinement Handlers ---
  const handleRefineRequirements = async () => {
    if (!config.requirements.trim()) return;
    setIsRefiningRequirements(true);
    try {
      const refined = await smartRefine(
        config.requirements,
        "requirement",
        appSettings
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
      const refined = await smartRefine(text, "content", appSettings);
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
      title: "新页面",
      textContent: "",
      previewUrl: "",
      variants: [],
      variantCount: 2,
      status: "idle",
      createdAt: Date.now(),
    };

    setItems((prev) => [...prev, newItem]);
    // Update methods
    setProjects(prev => prev.map(p => {
        if (p.id === currentProjectIdRef.current && !p.methods.includes('text')) {
            return { ...p, methods: [...p.methods, 'text'] };
        }
        return p;
    }));
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      100
    );
  };

  const confirmImageTasks = () => {
    if (tempImageFiles.length === 0) return;

    const availableSlots = config.targetPageCount - items.length;
    if (availableSlots < tempImageFiles.length) {
      alert(
        `无法全部添加：选择了 ${tempImageFiles.length} 张图片，但剩余空位只有 ${availableSlots} 个。请先调整全局页数。`
      );
      return;
    }

    let currentCount = items.length;
    const newItems: GeneratedSlide[] = tempImageFiles.map((file) => {
      const type = getNextPageType(currentCount);
      currentCount++;
      return {
        id: Math.random().toString(36).substr(2, 9),
        contentType: "image",
        pageType: type,
        originalFile: file,
        previewUrl: URL.createObjectURL(file),
        variants: [],
        variantCount: 2,
        status: "idle",
        createdAt: Date.now(),
      };
    });

    setItems((prev) => [...prev, ...newItems]);
    // Update methods
    setProjects(prev => prev.map(p => {
        if (p.id === currentProjectIdRef.current && !p.methods.includes('image')) {
            return { ...p, methods: [...p.methods, 'image'] };
        }
        return p;
    }));
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

  // 1. Save Preset Logic
  const openSavePresetModal = () => {
    setPresetNameInput(
      `${config.styleName || "新风格"} ${new Date().toLocaleDateString()}`
    );
    setSaveToFavorites(true);
    setSaveToLibrary(true);
    setIsSavePresetModalOpen(true);
  };

  const confirmSavePreset = () => {
    if (!presetNameInput.trim()) return;
    showConfirm("确认保存预设", "确定保存当前配置（含页面规划）吗？", () => {
      // Smart Sample Collection: Sort by type priority (Cover > Directory > ...)
      const typePriority: Record<string, number> = {
        cover: 0,
        directory: 1,
        transition: 2,
        content: 3,
        end: 4,
        custom: 5,
      };
      const sortedItems = items
        .filter((i) => i.status === "success" && i.variants.length > 0)
        .sort(
          (a, b) =>
            (typePriority[a.pageType] || 9) - (typePriority[b.pageType] || 9)
        );

      const samples = sortedItems.slice(0, 4).map((i) => i.variants[0]);

      const newPreset: StylePreset = {
        id: Math.random().toString(36).substr(2, 9),
        name: presetNameInput,
        config: { ...config },
        styleMap: { ...styleMap },
        styleFile: null, // Deprecated
        sampleImages: samples,
        createdAt: Date.now(),
      };

      // Sync to Style Templates Library
      const newTemplate: StyleTemplate = {
        id: `style_${newPreset.id}`,
        name: newPreset.name,
        config: { ...newPreset.config },
        styleMap: { ...newPreset.styleMap },
        isCustom: true,
        createdAt: newPreset.createdAt
      };

      setFavorites((prev) => saveToFavorites ? [...prev, newPreset] : prev);
      setStyleTemplates((prev) => saveToLibrary ? [...prev, newTemplate] : prev);
      
      setIsSavePresetModalOpen(false);
      setIsPresetSaved(true);
      
      const targetMsg = saveToFavorites && saveToLibrary 
        ? "风格已同步至收藏夹与模板库" 
        : saveToFavorites 
          ? "风格已保存至我的收藏夹" 
          : "风格已保存至模板库";
          
      showToast(targetMsg, "success");
      closeConfirm();
    });
  };

  const handleApplyPresetRequest = (preset: StylePreset) => {
    showConfirm("应用预设", "确定覆盖当前设置吗？", () => {
      setConfig({ ...preset.config });
      // Restore style map if available, otherwise clear or use deprecated file
      if (preset.styleMap) {
        setStyleMap(preset.styleMap);
      } else {
        // Legacy support
        setStyleMap({
          cover: preset.styleFile || null,
          directory: preset.styleFile || null,
          transition: preset.styleFile || null,
          content: preset.styleFile || null,
          end: preset.styleFile || null,
          custom: null,
        });
      }
      setIsPresetSaved(true);
      setIsFavoritesModalOpen(false);
      setSelectedPresetForDetail(null);
      closeConfirm();
    });
  };

  const handleApplyTemplate = (template: StyleTemplate) => {
    setConfig({ ...template.config });
    if (template.styleMap) {
      setStyleMap({ ...template.styleMap });
    }
    setActiveTemplateId(template.id);
  };

  const handleToggleFavorite = (template: StyleTemplate) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === template.id);
      if (exists) {
        showToast("已取消收藏", "success");
        return prev.filter((p) => p.id !== template.id);
      } else {
        const newPreset: StylePreset = {
          id: template.id,
          name: template.name || template.config.styleName,
          config: template.config,
          styleMap: template.styleMap,
          createdAt: Date.now(),
        };
        showToast("已添加至收藏夹", "success");
        return [...prev, newPreset];
      }
    });
  };

  const handleUpdatePreset = (updatedPreset: StylePreset) => {
    setFavorites((prev) =>
      prev.map((p) => (p.id === updatedPreset.id ? updatedPreset : p))
    );
    alert("预设更新成功");
    setSelectedPresetForDetail(null);
  };

  const handleDeleteFavoriteRequest = (id: string) => {
    showConfirm(
      "删除预设",
      "确定删除吗？",
      () => {
        setFavorites((prev) => prev.filter((f) => f.id !== id));
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
    
    setProjects(prev => prev.map(p => {
        if (p.id === currentProjectId) {
             const coverItem = items.find((i) => i.pageType === "cover");
             const firstItem = items[0];
             const bestItem = coverItem || firstItem;

             let thumbUrl = p.thumbnailUrl;

             if (bestItem) {
               if (bestItem.variants && bestItem.variants.length > 0) {
                 thumbUrl = bestItem.variants[0];
               } else if (bestItem.previewUrl) {
                 thumbUrl = bestItem.previewUrl;
               }
             }
             
             // Fallback to style reference
             // CRITICAL FIX: explicit check for Blob to prevent crash on restored JSON data
             if ((!thumbUrl || thumbUrl.startsWith('blob:')) && !bestItem && styleMap.cover && styleMap.cover instanceof Blob) {
                 thumbUrl = URL.createObjectURL(styleMap.cover);
             } else if ((!thumbUrl || thumbUrl.startsWith('blob:')) && !bestItem && !styleMap.cover) {
                 // Clean up invalid blob URLs if we can't refresh them
                 thumbUrl = undefined;
             }

             return {
                 ...p,
                 title: items.find(i => i.pageType === 'cover')?.title || p.title,
                 items: [...items],
                 globalConfig: { ...config },
                 globalStyleMap: { ...styleMap },
                 lastModified: Date.now(),
                 thumbnailUrl: thumbUrl,
                 status: items.some(i => i.status === 'generating') ? 'generating' : 
                         (items.length > 0 && items.every(i => i.status === 'success')) ? 'completed' : 
                         items.length === 0 ? 'active' : p.status,
                 meta: {
                    ...p.meta,
                    methods: Array.from(new Set([...(p.meta?.methods || []), config.generationMode === 'text' ? 'text' : 'image'])) as any
                 }
             };
        }
        return p;
    }));
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
          : (item.originalFile as File);
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
      const count = item.variantCount || 2;

      let selectedStyleFile = styleMap[item.pageType];
      if (!selectedStyleFile) selectedStyleFile = styleMap["content"];
      if (!selectedStyleFile) selectedStyleFile = styleMap["cover"];
      if (!selectedStyleFile) {
        const firstKey = Object.keys(styleMap).find(
          (k) => styleMap[k as PageType]
        ) as PageType;
        if (firstKey) selectedStyleFile = styleMap[firstKey];
      }

      const promises = [];
      for (let i = 0; i < count; i++) {
        const label = `Option ${i + 1}`;
        promises.push(
          generateSlideVariant(
            contentSource,
            selectedStyleFile,
            config,
            label,
            item.title,
            appSettings
          )
        );
      }
      const generatedVariants = await Promise.all(promises);
      setItems((prev) =>
        prev.map((res) =>
          res.id === item.id
            ? { ...res, variants: generatedVariants, status: "success" }
            : res
        )
      );
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
    let failureCount = 0;

    for (const item of itemsToProcess) {
      while (activePromises.size >= CONCURRENCY_LIMIT)
        await Promise.race(activePromises);

      const operation = processItem(item).catch(() => {
        failureCount++;
      });
      const effectivePromise: Promise<void> = operation.then(() => {
        activePromises.delete(effectivePromise);
      });
      activePromises.add(effectivePromise);
    }
    await Promise.all(activePromises);

    setIsProcessing(false);
    // Explicitly call save with latest state
    setItems((currentItems) => {
      // Manual sync if needed
      setProjects(prev => prev.map(p => {
          if (p.id === currentProjectIdRef.current) {
              return {
                  ...p,
                  items: [...currentItems],
                  globalConfig: { ...config },
                  globalStyleMap: { ...styleMap },
                  lastModified: Date.now()
              };
          }
          return p;
      }));
      return currentItems;
    });

    if (failureCount > 0) {
      showToast(
        `调用 ${providerName} API 完成，但有 ${failureCount} 张生成失败`,
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
        await processItem(item);
        showToast(`调用 ${providerName} API 服务成功`, "success");
      } catch (e) {
        showToast(`调用 ${providerName} API 失败`, "error");
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
      await processItem(item);
      showToast(`调用 ${providerName} API 服务成功`, "success");
    } catch (e) {
      showToast(`调用 ${providerName} API 失败`, "error");
    }
  };

  // Export Logic
  const handleBatchExport = (type: "zip" | "pdf" | "pptx") => {
    const title = config.styleName || "bananaslides-genai";
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${title}_${timestamp}`;

    showToast("正在准备导出文件...", "loading");

    try {
      if (type === "zip") {
        exportToZip(items, filename);
      } else if (type === "pdf") {
        exportToPdf(items, filename);
      } else if (type === "pptx") {
        exportToPptx(items, filename);
      }
      setIsExportMenuOpen(false);
      showToast("导出成功开始下载", "success");
    } catch (e) {
      console.error(e);
      showToast("导出失败，请重试", "error");
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
  };

  // Helper for updates
  const handleUpdateItem = (id: string, updates: Partial<GeneratedSlide>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
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
      alert("剪贴板中没有图片");
    } catch (e) {
      console.error(e);
      alert("无法读取剪贴板，请尝试 Ctrl+V");
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
        alert("剪贴板中没有图片");
      }
    } catch (e) {
      console.error(e);
      alert("无法读取剪贴板，请尝试 Ctrl+V");
    }
  };

  const handleBatchDeleteHistory = () => {
    if (selectedHistoryIds.size === 0) return;
    showConfirm(
      "批量删除",
      `确定删除选中的 ${selectedHistoryIds.size} 个项目吗？`,
      () => {
        setProjects((prev) =>
          prev.filter((s) => !selectedHistoryIds.has(s.id))
        );
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
        setProjects((prev) => prev.filter((s) => s.id !== id));
        if (currentProjectId === id) {
          setCurrentProjectId(null);
          setViewMode("history");
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
      } else if ((session as any).globalStyleFiles) {
        // Backward compatibility logic
        const f = (session as any).globalStyleFiles[0];
        setStyleMap({
          cover: f,
          directory: f,
          transition: f,
          content: f,
          end: f,
          custom: null,
        });
      }
      setCurrentProjectId(session.id);
      setViewMode("workbench");
      closeConfirm();
    });
  };

  // --- PROJECT ACTIONS ---
  const handleCreateProject = (titleInput: any = "未命名项目") => {
    // Detect if input is an event (common when binding directly to onClick)
    const title = (typeof titleInput === 'string' && titleInput.length > 0) 
      ? titleInput 
      : "未命名项目";

    const newProject: ProjectSession = {
      id: `proj_${Date.now()}`,
      title,
      lastModified: Date.now(),
      createdAt: Date.now(),
      status: 'idle',
      items: [],
      progress: 0,
      methods: ['one-sentence'],
      globalConfig: { 
        ...config, 
        // Only overwrite styleName if it's empty, otherwise keep the template's styleName
        styleName: config.styleName && config.styleName.trim().length > 0 ? config.styleName : title 
      },
      globalStyleMap: { ...styleMap }, // Persist the current style map (images)
      isPinned: false
    };
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    setViewMode('workbench');
    showToast("项目创建成功", "success");
  };

  const handleOpenProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    // Defense: Sanitize items to remove invalid File objects from JSON restore
    const sanitizedItems = (Array.isArray(project.items) ? project.items : [])
        .filter(item => item && typeof item === 'object')
        .map(item => ({
        ...item,
        originalFile: (item.originalFile && item.originalFile instanceof Blob) ? item.originalFile : null
    }));

    setItems(sanitizedItems);
    setConfig(project.globalConfig);
    
    // Defense: Sanitize Style Map
    if (project.globalStyleMap) {
        const safeMap = { ...project.globalStyleMap };
        (Object.keys(safeMap) as PageType[]).forEach(key => {
            if (safeMap[key] && !(safeMap[key] instanceof Blob)) {
                safeMap[key] = null;
            }
        });
        setStyleMap(safeMap);
    } else if (project.globalStyleFiles) {
         // Compat
         // ... existing ... but make sure it is blob
         const f = project.globalStyleFiles[0];
         if (f && f instanceof Blob) {
             setStyleMap({ cover: f, directory: f, transition: f, content: f, end: f, custom: null });
         } else {
             setStyleMap({ cover: null, directory: null, transition: null, content: null, end: null, custom: null });
         }
    }

    setCurrentProjectId(id);
    
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
         setProjects(prev => prev.map(p => {
             if (p.id === id) {
                 return { ...p, status: 'active', lastModified: Date.now() };
             }
             return p;
         }));
         // Set View to Workbench
         setCurrentProjectId(id);
         setViewMode('workbench');
         closeConfirm();
         showToast("项目已恢复编辑状态", "success");
      },
      "info"
    );
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
    showToast("项目已删除", "success");
  };

  const handleTogglePin = (id: string) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, isPinned: !p.isPinned } : p
    ));
  };

  const handleTogglePause = (id: string) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, status: p.status === 'generating' ? 'paused' : 'generating' } : p
    ));
  };

  // --- AUTO-SAVE LOGIC ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProjectIdRef.current) {
        setProjects(prev => prev.map(p => {
          if (p.id === currentProjectIdRef.current) {
            // Only update if there are actual items or config changes
            return {
              ...p,
              items: itemsRef.current,
              globalConfig: configRef.current,
              globalStyleMap: styleMapRef.current,
              lastModified: Date.now(),
              // Recalculate progress
              progress: itemsRef.current.length > 0 
                ? Math.round((itemsRef.current.filter(i => i.status === 'success').length / itemsRef.current.length) * 100)
                : 0
            };
          }
          return p;
        }));
        console.log("项目自动保存已触发 (3分钟间隔)");
      }
    }, 180000); // 3 minutes

    return () => clearInterval(interval);
  }, []);

  // Global persistence for everything
  useEffect(() => {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(styleTemplates));
  }, [styleTemplates]);

  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "completed");
  }, [showOnboarding === false]);

  const toggleHistorySelection = (id: string) => {
    const newSet = new Set(selectedHistoryIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedHistoryIds(newSet);
  };

  const activeSession = projects.find((s) => s.id === currentProjectId);
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
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
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Global Settings Modal */}
      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        currentSettings={appSettings}
        onSave={handleSaveSettings}
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

      {/* Favorite Detail Modal - Increased Z-Index to appear over the Favorites List */}
      {selectedPresetForDetail && (
        <Modal
          isOpen={!!selectedPresetForDetail}
          onClose={() => setSelectedPresetForDetail(null)}
          title="风格详情"
          maxWidth="max-w-4xl"
          zIndex="z-[110]"
          footer={
            <div className="flex gap-2 w-full justify-end">
              <button
                onClick={() => setSelectedPresetForDetail(null)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                关闭
              </button>
              <button
                onClick={() =>
                  handleApplyPresetRequest(selectedPresetForDetail)
                }
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
              >
                应用此风格
              </button>
            </div>
          }
        >
          {/* Content remains the same */}
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:h-[340px]">
              {/* Left: Images */}
              <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group">
                {selectedPresetForDetail.styleMap?.cover ||
                selectedPresetForDetail.styleFile ? (
                  <>
                    <img
                      src={
                        (selectedPresetForDetail.styleMap?.cover instanceof Blob) ? 
                        URL.createObjectURL(selectedPresetForDetail.styleMap.cover) :
                        (selectedPresetForDetail.styleFile instanceof Blob) ?
                        URL.createObjectURL(selectedPresetForDetail.styleFile) : ''
                      }
                      className="w-full h-full object-contain bg-slate-50"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() =>
                          setLightboxImage(
                            (selectedPresetForDetail.styleMap?.cover instanceof Blob) ?
                             URL.createObjectURL(selectedPresetForDetail.styleMap.cover) :
                            (selectedPresetForDetail.styleFile instanceof Blob) ?
                             URL.createObjectURL(selectedPresetForDetail.styleFile) : undefined
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

              {/* Right: Controls (Read Only) */}
              <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-xl p-5 h-full overflow-hidden pointer-events-none opacity-90">
                <StyleControls
                  config={selectedPresetForDetail.config}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            </div>
            {/* Requirements */}
            <div className="flex flex-col pointer-events-none opacity-90">
              <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <LinkIcon size={14} className="text-slate-500" /> 全局设计要求
              </h3>
              <textarea
                value={selectedPresetForDetail.config.requirements}
                readOnly
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none h-[100px]"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Save Preset Modal */}
      <Modal
        isOpen={isSavePresetModalOpen}
        onClose={() => setIsSavePresetModalOpen(false)}
        title="保存风格预设"
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
              className={`px-6 py-2 rounded-lg text-white transition-all ${
                (!saveToFavorites && !saveToLibrary)
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
            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none"
            placeholder="例如：科技蓝商务风格 10P"
            autoFocus
          />
          
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={saveToFavorites}
                onChange={(e) => setSaveToFavorites(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-700 block">保存到我的收藏夹</span>
                <span className="text-[10px] text-slate-400">仅限当前项目级快速访问</span>
              </div>
              <Heart size={16} className={saveToFavorites ? "text-rose-500" : "text-slate-300"} />
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
              <input 
                type="checkbox" 
                checked={saveToLibrary}
                onChange={(e) => setSaveToLibrary(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-700 block">保存到风格模板库</span>
                <span className="text-[10px] text-slate-400">跨项目全局复用素材</span>
              </div>
              <BookTemplate size={16} className={saveToLibrary ? "text-indigo-500" : "text-slate-300"} />
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
        title="我的风格收藏夹"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-between items-center w-full px-1">
            <span className="text-xs text-slate-500 font-medium">
              共找到 {filteredFavorites.length} 个预设
            </span>
          </div>
        }
      >
        {/* Favorites list content remains same */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="搜索预设..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={filterStyle}
                onChange={(e) => setFilterStyle(e.target.value)}
                className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">所有风格</option>
                {STYLE_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={filterRatio}
                onChange={(e) => setFilterRatio(e.target.value)}
                className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">所有比例</option>
                {RATIO_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                value={filterPalette}
                onChange={(e) => setFilterPalette(e.target.value)}
                className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none max-w-[100px]"
              >
                <option value="">所有配色</option>
                {COLOR_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="页数"
                value={filterPageCount}
                onChange={(e) => setFilterPageCount(e.target.value)}
                className="w-16 text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-center"
              />
              <select
                value={filterTime}
                onChange={(e) => setFilterTime(e.target.value)}
                className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
              >
                <option value="">所有时间</option>
                <option value="24h">24小时内</option>
                <option value="7d">7天内</option>
                <option value="30d">30天内</option>
              </select>
            </div>
          </div>
          {filteredFavorites.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Heart size={48} className="mx-auto mb-3 text-slate-200" />
              <p>没有找到匹配的风格预设</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredFavorites.map((fav) => (
                <SharedStyleCard 
                  key={fav.id}
                  item={fav}
                  onDetail={() => setSelectedPresetForDetail(fav)}
                  onApply={() => handleApplyPresetRequest(fav)}
                  onDelete={() => handleDeleteFavoriteRequest(fav.id)}
                  variant="favorites"
                />
              ))}
            </div>
          )}
        </div>
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
              onClick={() => {
                setStyleMap(tempStyleMap);
                setIsStyleModalOpen(false);
                setIsPresetSaved(false);
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
                        ? [tempStyleMap[pt.type] as File]
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
              className={`flex-1 py-2 rounded-lg font-medium shadow-sm transition-all ${
                tempImageFiles.length === 0
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
              onRemoveFile={() => {}}
              label={
                tempImageFiles.length > 0 ? "继续添加图片" : "点击选择图片"
              }
              multiple={true}
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
                      src={URL.createObjectURL(file)}
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans selection:bg-rose-100 selection:text-rose-600 flex flex-col">
    
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => setViewMode('dashboard')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
                <Wand2 className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">BananaSlides</h1>
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-1 block">Gen-AI PPT</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setViewMode("dashboard")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "dashboard"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Home size={14} /> 仪表盘
              </button>
              <button
                onClick={() => setViewMode("history")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "history" || viewMode === "history-detail"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <History size={14} /> 历史库
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {viewMode === "workbench" && (
              <button
                onClick={() => setViewMode("dashboard")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <ArrowLeft size={14} /> 返回主页
              </button>
            )}
            <button
               onClick={() => setViewMode('templates')}
               className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-slate-200/50"
            >
              <BookTemplate size={14} /> 风格模板库
            </button>
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <button
               onClick={toggleFullscreen}
               className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
               title={isFullscreen ? "退出全屏" : "全屏模式"}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              onClick={() => setIsGlobalSettingsOpen(true)}
              className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
              title="全局设置"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {viewMode !== 'templates' && (
      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-8 flex-1">
        {viewMode === "dashboard" && (
          <Dashboard
            projects={projects}
            onCreateProject={handleCreateProject}
            onOpenProject={handleOpenProject}
            onTogglePause={handleTogglePause}
            onDeleteProject={handleDeleteProject}
            onTogglePin={handleTogglePin}
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
                  onClick={() => setViewMode('templates')}
                  disabled={isPresetSaved}
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all font-medium ${
                    isPresetSaved
                      ? "bg-green-50 text-green-600 border-green-200 cursor-default"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                  }`}
                >
                  <BookTemplate size={14} /> 风格库
                </button>
                <button
                  onClick={() => setIsFavoritesModalOpen(true)}
                  className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all font-medium shadow-sm"
                >
                  <BookTemplate size={14} /> 收藏夹
                </button>
              </div>

              {/* Updated Layout: Top Row (Left 1/3, Right 2/3) + Bottom Row */}
              {/* Updated Layout: Top Row (Left 1/3, Right 2/3) + Bottom Row */}
              <div className="flex flex-col gap-6 mt-6 min-w-0 w-full">
                <div className="flex flex-col lg:flex-row gap-6 lg:h-[340px] w-full min-w-0">
                  {/* Left 1/3: Global Style Images - CAROUSEL PREVIEW */}
                  <div className="w-full lg:flex-1 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group min-w-0">
                    {hasAnyStyle ? (
                      <>
                        {/* Main View Area */}
                        {/* Main View Area */}
                        <div className="flex-1 relative bg-slate-100 w-full min-h-0">
                          {styleMap[activePreviewType] ? (
                            <div className="absolute inset-2 flex items-center justify-center">
                              <img
                                src={URL.createObjectURL(
                                  styleMap[activePreviewType]!
                                )}
                                alt={activePreviewType}
                                className="w-full h-full object-contain cursor-zoom-in"
                                onClick={() =>
                                  setLightboxImage(
                                    URL.createObjectURL(
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
                              className="pointer-events-auto flex flex-col items-center justify-center gap-1 bg-white hover:bg-rose-50 text-rose-600 w-24 h-12 rounded-lg shadow-lg transition-all"
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
                                                        ${
                                                          activePreviewType ===
                                                          pt.type
                                                            ? "border-indigo-500 ring-1 ring-indigo-500"
                                                            : "border-slate-200 hover:border-slate-300"
                                                        }
                                                    `}
                              title={pt.label}
                            >
                              {styleMap[pt.type] ? (
                                <img
                                  src={URL.createObjectURL(styleMap[pt.type]!)}
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
                  <div className="w-full lg:flex-[2] bg-white border border-slate-200 rounded-xl p-5 h-full overflow-hidden min-w-0">
                    <StyleControls
                      config={config}
                      onChange={handleConfigChange}
                      readOnly={false}
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
                      placeholder={`在此输入详细的排版、字体或布局要求...`}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all resize-none h-[140px]"
                    />
                    <button
                      onClick={handleRefineRequirements}
                      disabled={
                        isRefiningRequirements || !config.requirements.trim()
                      }
                      className={`absolute bottom-3 right-3 p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all shadow-sm
                                        ${
                                          !config.requirements.trim()
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
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap"
                    >
                      <Plus size={14} /> 添加文本
                    </button>
                    <button
                      onClick={openImageTaskModal}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap"
                    >
                      <Plus size={14} /> 添加图片
                    </button>
                    <div className="h-5 w-px bg-slate-200 mx-0.5"></div>

                    <button
                      onClick={() => openOutlineGenerator()}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 rounded-lg text-xs font-medium transition-all shadow-sm whitespace-nowrap"
                    >
                      <Sparkles size={14} /> 一句话生成
                    </button>
                    <button
                      onClick={() => outlineFileInputRef.current?.click()}
                      disabled={isReadingFile}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300 rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                    >
                      {isReadingFile ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileInput size={14} />
                      )}{" "}
                      {isReadingFile ? "解析中..." : "解析文件生成"}
                    </button>

                    <input
                      type="file"
                      ref={outlineFileInputRef}
                      onChange={handleOutlineFileSelect}
                      accept=".txt,.md,.json,.pdf,.doc,.docx"
                      className="hidden"
                    />

                    <button
                      onClick={handleGenerateBatch}
                      disabled={items.length === 0 || isProcessing}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all transform active:scale-95 whitespace-nowrap ${
                        items.length === 0 || isProcessing
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
                          <Wand2 size={14} /> 批量生成图片
                        </>
                      )}
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        disabled={
                          items.filter((i) => i.status === "success").length === 0
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm whitespace-nowrap ${
                          items.filter((i) => i.status === "success").length === 0
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
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                      />
                    ))}

                    {/* Quick Add Card at the end of the grid */}
                    <div
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all group min-h-[350px]
                                    ${
                                      isFull
                                        ? "border-slate-200 bg-slate-50/50 cursor-not-allowed opacity-70"
                                        : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                                    }
                                `}
                    >
                      <div
                        className={`p-3 rounded-full mb-2 transition-all ${
                          isFull
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
          <div className="min-h-[500px] flex flex-col">
            {/* ... (History view remains same) ... */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              {/* Search */}
              <div className="flex-1 w-full lg:w-auto relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="搜索项目标题..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-2 mt-2 lg:mt-0">
                <select
                  value={historyFilterStyle}
                  onChange={(e) => setHistoryFilterStyle(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="">所有风格</option>
                  {STYLE_PRESETS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={historyFilterRatio}
                  onChange={(e) => setHistoryFilterRatio(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="">所有比例</option>
                  {RATIO_PRESETS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  value={historyFilterPalette}
                  onChange={(e) => setHistoryFilterPalette(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none max-w-[100px]"
                >
                  <option value="">所有配色</option>
                  {COLOR_PRESETS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="页数"
                  value={historyFilterPageCount}
                  onChange={(e) => setHistoryFilterPageCount(e.target.value)}
                  className="w-16 text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-center"
                />
                <select
                  value={historyFilterStatus}
                  onChange={(e) => setHistoryFilterStatus(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="">所有状态</option>
                  <option value="completed">已完成</option>
                  <option value="generating">生成中</option>
                </select>
                <select
                  value={historyFilterTime}
                  onChange={(e) => setHistoryFilterTime(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none"
                >
                  <option value="">所有时间</option>
                  <option value="24h">24小时内</option>
                  <option value="7d">7天内</option>
                  <option value="30d">30天内</option>
                </select>
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
                  <div
                    key={session.id}
                    className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col md:flex-row gap-6 transition-all hover:shadow-md group relative ${
                      isHistorySelectionMode &&
                      selectedHistoryIds.has(session.id)
                        ? "ring-2 ring-indigo-500 border-indigo-500"
                        : "border-slate-200"
                    }`}
                    onClick={() => {
                      if (isHistorySelectionMode)
                        toggleHistorySelection(session.id);
                    }}
                  >
                    {/* Cover Thumbnail */}
                    <div
                      className="w-full md:w-64 aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0 relative cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (session.thumbnailUrl)
                          setLightboxImage(session.thumbnailUrl);
                      }}
                    >
                      {session.thumbnailUrl ? (
                        <img
                          src={session.thumbnailUrl}
                          className="w-full h-full object-contain bg-slate-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon size={32} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm pointer-events-none">
                        P{session.pageCount}
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
                        <ZoomIn
                          className="text-white drop-shadow-md"
                          size={24}
                        />
                      </div>
                    </div>

                    {/* Content Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1">
                            {session.title}
                          </h3>
                          {!isHistorySelectionMode && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProject(session.id);
                                }}
                                className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
                              >
                                打开项目
                              </button>
                              <div className="h-4 w-px bg-slate-200 mx-1"></div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(session.id);
                                }}
                                className="text-sm text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="删除"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">
                            {session.globalConfig.styleName || "默认风格"}
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">
                            {session.globalConfig.aspectRatio}
                          </span>
                          <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">
                            {session.globalConfig.pageStructure.content} 内容页
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 border-t border-slate-50 pt-3">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} /> 创建于{" "}
                          {new Date(session.lastModified).toLocaleString()}
                        </div>
                        <div>ID: {session.id.substring(0, 8)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Count Footer */}
            <div className="py-4 border-t border-slate-200 text-center text-xs text-slate-400">
              共筛选出 {filteredHistory.length} 个项目
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
                <div className="flex flex-col lg:flex-row gap-6 lg:h-[340px]">
                  {/* Left 1/3: Images - Single View */}
                  <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group">
                    {activeSession.globalStyleMap?.cover ? (
                      <>
                        <img
                          src={URL.createObjectURL(
                            activeSession.globalStyleMap.cover
                          )}
                          className="w-full h-full object-contain bg-slate-50"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() =>
                              setLightboxImage(
                                URL.createObjectURL(
                                    activeSession.globalStyleMap?.cover!
                                )
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
                  <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-xl p-5 h-full overflow-hidden pointer-events-none opacity-90">
                    <StyleControls
                      config={activeSession.globalConfig}
                      onChange={() => {}}
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
      )}

      {/* Style Template Manager (Full View) */}
      {viewMode === 'templates' && (
        <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col h-[calc(100vh-64px)]">
           <StyleTemplateManager
             isOpen={true} // Always open when in this view
             onClose={() => setViewMode('workbench')} // Return to workbench on close
             onApplyTemplate={(template) => {
               handleApplyTemplate(template);
             }}
             templates={styleTemplates}
             onUpdateTemplates={setStyleTemplates}
             activeTemplateId={activeTemplateId}
             favorites={favorites}
             onApplyFavorite={handleApplyPresetRequest}
             onDeleteFavorite={handleDeleteFavoriteRequest}
             onToggleFavorite={handleToggleFavorite}
             appSettings={appSettings}
             onShowToast={showToast}
           />
        </div>
      )}


      {/* Onboarding Guide */}
      <OnboardingGuide
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
    </ErrorBoundary>
    </div>
  );
};

export default App;
