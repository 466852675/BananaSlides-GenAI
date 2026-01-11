
import React, { useState, useRef, useEffect, ClipboardEvent } from 'react';
import { Wand2, LayoutGrid, History, Trash2, FileText, Image as ImageIcon, Link as LinkIcon, X, Upload, Clipboard, Plus, Settings2, Layers, Heart, ArrowRight, Eye, RefreshCcw, Calendar, Search, Filter, Save, CheckCircle2, AlertTriangle, Edit3, MoreHorizontal, Check, ListChecks, Sparkles, FileInput, Loader2, Flag, BookOpen, Home, LayoutList, FileDigit, ZoomIn, Clock, ChevronLeft, ChevronRight, CornerDownRight, Settings } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { StyleControls, STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from './components/StyleControls';
import { ResultCard } from './components/ResultCard';
import { StyleConfig, GeneratedSlide, StylePreset, ProjectSession, PageType, GlobalStyleMap, AppSettings } from './types';
import { generateSlideVariant, extractTextFromFile } from './services/geminiService';
import { ConfirmDialog } from './components/ConfirmDialog';
import { OutlineGenerator } from './components/OutlineGenerator';
import { GlobalSettingsModal, DEFAULT_SETTINGS } from './components/GlobalSettingsModal';

// --- Modal Component ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'lightbox';
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, variant = 'default', maxWidth = 'max-w-2xl' }) => {
  if (!isOpen) return null;

  if (variant === 'lightbox') {
      return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
              <div className="relative max-w-7xl max-h-screen w-full h-full flex flex-col items-center justify-center">
                  <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all z-50"
                  >
                      <X size={32} />
                  </button>
                  <div className="w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                       {children}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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

const App: React.FC = () => {
  // --- State ---
  const [viewMode, setViewMode] = useState<'workbench' | 'history' | 'history-detail'>('workbench');
  
  // Settings
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Data - Work Bench
  // Changed from File[] to Map
  const [styleMap, setStyleMap] = useState<GlobalStyleMap>({
      cover: null,
      directory: null,
      transition: null,
      content: null,
      end: null,
      custom: null
  });

  const [activePreviewType, setActivePreviewType] = useState<PageType>('cover');

  const [config, setConfig] = useState<StyleConfig>({
    styleName: '',
    colorPalette: '',
    requirements: '',
    aspectRatio: '16:9',
    targetPageCount: 10, // Default 10
    pageStructure: {
        cover: 1,
        directory: 1,
        transition: 0,
        content: 7, // 10 - 1 - 1 - 1
        end: 1
    }
  });
  const [isPresetSaved, setIsPresetSaved] = useState(false); 
  
  const [items, setItems] = useState<GeneratedSlide[]>([]);

  // Data - History (Sessions)
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // History Page State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterStyle, setHistoryFilterStyle] = useState('');
  const [historyFilterRatio, setHistoryFilterRatio] = useState('');
  const [historyFilterPageCount, setHistoryFilterPageCount] = useState(''); // New filter
  const [historyFilterStatus, setHistoryFilterStatus] = useState('');
  const [historyFilterTime, setHistoryFilterTime] = useState('');
  const [isHistorySelectionMode, setIsHistorySelectionMode] = useState(false);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  // Data - Favorites (Presets)
  const [favorites, setFavorites] = useState<StylePreset[]>([]);

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false); 
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [isImageTaskModalOpen, setIsImageTaskModalOpen] = useState(false);
  
  const [isOutlineGeneratorOpen, setIsOutlineGeneratorOpen] = useState(false);
  const [outlineInitialTopic, setOutlineInitialTopic] = useState(''); // Cache for outline
  const [outlineResetKey, setOutlineResetKey] = useState(0); // KEY for force resetting OutlineGenerator
  
  // Favorites UI State
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  
  // Favorites Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterRatio, setFilterRatio] = useState('');
  const [filterPageCount, setFilterPageCount] = useState('');
  const [filterTime, setFilterTime] = useState(''); // Added
  
  const [selectedPresetForDetail, setSelectedPresetForDetail] = useState<StylePreset | null>(null);

  const [confirmation, setConfirmation] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      type: 'danger' | 'info';
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'info', onConfirm: () => {} });
  
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [tempStyleMap, setTempStyleMap] = useState<GlobalStyleMap>({...styleMap});
  const [tempImageFiles, setTempImageFiles] = useState<File[]>([]);

  const outlineFileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null); // For replacing style image

  // --- Logic for Page Types Limits & Assignment ---
  
  const getNextPageType = (currentItemsCount: number): PageType => {
      // Logic to assign type based on sequence: Cover -> Directory -> ... -> End
      // This is a heuristic for adding single pages manually.
      // 1. Cover first
      if (currentItemsCount === 0 && config.pageStructure.cover > 0) return 'cover';
      // 2. Directory second
      if (currentItemsCount === 1 && config.pageStructure.directory > 0) return 'directory';
      // 3. End last (only if we are adding the absolute last allowed page)
      if (currentItemsCount === config.targetPageCount - 1 && config.pageStructure.end > 0) return 'end';
      
      // 4. Check limits for Transition vs Content
      const currentTransitions = items.filter(i => i.pageType === 'transition').length;
      if (currentTransitions < config.pageStructure.transition) {
          // If we haven't used up transition quota, maybe suggest transition? 
          // But usually manual adds are content. Let's default to content unless specific.
      }
      return 'content';
  };

  const validateAddPage = (typeToAdd: PageType = 'content'): boolean => {
      // 1. Check Total
      if (items.length >= config.targetPageCount) {
          alert(`无法添加：当前页面数量 (${items.length}) 已达到全局设定的上限 (${config.targetPageCount})。\n请先在全局设置中增加页面数量。`);
          return false;
      }
      return true;
  };

  // --- Helpers ---
  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' = 'info') => {
      setConfirmation({ isOpen: true, title, message, onConfirm, type });
  };

  const closeConfirm = () => {
      setConfirmation(prev => ({ ...prev, isOpen: false }));
  };

  const handleConfigChange = (key: keyof StyleConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsPresetSaved(false); 
  };

  // --- Outline / Topic Logic ---
  const openOutlineGenerator = (initialText: string = '') => {
      // 1. Check Total Limit before opening
      if (items.length >= config.targetPageCount) {
          alert(`当前页面已满 (${items.length}/${config.targetPageCount})，请先清理页面或增加全局页面数量上限。`);
          return;
      }
      setOutlineInitialTopic(initialText); // Use passed text or keep existing cache
      setIsOutlineGeneratorOpen(true);
  };

  const handleOutlineFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      // Check limit
      if (items.length >= config.targetPageCount) {
          alert(`当前页面已满，无法导入。`);
          e.target.value = '';
          return;
      }

      setIsReadingFile(true);
      try {
          const text = await extractTextFromFile(file);
          openOutlineGenerator(text);
      } catch (err) {
          console.error("File read error", err);
          alert("读取文件失败，请重试或直接复制内容。");
      } finally {
          setIsReadingFile(false);
          e.target.value = ''; 
      }
  };

  const handleOutlineImport = (slides: GeneratedSlide[]) => {
      // Check if importing causes overflow
      if (items.length + slides.length > config.targetPageCount) {
          const allowed = config.targetPageCount - items.length;
          alert(`导入部分成功：全局限制为 ${config.targetPageCount} 页，仅导入了前 ${allowed} 页。`);
          setItems(prev => [...prev, ...slides.slice(0, allowed)]);
      } else {
          setItems(prev => [...prev, ...slides]);
          setTimeout(() => alert(`✅ 已成功添加 ${slides.length} 个页面到工作台`), 100);
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
              setOutlineInitialTopic(''); // Clear cache
              setOutlineResetKey(prev => prev + 1); // Increment key to force re-mount
              closeConfirm();
              setTimeout(() => alert("✅ 工作台已清空"), 100);
          },
          'danger'
      );
  };

  const handleDeletePage = (id: string) => {
      showConfirm(
          "删除页面任务",
          "确定要删除此页面任务吗？",
          () => {
              setItems(prev => prev.filter(i => i.id !== id));
              closeConfirm();
          },
          'danger'
      );
  };

  const handleDuplicatePage = (id: string) => {
      if (items.length >= config.targetPageCount) {
          alert("无法复制：已达到最大页数限制。");
          return;
      }
      const itemToClone = items.find(i => i.id === id);
      if (!itemToClone) return;

      const newItem: GeneratedSlide = {
          ...itemToClone,
          id: Math.random().toString(36).substr(2, 9),
          title: itemToClone.title ? `${itemToClone.title} (副本)` : undefined,
          status: 'idle',
          variants: [],
          createdAt: Date.now()
      };

      setItems(prev => [...prev, newItem]);
  };

  // --- Favorites Logic ---
  const filteredFavorites = favorites.filter(fav => {
      const matchSearch = fav.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStyle = !filterStyle || fav.config.styleName === filterStyle;
      const matchRatio = !filterRatio || fav.config.aspectRatio === filterRatio;
      const matchPageCount = !filterPageCount || fav.config.targetPageCount.toString() === filterPageCount;
      
      let matchTime = true;
      if (filterTime) {
          const now = Date.now();
          const diff = now - fav.createdAt;
          const ONE_DAY = 24 * 60 * 60 * 1000;
          if (filterTime === '24h') matchTime = diff <= ONE_DAY;
          else if (filterTime === '7d') matchTime = diff <= 7 * ONE_DAY;
          else if (filterTime === '30d') matchTime = diff <= 30 * ONE_DAY;
      }

      return matchSearch && matchStyle && matchRatio && matchPageCount && matchTime;
  });

  // --- History Logic ---
  const filteredHistory = sessions.filter(session => {
      const matchSearch = session.title.toLowerCase().includes(historySearchTerm.toLowerCase());
      const matchStyle = !historyFilterStyle || session.globalConfig.styleName === historyFilterStyle;
      const matchRatio = !historyFilterRatio || session.globalConfig.aspectRatio === historyFilterRatio;
      const matchPageCount = !historyFilterPageCount || session.globalConfig.targetPageCount.toString() === historyFilterPageCount;
      const matchStatus = !historyFilterStatus || session.status === historyFilterStatus;
      
      let matchTime = true;
      if (historyFilterTime) {
          const now = Date.now();
          const diff = now - session.lastModified;
          const ONE_DAY = 24 * 60 * 60 * 1000;
          if (historyFilterTime === '24h') matchTime = diff <= ONE_DAY;
          else if (historyFilterTime === '7d') matchTime = diff <= 7 * ONE_DAY;
          else if (historyFilterTime === '30d') matchTime = diff <= 30 * ONE_DAY;
      }

      return matchSearch && matchStyle && matchRatio && matchStatus && matchTime && matchPageCount;
  });

  // --- Add Text Page Logic (Direct) ---
  const handleAddTextPage = () => {
      if (!validateAddPage()) return; // Check limits

      const nextType = getNextPageType(items.length);
      const newItem: GeneratedSlide = {
          id: Math.random().toString(36).substr(2, 9),
          contentType: 'text',
          pageType: nextType,
          originalFile: null,
          title: "新页面",
          textContent: "",
          previewUrl: '',
          variants: [],
          variantCount: 2,
          status: 'idle',
          createdAt: Date.now()
      };
      
      setItems(prev => [...prev, newItem]);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const confirmImageTasks = () => {
      if (tempImageFiles.length === 0) return;
      
      const availableSlots = config.targetPageCount - items.length;
      if (availableSlots < tempImageFiles.length) {
          alert(`无法全部添加：选择了 ${tempImageFiles.length} 张图片，但剩余空位只有 ${availableSlots} 个。请先调整全局页数。`);
          return;
      }

      let currentCount = items.length;
      const newItems: GeneratedSlide[] = tempImageFiles.map(file => {
        const type = getNextPageType(currentCount);
        currentCount++;
        return {
            id: Math.random().toString(36).substr(2, 9),
            contentType: 'image',
            pageType: type,
            originalFile: file,
            previewUrl: URL.createObjectURL(file),
            variants: [],
            variantCount: 2, 
            status: 'idle',
            createdAt: Date.now()
        };
      });
      
      setItems(prev => [...prev, ...newItems]);
      setIsImageTaskModalOpen(false);
      setTempImageFiles([]);
  };

  // 1. Save Preset Logic
  const openSavePresetModal = () => {
      setPresetNameInput(`${config.styleName || "新风格"} ${new Date().toLocaleDateString()}`);
      setIsSavePresetModalOpen(true);
  };

  const confirmSavePreset = () => {
      if (!presetNameInput.trim()) return;
      showConfirm("确认保存预设", "确定保存当前配置（含页面规划）吗？", () => {
             // NEW: Capture samples from current items
             const samples = items
                .filter(i => i.status === 'success' && i.variants.length > 0)
                .slice(0, 4) // Limit to 4 samples
                .map(i => i.variants[0]);

             const newPreset: StylePreset = {
                id: Math.random().toString(36).substr(2, 9),
                name: presetNameInput,
                config: { ...config },
                styleMap: { ...styleMap },
                styleFile: null, // Deprecated
                sampleImages: samples,
                createdAt: Date.now()
            };
            setFavorites(prev => [...prev, newPreset]);
            setIsSavePresetModalOpen(false);
            setIsPresetSaved(true);
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
                 custom: null
             });
          }
          setIsPresetSaved(true);
          setIsFavoritesModalOpen(false);
          setSelectedPresetForDetail(null);
          closeConfirm();
      });
  };

  const handleUpdatePreset = (updatedPreset: StylePreset) => {
      setFavorites(prev => prev.map(p => p.id === updatedPreset.id ? updatedPreset : p));
      alert("预设更新成功");
      setSelectedPresetForDetail(null);
  };

  const handleDeleteFavoriteRequest = (id: string) => {
      showConfirm("删除预设", "确定删除吗？", () => {
          setFavorites(prev => prev.filter(f => f.id !== id));
          if (selectedPresetForDetail?.id === id) setSelectedPresetForDetail(null);
          closeConfirm();
      }, 'danger');
  };

  const saveProjectSession = (currentItems: GeneratedSlide[]) => {
      const sessionId = selectedSessionId || Math.random().toString(36).substr(2, 9);
      
      // Attempt to find the cover page for the thumbnail
      const coverItem = currentItems.find(i => i.pageType === 'cover');
      const firstItem = currentItems[0];
      const thumbnailItem = coverItem || firstItem;
      
      // Prioritize the generated variant (result) over the previewUrl (input) if available
      let thumbUrl = undefined;
      if (thumbnailItem) {
          if (thumbnailItem.variants && thumbnailItem.variants.length > 0) {
              thumbUrl = thumbnailItem.variants[0];
          } else {
              thumbUrl = thumbnailItem.previewUrl;
          }
      }

      const sessionData: ProjectSession = {
          id: sessionId,
          title: config.styleName ? `${config.styleName} Project` : `Project ${new Date().toLocaleDateString()}`,
          pageCount: currentItems.length,
          lastModified: Date.now(),
          status: currentItems.some(i => i.status === 'generating') ? 'generating' : 'completed',
          items: currentItems,
          globalConfig: config,
          globalStyleMap: { ...styleMap },
          thumbnailUrl: thumbUrl
      };

      setSessions(prev => {
          const exists = prev.find(s => s.id === sessionId);
          if (exists) {
              return prev.map(s => s.id === sessionId ? sessionData : s);
          }
          return [sessionData, ...prev];
      });

      if (!selectedSessionId) {
          setSelectedSessionId(sessionId);
      }
  };

  // Generation Logic
  const processItem = async (item: GeneratedSlide) => {
    try {
        const contentSource = item.contentType === 'text' ? (item.textContent || "") : (item.originalFile as File);
        setItems(prev => prev.map(res => res.id === item.id ? { ...res, status: 'generating', errorMessage: undefined, variants: [] } : res));
        const count = item.variantCount || 2;
        
        // --- NEW: Select specific style file based on pageType ---
        // Fallback Logic: Specific Type -> Content (Main) -> Cover -> First Available -> Null
        let selectedStyleFile = styleMap[item.pageType];
        if (!selectedStyleFile) selectedStyleFile = styleMap['content'];
        if (!selectedStyleFile) selectedStyleFile = styleMap['cover'];
        if (!selectedStyleFile) {
            const firstKey = Object.keys(styleMap).find(k => styleMap[k as PageType]) as PageType;
            if (firstKey) selectedStyleFile = styleMap[firstKey];
        }

        const promises = [];
        for (let i = 0; i < count; i++) {
            const label = `Option ${i + 1}`;
            promises.push(generateSlideVariant(contentSource, selectedStyleFile, config, label, item.title));
        }
        const generatedVariants = await Promise.all(promises);
        setItems(prev => prev.map(res => res.id === item.id ? { ...res, variants: generatedVariants, status: 'success' } : res));
    } catch (error: any) {
        setItems(prev => prev.map(res => res.id === item.id ? { ...res, status: 'error', errorMessage: error.message } : res));
    }
  };

  const handleGenerateBatch = async () => {
    const itemsToProcess = items.filter(item => item.status === 'idle' || item.status === 'error');
    if (itemsToProcess.length === 0) return;
    setIsProcessing(true);
    setItems(prev => prev.map(item => (item.status === 'idle' || item.status === 'error') ? { ...item, status: 'generating' } : item));
    
    // Use Concurrency from Settings
    const CONCURRENCY_LIMIT = appSettings.performance.imageConcurrency || 2;
    
    const activePromises = new Set<Promise<void>>();
    for (const item of itemsToProcess) {
        while (activePromises.size >= CONCURRENCY_LIMIT) await Promise.race(activePromises);
        const operation = processItem(item);
        const effectivePromise: Promise<void> = operation.then(() => { activePromises.delete(effectivePromise); }, () => { activePromises.delete(effectivePromise); });
        activePromises.add(effectivePromise);
    }
    await Promise.all(activePromises);
    setIsProcessing(false);
    setItems(currentItems => { saveProjectSession(currentItems); return currentItems; });
  };

  const handleSingleGenerate = async (id: string) => {
      const item = items.find(i => i.id === id);
      if (item) await processItem(item);
  };

  const handleRegenerate = async (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'generating', variants: [] } : i));
      await processItem(item);
  };

  // Drag Drop
  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
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
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Paste Listener
  useEffect(() => {
    const handleGlobalPaste = (e: any) => {
      if (!isImageTaskModalOpen && !isStyleModalOpen) return;
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      const pastedImageFiles: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.startsWith('image/')) {
          const file = clipboardItems[i].getAsFile();
          if (file) pastedImageFiles.push(file);
        }
      }
      if (pastedImageFiles.length > 0) {
        e.preventDefault();
        if (isImageTaskModalOpen) setTempImageFiles(prev => [...prev, ...pastedImageFiles]);
        else if (isStyleModalOpen) {
            // Paste to the 'cover' slot or 'content' by default in temp map?
            // Actually, let's just add to cover for now as default paste behavior
             setTempStyleMap(prev => ({...prev, cover: pastedImageFiles[0]}));
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isImageTaskModalOpen, isStyleModalOpen]);

  // Missing Functions Definitions
  const openStyleModal = () => {
      setTempStyleMap({...styleMap}); // Initialize temp map with current
      setIsStyleModalOpen(true);
  };
  const openImageTaskModal = () => setIsImageTaskModalOpen(true);

  const handleTempStylePaste = async () => {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], "pasted-style.png", { type: imageType });
                    // Default paste to cover
                    setTempStyleMap(prev => ({...prev, cover: file}));
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
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    const file = new File([blob], `pasted-${Date.now()}.png`, { type: imageType });
                    newFiles.push(file);
                }
            }
            if (newFiles.length > 0) {
                setTempImageFiles(prev => [...prev, ...newFiles]);
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
        showConfirm("批量删除", `确定删除选中的 ${selectedHistoryIds.size} 个项目吗？`, () => {
            setSessions(prev => prev.filter(s => !selectedHistoryIds.has(s.id)));
            setSelectedHistoryIds(new Set());
            closeConfirm();
        }, 'danger');
    };

    const handleDeleteSession = (id: string) => {
        showConfirm("删除项目", "确定删除此历史记录吗？", () => {
            setSessions(prev => prev.filter(s => s.id !== id));
            if (selectedSessionId === id) {
                setSelectedSessionId(null);
                setViewMode('history');
            }
            closeConfirm();
        }, 'danger');
    };

    const handleRestoreSession = (session: ProjectSession) => {
        showConfirm("恢复项目", "恢复将覆盖当前工作台内容，确定吗？", () => {
            setItems(session.items);
            setConfig(session.globalConfig);
            if (session.globalStyleMap) {
                setStyleMap(session.globalStyleMap);
            } else if (session.globalStyleFiles) {
                 // Backward compatibility logic
                 const f = session.globalStyleFiles[0];
                 setStyleMap({cover: f, directory: f, transition: f, content: f, end: f, custom: null});
            }
            setSelectedSessionId(session.id);
            setViewMode('workbench');
            closeConfirm();
        });
    };

    const toggleHistorySelection = (id: string) => {
        const newSet = new Set(selectedHistoryIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedHistoryIds(newSet);
    };

  const activeSession = sessions.find(s => s.id === selectedSessionId);
  const hasAnyStyle = Object.values(styleMap).some(f => f !== null);

  // Helper for Style Modal Types
  const PAGE_TYPES: {type: PageType, label: string}[] = [
      { type: 'cover', label: '封面页 (Cover)' },
      { type: 'directory', label: '目录页 (Directory)' },
      { type: 'transition', label: '章节过渡 (Transition)' },
      { type: 'content', label: '内容正文 (Content)' },
      { type: 'end', label: '结束页 (End)' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Global Confirmation Dialog */}
      <ConfirmDialog isOpen={confirmation.isOpen} title={confirmation.title} message={confirmation.message} onConfirm={confirmation.onConfirm} onCancel={closeConfirm} type={confirmation.type} />
      
      {/* Global Settings Modal */}
      <GlobalSettingsModal 
          isOpen={isGlobalSettingsOpen} 
          onClose={() => setIsGlobalSettingsOpen(false)} 
          currentSettings={appSettings} 
          onSave={setAppSettings} 
      />

      {/* Outline Generator Modal - Pass Config and KEY for reset */}
      <OutlineGenerator 
          key={outlineResetKey}
          isOpen={isOutlineGeneratorOpen}
          onClose={() => setIsOutlineGeneratorOpen(false)}
          onFinish={handleOutlineImport}
          initialTopic={outlineInitialTopic}
          config={config} 
      />

      {/* Lightbox */}
      <Modal isOpen={!!lightboxImage} onClose={() => setLightboxImage(null)} variant="lightbox">
          {lightboxImage && <img src={lightboxImage} alt="Full size view" className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" />}
      </Modal>

      {/* Save Preset Modal */}
      <Modal isOpen={isSavePresetModalOpen} onClose={() => setIsSavePresetModalOpen(false)} title="保存风格预设" footer={<div className="flex gap-2 w-full justify-end"><button onClick={() => setIsSavePresetModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100">取消</button><button onClick={confirmSavePreset} className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">下一步</button></div>}>
          <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">预设名称</label>
              <input type="text" value={presetNameInput} onChange={(e) => setPresetNameInput(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:outline-none" placeholder="例如：科技蓝商务风格 10P" autoFocus />
          </div>
      </Modal>

      {/* Favorites List Modal */}
      <Modal isOpen={isFavoritesModalOpen} onClose={() => setIsFavoritesModalOpen(false)} title="我的风格收藏夹" maxWidth="max-w-4xl" footer={<div className="flex justify-between items-center w-full px-1"><span className="text-xs text-slate-500 font-medium">共找到 {filteredFavorites.length} 个预设</span></div>}>
           <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex-1 relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input type="text" placeholder="搜索预设..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                  {/* ... filters ... */}
              </div>
              {filteredFavorites.length === 0 ? (<div className="text-center py-20 text-slate-400"><Heart size={48} className="mx-auto mb-3 text-slate-200" /><p>没有找到匹配的风格预设</p></div>) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredFavorites.map(fav => (
                          <div key={fav.id} className={`border rounded-xl overflow-hidden hover:shadow-lg transition-all flex flex-col group bg-white border-slate-200`}>
                               <div className="h-32 bg-slate-100 relative border-b border-slate-100">
                                   {/* Show cover or first available style */}
                                   {fav.styleMap?.cover ? (<img src={URL.createObjectURL(fav.styleMap.cover)} className="w-full h-full object-contain bg-slate-50" />) : 
                                    fav.styleFile ? (<img src={URL.createObjectURL(fav.styleFile)} className="w-full h-full object-contain bg-slate-50" />) :
                                   (<div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>)}
                                   <div className="absolute top-2 right-2 flex gap-1"><span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">{fav.config.targetPageCount}P</span></div>
                               </div>
                               <div className="p-3 flex-1 flex flex-col">
                                   <h4 className="font-semibold text-slate-800 text-sm truncate mb-1">{fav.name}</h4>
                                   <div className="flex flex-wrap gap-1 mb-2">
                                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{fav.config.styleName}</span>
                                       <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{fav.config.pageStructure.content}正文</span>
                                   </div>
                                   <div className="mt-auto flex gap-2">
                                       <button onClick={() => setSelectedPresetForDetail(fav)} className="flex-1 py-1.5 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50">详情</button>
                                       <button onClick={() => handleApplyPresetRequest(fav)} className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium hover:bg-indigo-100">应用</button>
                                       <button onClick={() => handleDeleteFavoriteRequest(fav.id)} className="px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                                   </div>
                               </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </Modal>

      {/* Style Reference Modal - NEW LAYOUT with 5 Slots */}
      <Modal isOpen={isStyleModalOpen} onClose={() => setIsStyleModalOpen(false)} title="上传风格参考图" maxWidth="max-w-4xl" footer={<div className="flex gap-2 w-full justify-end"><button onClick={() => setTempStyleMap({cover:null, directory:null, transition:null, content:null, end:null, custom:null})} className="px-4 py-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100">全部清空</button><button onClick={() => { setStyleMap(tempStyleMap); setIsStyleModalOpen(false); setIsPresetSaved(false); }} className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg">确定使用</button></div>}>
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-700 flex items-start gap-2">
                <Sparkles size={16} className="mt-0.5 shrink-0" />
                <p>请为不同页面类型分别上传参考图，AI 将根据页面类型智能匹配设计风格。未上传的类型将自动使用“内容正文”的风格作为替补。</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {PAGE_TYPES.map((pt) => (
                    <div key={pt.type} className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            {pt.type === 'cover' ? <Home size={12}/> : 
                             pt.type === 'directory' ? <LayoutList size={12}/> :
                             pt.type === 'transition' ? <BookOpen size={12}/> :
                             pt.type === 'end' ? <Flag size={12}/> : <FileText size={12}/>
                            }
                            {pt.label}
                        </div>
                        <div className="h-32">
                             <ImageUploader 
                                variant="style-ref"
                                files={tempStyleMap[pt.type] ? [tempStyleMap[pt.type] as File] : []}
                                onFilesSelected={(files) => setTempStyleMap(prev => ({...prev, [pt.type]: files[0]}))}
                                onRemoveFile={() => setTempStyleMap(prev => ({...prev, [pt.type]: null}))}
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
      <Modal isOpen={isImageTaskModalOpen} onClose={() => setIsImageTaskModalOpen(false)} title="添加图片素材任务" footer={<div className="flex gap-2 w-full"><button onClick={() => setIsImageTaskModalOpen(false)} className="flex-1 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">取消</button><button onClick={confirmImageTasks} disabled={tempImageFiles.length === 0} className={`flex-1 py-2 rounded-lg font-medium shadow-sm transition-all ${tempImageFiles.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200'}`}>确认添加 ({tempImageFiles.length})</button></div>}>
        <div className="space-y-6">
             <div className="space-y-4">
                 <ImageUploader files={[]} onFilesSelected={(f) => setTempImageFiles(prev => [...prev, ...f])} onRemoveFile={() => {}} label={tempImageFiles.length > 0 ? "继续添加图片" : "点击选择图片"} multiple={true} />
                 <button onClick={handleTempImageTaskPaste} className="w-full py-3 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 rounded-lg flex items-center justify-center gap-2 transition-all"><Clipboard size={16} /> 从剪贴板粘贴</button>
             </div>
             {tempImageFiles.length > 0 && (<div className="space-y-2"><h4 className="text-sm font-medium text-slate-700">已选择 ({tempImageFiles.length})</h4><div className="grid grid-cols-3 gap-3">{tempImageFiles.map((file, idx) => (<div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50"><img src={URL.createObjectURL(file)} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => setTempImageFiles(prev => prev.filter((_, i) => i !== idx))} className="bg-red-500 text-white p-1.5 rounded-full"><Trash2 size={16} /></button></div></div>))}</div></div>)}
        </div>
      </Modal>

      {/* Main UI Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('workbench')}>
            <div className="text-yellow-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 18.5C4.5 18.5 3.5 14.5 6.5 10.5C9.5 6.5 16.5 4.5 19.5 4.5C19.5 4.5 18 9 14.5 12C11 15 8 18.5 4.5 18.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">BananaSlide</h1>
          </div>
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('workbench')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'workbench' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}><LayoutGrid size={14} /> 工作台 ({items.length}/{config.targetPageCount})</button>
              <button onClick={() => setViewMode('history')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'history' || viewMode === 'history-detail' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}><History size={14} /> 历史记录 ({sessions.length})</button>
          </div>
          <div className="flex items-center gap-4">
              {viewMode === 'workbench' ? (
                // Replaced Batch Generate with Global Config
                <button 
                  onClick={() => setIsGlobalSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
                >
                    <Settings size={18} /> 全局配置
                </button>
              ) : viewMode === 'history' ? (
                 <div className="flex items-center gap-2"><button onClick={() => { setIsHistorySelectionMode(!isHistorySelectionMode); setSelectedHistoryIds(new Set()); }} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isHistorySelectionMode ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}><ListChecks size={16} /> {isHistorySelectionMode ? '退出管理' : '管理'}</button>{isHistorySelectionMode && (<button onClick={handleBatchDeleteHistory} disabled={selectedHistoryIds.size === 0} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedHistoryIds.size === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'}`}><Trash2 size={16} /> 删除 ({selectedHistoryIds.size})</button>)}</div>
              ) : (
                  <div className="flex gap-2"><button onClick={() => activeSession && handleDeleteSession(activeSession.id)} className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-all"><Trash2 size={16} /> 删除</button><button onClick={() => activeSession && handleRestoreSession(activeSession)} className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-all"><RefreshCcw size={16} /> 恢复项目</button></div>
              )}
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-8">
        
        {viewMode === 'workbench' && (
            <>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] px-3 py-1 rounded-br-lg font-bold tracking-wide z-10 flex items-center gap-1"><Settings2 size={10} /> 全局设置 (Global Settings)</div>
                    
                    {/* Updated Layout: Top Row (Left 1/3, Right 2/3) + Bottom Row */}
                    <div className="flex flex-col gap-6 mt-6">
                        <div className="flex flex-col lg:flex-row gap-6 lg:h-[340px]">
                            
                            {/* Left 1/3: Global Style Images - CAROUSEL PREVIEW */}
                            <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group">
                                {hasAnyStyle ? (
                                    <>
                                        {/* Main View Area */}
                                        <div className="flex-1 relative bg-slate-100 flex items-center justify-center p-2">
                                            {styleMap[activePreviewType] ? (
                                                <img 
                                                    src={URL.createObjectURL(styleMap[activePreviewType]!)} 
                                                    alt={activePreviewType} 
                                                    className="w-full h-full object-contain cursor-zoom-in" 
                                                    onClick={() => setLightboxImage(URL.createObjectURL(styleMap[activePreviewType]!))}
                                                />
                                            ) : (
                                                <div className="text-slate-400 text-xs flex flex-col items-center gap-2">
                                                    <ImageIcon size={32} opacity={0.5} />
                                                    <span>无{PAGE_TYPES.find(p => p.type === activePreviewType)?.label.split(' ')[0]}参考图</span>
                                                    <span className="text-[10px] text-slate-300">将使用默认风格</span>
                                                </div>
                                            )}
                                            
                                            {/* Top Label Badge */}
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-white text-xs font-bold shadow-sm">
                                                {PAGE_TYPES.find(p => p.type === activePreviewType)?.label}
                                            </div>

                                            {/* Hover Controls */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 pointer-events-none">
                                                 <button 
                                                    onClick={openStyleModal}
                                                    className="pointer-events-auto flex flex-col items-center justify-center gap-1 bg-white hover:bg-rose-50 text-rose-600 w-24 h-12 rounded-lg shadow-lg transition-all"
                                                >
                                                    <span className="text-xs font-bold flex items-center gap-1"><Upload size={14}/> 管理参考图</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bottom Carousel / Tabs */}
                                        <div className="h-14 bg-white border-t border-slate-200 flex items-center px-2 gap-2 overflow-x-auto custom-scrollbar shrink-0">
                                            {PAGE_TYPES.map(pt => (
                                                <button
                                                    key={pt.type}
                                                    onClick={() => setActivePreviewType(pt.type)}
                                                    className={`flex-1 min-w-[60px] h-10 rounded border transition-all relative overflow-hidden group/thumb
                                                        ${activePreviewType === pt.type ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'}
                                                    `}
                                                    title={pt.label}
                                                >
                                                    {styleMap[pt.type] ? (
                                                        <img src={URL.createObjectURL(styleMap[pt.type]!)} className="w-full h-full object-cover" />
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
                                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                                        <div 
                                            onClick={openStyleModal}
                                            className="w-full h-full border-2 border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/30 transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center text-center p-4 bg-slate-50"
                                        >
                                            <div className="bg-white p-4 rounded-full mb-4 shadow-sm text-rose-500 border border-slate-100">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-bold text-slate-700 mb-1">上传风格参考图</h4>
                                            <p className="text-xs text-slate-400 px-4">支持为封面、目录、正文等不同页面分别设置风格</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right 2/3: Controls */}
                            <div className="w-full lg:w-2/3 bg-white border border-slate-200 rounded-xl p-5 h-full overflow-hidden">
                                <StyleControls config={config} onChange={handleConfigChange} onSaveFavorite={openSavePresetModal} onOpenFavorites={() => setIsFavoritesModalOpen(true)} isSaved={isPresetSaved} />
                            </div>
                        </div>

                        {/* Bottom Row: Requirements (Increased Height) */}
                        <div className="flex flex-col">
                            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><LinkIcon size={14} className="text-slate-500"/> 全局设计要求</h3>
                            <textarea 
                                value={config.requirements} 
                                onChange={(e) => handleConfigChange('requirements', e.target.value)} 
                                placeholder={`在此输入详细的排版、字体或布局要求...`} 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all resize-none h-[140px]" 
                            />
                        </div>
                    </div>
                </div>

                <div>
                     <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                        {/* ... same ... */}
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Layers size={22} className="text-slate-700"/> 页面任务列表 <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">{items.length} / {config.targetPageCount} P</span></h2>
                            <p className="text-sm text-slate-500 mt-1 ml-1">在此添加具体的幻灯片内容素材，每个任务将对应生成一页 PPT</p>
                        </div>
                        <div className="flex items-center gap-3">
                             <button onClick={handleAddTextPage} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg text-sm font-medium transition-all shadow-sm"><Plus size={16} /> 添加文本页面</button>
                             <button onClick={openImageTaskModal} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-sm font-medium transition-all shadow-sm"><Plus size={16} /> 添加图片页面</button>
                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <button onClick={() => openOutlineGenerator()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 text-slate-600 rounded-lg text-sm font-medium transition-all shadow-sm"><Sparkles size={16} /> 一句话生成大纲</button>
                             <button onClick={() => outlineFileInputRef.current?.click()} disabled={isReadingFile} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 text-slate-600 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50">{isReadingFile ? <Loader2 size={16} className="animate-spin" /> : <FileInput size={16} />} {isReadingFile ? "解析中..." : "上传文件生成大纲"}</button>
                             <input type="file" ref={outlineFileInputRef} onChange={handleOutlineFileSelect} accept=".txt,.md,.json,.pdf,.doc,.docx" className="hidden" />
                             
                             {/* Batch Generate Button Moved Here */}
                             <button 
                                onClick={handleGenerateBatch} 
                                disabled={items.length === 0 || isProcessing} 
                                className={`ml-2 flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all transform active:scale-95 ${items.length === 0 || isProcessing ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-400 hover:bg-rose-500 hover:shadow-rose-100'}`}
                             >
                                {isProcessing ? (<><Loader2 size={16} className="animate-spin" /> 生成中...</>) : (<><Wand2 size={16} /> 批量生成</>)}
                             </button>

                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <button onClick={clearWorkbench} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="清空列表"><Trash2 size={18} /></button>
                        </div>
                    </div>

                    <div className="min-h-[300px]">
                        {items.length === 0 ? (
                            <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl h-[400px] flex flex-col items-center justify-center p-8">
                                <div className="bg-white p-4 rounded-full mb-6 shadow-sm border border-slate-100"><LayoutGrid size={32} className="text-slate-300" /></div>
                                <h2 className="text-lg font-medium text-slate-700 mb-2">暂无任务</h2>
                                <p className="text-slate-400 text-sm mb-8">请添加需要生成 PPT 的内容素材 (目标 {config.targetPageCount} 页)</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-5">
                                {items.map((item, index) => (
                                    <ResultCard 
                                        key={item.id} item={item} index={index + 1}
                                        onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e)} onDrop={() => handleDrop(index)}
                                        onGenerateSingle={() => handleSingleGenerate(item.id)} onRegenerate={() => handleRegenerate(item.id)}
                                        onUpdate={(updates) => handleUpdateItem(item.id, updates)} onDelete={() => handleDeletePage(item.id)} onDuplicate={() => handleDuplicatePage(item.id)}
                                        onViewImage={(url) => setLightboxImage(url)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
        
        {viewMode === 'history' && (
             <div className="min-h-[500px] flex flex-col">
                 <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                     {/* Search */}
                     <div className="flex-1 w-full lg:w-auto relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" placeholder="搜索项目标题..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
                     {/* ... Filters ... */}
                 </div>

                 {/* History List - Horizontal Layout */}
                 {filteredHistory.length === 0 ? (<div className="text-center py-20 flex-1"><History size={48} className="mx-auto text-slate-200 mb-4" /><h3>暂无历史项目</h3></div>) : (
                    <div className="space-y-4 pb-12 flex-1">
                         {filteredHistory.map((session) => (
                             <div key={session.id} className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col md:flex-row gap-6 transition-all hover:shadow-md group relative ${isHistorySelectionMode && selectedHistoryIds.has(session.id) ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`} onClick={() => { if(isHistorySelectionMode) toggleHistorySelection(session.id); }}>
                                 {/* Cover Thumbnail */}
                                 <div className="w-full md:w-64 aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-100 shrink-0 relative cursor-zoom-in" onClick={(e) => { e.stopPropagation(); if(session.thumbnailUrl) setLightboxImage(session.thumbnailUrl); }}>
                                     {session.thumbnailUrl ? (
                                         <img src={session.thumbnailUrl} className="w-full h-full object-contain bg-slate-50" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>
                                     )}
                                     <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-xs font-medium backdrop-blur-sm pointer-events-none">P{session.pageCount}</div>
                                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
                                         <ZoomIn className="text-white drop-shadow-md" size={24} />
                                     </div>
                                 </div>

                                 {/* Content Info */}
                                 <div className="flex-1 flex flex-col justify-between">
                                     <div>
                                         <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1">{session.title}</h3>
                                            {!isHistorySelectionMode && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setViewMode('history-detail'); setSelectedSessionId(session.id); }} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium transition-colors">查看详情</button>
                                                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="text-sm text-slate-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors" title="删除"><Trash2 size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleRestoreSession(session); }} className="text-sm text-slate-400 hover:text-green-600 px-2 py-1.5 rounded-lg hover:bg-green-50 transition-colors" title="恢复到工作台"><RefreshCcw size={16} /></button>
                                                </div>
                                            )}
                                         </div>
                                         <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">{session.globalConfig.styleName || '默认风格'}</span>
                                            <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">{session.globalConfig.aspectRatio}</span>
                                            <span className="text-xs px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500">{session.globalConfig.pageStructure.content} 内容页</span>
                                         </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 border-t border-slate-50 pt-3">
                                         <div className="flex items-center gap-1"><Calendar size={12} /> 创建于 {new Date(session.lastModified).toLocaleString()}</div>
                                         <div>ID: {session.id.substring(0,8)}</div>
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
        {viewMode === 'history-detail' && activeSession && (
             <div>
                <div className="flex items-center gap-2 mb-6"><button onClick={() => setViewMode('history')} className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-sm font-medium transition-colors"><ArrowRight size={16} className="rotate-180" /> 返回列表</button><div className="h-4 w-px bg-slate-300 mx-2"></div><h2 className="text-xl font-bold text-slate-800">{activeSession.title}</h2><span className="text-slate-400 text-sm">({activeSession.pageCount} 页)</span></div>
                
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden mb-8">
                     <div className="absolute top-0 left-0 bg-slate-500 text-white text-[10px] px-3 py-1 rounded-br-lg font-bold tracking-wide z-10 flex items-center gap-1"><Settings2 size={10} /> 历史快照</div>
                     
                     <div className="flex flex-col gap-6 mt-6">
                        <div className="flex flex-col lg:flex-row gap-6 lg:h-[340px]">
                            {/* Left 1/3: Images - Single View */}
                            <div className="w-full lg:w-1/3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col h-full overflow-hidden relative group">
                                {activeSession.globalStyleMap?.cover || activeSession.globalStyleFiles?.length ? (
                                    <>
                                        <img 
                                            src={URL.createObjectURL(activeSession.globalStyleMap?.cover || activeSession.globalStyleFiles?.[0]!)} 
                                            className="w-full h-full object-contain bg-slate-50" 
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                                            <button 
                                                onClick={() => setLightboxImage(URL.createObjectURL(activeSession.globalStyleMap?.cover || activeSession.globalStyleFiles?.[0]!))}
                                                className="flex flex-col items-center justify-center gap-1 bg-white/90 hover:bg-white text-slate-800 w-16 h-16 rounded-lg backdrop-blur shadow-sm transition-all"
                                            >
                                                <ZoomIn size={24} />
                                                <span className="text-[10px] font-medium">查看大图</span>
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
                                <StyleControls config={activeSession.globalConfig} onChange={() => {}} readOnly={true} />
                            </div>
                        </div>

                        {/* Bottom: Requirements */}
                        <div className="flex flex-col pointer-events-none opacity-90">
                            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><LinkIcon size={14} className="text-slate-500"/> 全局设计要求</h3>
                            <textarea 
                                value={activeSession.globalConfig.requirements} 
                                readOnly 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none resize-none h-[140px]" 
                            />
                        </div>
                     </div>
                </div>
                <div className="grid grid-cols-1 gap-5">{activeSession.items.map((item, index) => (<ResultCard key={item.id} item={item} index={index + 1} onViewImage={(url) => setLightboxImage(url)} readOnly={true} />))}</div>
             </div>
        )}
      </main>
    </div>
  );
};

export default App;
