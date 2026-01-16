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
  Search
} from 'lucide-react';
import { StyleConfig, StyleTemplate, GlobalStyleMap, PageType, StylePreset, AppSettings, StoredResource } from '../types';
import { STYLE_PRESETS, COLOR_PRESETS, RATIO_PRESETS } from './StyleControls';
import { ImageUploader } from './ImageUploader';
import { SharedStyleCard, SharedStyleItem } from './SharedStyleCard';
import { Home, LayoutList, BookOpen, Flag, Type, Wand2, Edit3, Loader2 } from 'lucide-react';
import { smartRefine } from '../services/geminiService';
import { useSaveTemplate, useUpdateTemplate, useDeleteTemplate } from '../api/templates';
import { useAddFavorite, useRemoveFavorite } from '../api/favorites';

const PAGE_TYPES: { type: PageType; label: string }[] = [
  { type: 'cover', label: '封面页' },
  { type: 'directory', label: '目录页' },
  { type: 'transition', label: '过渡页' },
  { type: 'content', label: '正文页' },
  { type: 'end', label: '结束页' },
];

interface StyleTemplateManagerProps {
  isOpen: boolean;
  templates: StyleTemplate[];
  onApplyTemplate: (template: StyleTemplate) => void;
  onUpdateTemplates?: (templates: StyleTemplate[]) => void; // Deprecated
  onClose: () => void;
  activeTemplateId: string | null;
  favorites: StylePreset[];
  onApplyFavorite: (preset: StylePreset) => void;
  onDeleteFavorite?: (id: string) => void; // Deprecated
  onToggleFavorite?: (template: StyleTemplate) => void; // Deprecated
  appSettings: AppSettings;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
  initialEditingTemplateId?: string | null;
  onClearEditingTemplateId?: () => void;
}

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
  onClearEditingTemplateId
}) => {
  const [view, setView] = useState<'gallery' | 'creator'>('gallery');
  const [activeTab, setActiveTab] = useState<'market' | 'favorites'>('market');
  const [editingTemplate, setEditingTemplate] = useState<StyleTemplate | null>(null);
  const [isOpeningInEditMode, setIsOpeningInEditMode] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

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
             sampleImages: [] // server handles default? or pass?
         }, {
            onSuccess: () => onShowToast('已添加到收藏', 'success')
         });
     }
  };

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterRatio, setFilterRatio] = useState('');
  const [filterPalette, setFilterPalette] = useState('');
  const [filterPageCount, setFilterPageCount] = useState('');
  const [filterTime, setFilterTime] = useState('');

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

  if (!isOpen) return null;

  // Filtering Logic
  const filterList = (list: any[]) => {
    return list.filter(item => {
      const config = item.config || {};
      const matchSearch = (item.name || config.styleName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStyle = !filterStyle || config.styleName === filterStyle;
      const matchRatio = !filterRatio || config.aspectRatio === filterRatio;
      const matchPalette = !filterPalette || config.colorPalette === filterPalette;
      const matchPageCount = !filterPageCount || String(config.targetPageCount) === filterPageCount;
      
      let matchTime = true;
      if (filterTime) {
        const time = item.createdAt || 0;
        const now = Date.now();
        if (filterTime === '24h') matchTime = now - time < 24 * 60 * 60 * 1000;
        else if (filterTime === '7d') matchTime = now - time < 7 * 24 * 60 * 60 * 1000;
        else if (filterTime === '30d') matchTime = now - time < 30 * 24 * 60 * 60 * 1000;
      }

      return matchSearch && matchStyle && matchRatio && matchPalette && matchPageCount && matchTime;
    });
  };

  const filteredTemplates = filterList(templates);
  const filteredFavorites = filterList(favorites);

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
                  <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    <button
                      onClick={() => setActiveTab('market')}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                          activeTab === 'market' 
                          ? 'bg-white text-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                      }`}
                    >
                      模板集市
                    </button>
                    <button
                      onClick={() => setActiveTab('favorites')}
                      className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                          activeTab === 'favorites' 
                          ? 'bg-rose-50 text-rose-500 shadow-sm' 
                          : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
                      }`}
                    >
                      我的收藏
                    </button>
                  </div>
                )}
             </div>
             {/* CLOSE BUTTON REMOVED - Navigation tab handles switching */}
          </div>

          {/* Search & Filters Row (Gallery only) */}
          {view === 'gallery' && (
             <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                    {/* Search */}
                    <div className="flex-1 relative w-full md:max-w-xs">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            type="text"
                            placeholder="搜索预设..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 focus:border-indigo-300 rounded-lg hover:bg-white transition-all outline-none bg-white"
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <select
                            value={filterStyle}
                            onChange={(e) => setFilterStyle(e.target.value)}
                            className="text-xs border border-slate-200 bg-white rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 min-w-[80px]"
                        >
                            <option value="">所有风格</option>
                            {STYLE_PRESETS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <select
                            value={filterRatio}
                            onChange={(e) => setFilterRatio(e.target.value)}
                            className="text-xs border border-slate-200 bg-white rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 min-w-[80px]"
                        >
                            <option value="">所有比例</option>
                            {RATIO_PRESETS.map((r) => (
                            <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <select
                            value={filterPalette}
                            onChange={(e) => setFilterPalette(e.target.value)}
                            className="text-xs border border-slate-200 bg-white rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 min-w-[80px]"
                        >
                            <option value="">所有配色</option>
                            {COLOR_PRESETS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="页数"
                            value={filterPageCount}
                            onChange={(e) => setFilterPageCount(e.target.value)}
                            className="w-14 text-xs border border-slate-200 bg-white rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-center text-slate-600 placeholder:text-slate-400"
                        />
                        <select
                            value={filterTime}
                            onChange={(e) => setFilterTime(e.target.value)}
                            className="text-xs border border-slate-200 bg-white rounded-lg py-2 px-2 focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 min-w-[80px]"
                        >
                            <option value="">所有时间</option>
                            <option value="24h">24小时内</option>
                            <option value="7d">7天内</option>
                            <option value="30d">30天内</option>
                        </select>
                    </div>
                </div>
            </div>
          )}
        </div>



        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {view === 'gallery' ? (
            <div className="space-y-8">
              {/* Conditional Content based on Tab */}
              {activeTab === 'market' ? (
                  <>
                    <button 
                        onClick={handleCreateNew}
                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all group"
                    >
                        <div className="p-2 bg-slate-50 group-hover:bg-blue-100 rounded-xl transition-colors">
                        <Plus size={20} />
                        </div>
                        <span className="font-bold">创建自定义风格模板</span>
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTemplates.map(template => {
                            const isFav = favorites.some(f => f.id === template.id);
                            return (
                                <div key={template.id} className="h-[380px]">
                                <SharedStyleCard
                                    item={template}
                                    variant="library"
                                    isActive={activeTemplateId === template.id}
                                    onToggleFavorite={() => handleToggleFavoriteInternal(template)}
                                    onDetail={() => handleEditTemplate(template, false)} 
                                    onEdit={() => handleEditTemplate(template, true)}
                                    onApply={() => onApplyTemplate(template)}
                                    onDelete={template.isCustom ? handleDeleteTemplate : undefined}
                                />
                                </div>
                            );
                        })}
                        {filteredTemplates.length === 0 && (
                            <div className="col-span-full py-20 text-center text-slate-400">
                                <Search size={48} className="mx-auto mb-4 opacity-50" />
                                <p>未找到匹配的模板</p>
                            </div>
                        )}
                    </div>
                  </>
              ) : (
                  // Favorites View
                  <>
                     {filteredFavorites.length === 0 ? (
                         <div className="text-center py-20 text-slate-400">
                             {favorites.length === 0 ? (
                                <>
                                    <Heart size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>暂无收藏的风格</p>
                                    <button onClick={() => setActiveTab('market')} className="text-blue-500 font-bold mt-2 text-sm hover:underline">去集市看看</button>
                                </>
                             ) : (
                                <>
                                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>未找到匹配的收藏</p>
                                </>
                             )}
                         </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredFavorites.map(fav => (
                            <div key={fav.id} className="h-[380px]">
                            <SharedStyleCard
                                item={fav}
                                variant="favorites"
                                isActive={false} 
                                isFavorite={true}
                                onToggleFavorite={() => removeFavoriteMutation.mutate(fav.id, { onSuccess: () => onShowToast('已取消收藏', 'info') })}
                                onDetail={() => {
                                    const asTemplate: StyleTemplate = {
                                        ...fav,
                                        isCustom: true // Allow editing/viewing as if it were a template
                                    };
                                    handleEditTemplate(asTemplate, false);
                                }}
                                onEdit={() => {
                                    const asTemplate: StyleTemplate = {
                                        ...fav,
                                        isCustom: true
                                    };
                                    handleEditTemplate(asTemplate, true);
                                }}
                                onApply={() => onApplyFavorite(fav)}
                                onDelete={() => removeFavoriteMutation.mutate(fav.id, { onSuccess: () => onShowToast('已取消收藏', 'info') })}
                            />
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
                onChange={(e) => setLocalTemplate({...localTemplate, name: e.target.value})}
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
                             {pt.type === 'cover' ? <Home size={10}/> : 
                              pt.type === 'directory' ? <LayoutList size={10}/> :
                              pt.type === 'transition' ? <BookOpen size={10}/> :
                              pt.type === 'end' ? <Flag size={10}/> : <FileDigit size={10}/>}
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
                      className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all ${
                        localTemplate.config.styleName === s ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                              <Palette className="text-slate-400 mt-2" size={16}/>
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
