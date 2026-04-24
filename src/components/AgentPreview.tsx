/**
 * AgentPreview 完成预览组件
 *
 * 当所有幻灯片生成完毕后，展示缩略图网格预览，
 * 支持单页选中查看、修改、导出操作
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileDown,
  Image as ImageIcon,
  Presentation,
  CheckCircle2,
  Eye,
  Edit3,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Grid3X3,
  Columns2,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { exportToZip, exportToPdf, exportToPptx } from '../services/exportService';
import { getActionCost, consumeAction, getBalance } from '../api/points';
import type { GeneratedSlide } from '../types';
import type { ToastType } from './Toast';

interface AgentPreviewProps {
  items: GeneratedSlide[];
  projectTitle?: string;
  projectId?: string;
  onModifySlide?: (index: number, data: { title?: string; content?: string; requirements?: string }) => void;
  onRegenerateSlide?: (index: number) => void;
  onClose?: () => void;
  showToast?: (message: string, type: ToastType) => void;
}

type GridView = 'grid' | 'list';
type ExportType = 'zip' | 'pdf' | 'pptx';

export default function AgentPreview({
  items,
  projectTitle = '演示文稿',
  projectId,
  onModifySlide,
  onRegenerateSlide,
  onClose,
  showToast
}: AgentPreviewProps) {
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<GridView>('grid');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastExportType, setLastExportType] = useState<ExportType | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 导出类型名称映射
  const exportTypeNames: Record<ExportType, string> = {
    zip: '图片压缩包',
    pdf: 'PDF 文档',
    pptx: 'PPTX 演示文稿'
  };

  // 成功生成的幻灯片
  const completedSlides = useMemo(
    () => items.filter(item => item.status === 'success'),
    [items]
  );

  // 选中幻灯片的详情
  const selectedSlideData = selectedSlide !== null ? items[selectedSlide] : null;

  // 获取缩略图 URL（优先使用 previewUrl，其次使用 variants[0]）
  const getThumbnailUrl = (item: GeneratedSlide): string | null => {
    if (item.previewUrl) return item.previewUrl;
    if (item.variants && item.variants.length > 0) return item.variants[0];
    return null;
  };

  // 页面类型标签
  const getPageTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      cover: '封面',
      directory: '目录',
      transition: '过渡',
      content: '内容',
      end: '结尾',
      custom: '自定义'
    };
    return labels[type] || '内容';
  };

  // 显示错误信息
  const showError = useCallback((message: string) => {
    setExportError(message);
    showToast?.(message, 'error');
  }, [showToast]);

  // 导出处理（带积分扣费和重试机制）
  const handleExport = async (type: ExportType, isRetry = false) => {
    setIsExportMenuOpen(false);
    setExporting(true);
    setExportError(null);
    setLastExportType(type);

    const exportName = exportTypeNames[type];

    const performExport = async () => {
      if (type === 'zip') {
        await exportToZip(completedSlides, projectTitle);
      } else if (type === 'pdf') {
        await exportToPdf(completedSlides, projectTitle);
      } else {
        await exportToPptx(completedSlides, projectTitle);
      }
    };

    try {
      if (isRetry) {
        showToast?.(`正在重试导出 ${exportName}...`, 'info');
      }

      // 先检查积分是否足够（仅 PPTX，避免导出成功后扣费失败）
      if (type === 'pptx') {
        const cost = await getActionCost('export_pptx');
        if (cost > 0) {
          const balance = await getBalance();
          if (balance.points < cost) {
            showError(`积分不足，需要 ${cost} 积分，当前 ${balance.points} 积分`);
            setExporting(false);
            return;
          }
        }
      }

      // 先执行导出
      await performExport();

      // 导出成功后扣费（仅 PPTX）
      if (type === 'pptx') {
        const cost = await getActionCost('export_pptx');
        if (cost > 0) {
          await consumeAction(
            'export_pptx',
            projectId || 'agent-preview',
            `导出项目: ${projectTitle}`,
            {
              module: 'Agent模式',
              category: '导出',
              subcategory: 'PPTX',
              triggerTime: new Date().toISOString()
            }
          );
        }
      }

      showToast?.(`${exportName} 导出成功`, 'success');
      setExportError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 根据导出类型提供特定错误提示
      let specificMessage = `${exportName} 导出失败`;
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        specificMessage = `网络连接异常，${exportName} 导出失败`;
      } else if (errorMessage.includes('memory') || errorMessage.includes('size')) {
        specificMessage = `文件过大，${exportName} 导出失败，请尝试减少页数`;
      } else if (errorMessage.includes('permission') || errorMessage.includes('access')) {
        specificMessage = `权限不足，无法保存 ${exportName}`;
      } else if (errorMessage.includes('format') || errorMessage.includes('invalid')) {
        specificMessage = `格式转换错误，${exportName} 导出失败`;
      } else if (errorMessage.includes('积分') || errorMessage.includes('points')) {
        specificMessage = errorMessage;
      }

      showError(specificMessage);
    } finally {
      setExporting(false);
    }
  };

  // 重试导出
  const handleRetryExport = () => {
    if (lastExportType) {
      handleExport(lastExportType, true);
    }
  };

  // 导航到上一页/下一页
  const navigateSlide = (direction: 'prev' | 'next') => {
    if (selectedSlide === null) return;

    if (direction === 'prev' && selectedSlide > 0) {
      setSelectedSlide(selectedSlide - 1);
    } else if (direction === 'next' && selectedSlide < items.length - 1) {
      setSelectedSlide(selectedSlide + 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {projectTitle}
            </h2>
            <p className="text-xs text-gray-500">
              已完成 {completedSlides.length} / {items.length} 页
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图切换 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="网格视图"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
              title="列表视图"
            >
              <Columns2 size={16} />
            </button>
          </div>

          {/* 导出按钮 */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={exporting}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                exportError
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : exportError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportError ? '导出失败' : '导出'}
            </button>

            {/* 错误提示 + 重试按钮 */}
            {exportError && !isExportMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-red-100 p-3 z-50"
              >
                <p className="text-sm text-red-600 mb-2">{exportError}</p>
                <button
                  onClick={handleRetryExport}
                  disabled={exporting}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  重试导出
                </button>
              </motion.div>
            )}

            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                >
                  <button
                    onClick={() => handleExport('zip')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2.5 transition-colors"
                  >
                    <ImageIcon size={16} className="text-blue-500" />
                    导出图片 (ZIP)
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2.5 border-t border-gray-50 transition-colors"
                  >
                    <FileDown size={16} className="text-rose-500" />
                    导出 PDF
                  </button>
                  <button
                    onClick={() => handleExport('pptx')}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2.5 border-t border-gray-50 transition-colors"
                  >
                    <Presentation size={16} className="text-orange-500" />
                    导出 PPTX
                  </button>
                </motion.div>
              </>
            )}
          </div>

          {/* 关闭按钮 */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="关闭预览"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* 幻灯片列表 / 网格 - 添加 min-w-0 确保可以被压缩 */}
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map((item, index) => {
                const thumbUrl = getThumbnailUrl(item);
                const isSelected = selectedSlide === index;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedSlide(index)}
                    className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-500 shadow-lg shadow-indigo-100'
                        : 'border-transparent hover:border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={item.title || `第 ${index + 1} 页`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300" />
                      </div>
                    )}

                    {/* 页码和类型标签 */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-bold rounded-md backdrop-blur-sm">
                        {index + 1}
                      </span>
                      <span className="px-1.5 py-0.5 bg-white/90 text-gray-600 text-[10px] font-medium rounded-md">
                        {getPageTypeLabel(item.pageType)}
                      </span>
                    </div>

                    {/* 状态标签 */}
                    {item.status !== 'success' && (
                      <div className="absolute top-2 right-2">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                          item.status === 'error'
                            ? 'bg-red-100 text-red-600'
                            : item.status === 'generating'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.status === 'error' ? '失败' : item.status === 'generating' ? '生成中' : '待生成'}
                        </span>
                      </div>
                    )}

                    {/* 悬浮操作 */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSlide(index);
                        }}
                        className="p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors"
                        title="查看大图"
                      >
                        <ZoomIn size={16} className="text-gray-700" />
                      </button>
                    </div>

                    {/* 标题 */}
                    {item.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-[11px] font-medium truncate">
                          {item.title}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* 列表视图 */
            <div className="space-y-2 max-w-4xl mx-auto">
              {items.map((item, index) => {
                const thumbUrl = getThumbnailUrl(item);
                const isSelected = selectedSlide === index;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setSelectedSlide(index)}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-2 border-indigo-200'
                        : 'bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {/* 缩略图 */}
                    <div className="w-32 aspect-video rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.title || `第 ${index + 1} 页`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">
                          第 {index + 1} 页
                        </span>
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded">
                          {getPageTypeLabel(item.pageType)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {item.title || '未命名'}
                      </p>
                      {item.textContent && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {item.textContent}
                        </p>
                      )}
                    </div>

                    {/* 状态 */}
                    <div className="shrink-0">
                      {item.status === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : item.status === 'error' ? (
                        <span className="text-xs text-red-500">失败</span>
                      ) : item.status === 'generating' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                      ) : (
                        <span className="text-xs text-gray-400">待生成</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧详情面板 */}
        <AnimatePresence>
          {selectedSlideData && selectedSlide !== null && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-0 bottom-0 w-[360px] border-l border-gray-100 bg-white flex flex-col overflow-hidden z-10 shadow-xl"
            >
              {/* 详情头部 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    第 {selectedSlide + 1} 页
                  </span>
                  <span className="text-xs text-gray-400">
                    {getPageTypeLabel(selectedSlideData.pageType)}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSlide(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 大图预览 - 固定高度 */}
              <div className="p-4 shrink-0">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 group">
                  {getThumbnailUrl(selectedSlideData) ? (
                    <img
                      src={getThumbnailUrl(selectedSlideData)!}
                      alt={selectedSlideData.title || `第 ${selectedSlide + 1} 页`}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setLightboxImage(getThumbnailUrl(selectedSlideData)!)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  {/* 放大按钮 */}
                  {getThumbnailUrl(selectedSlideData) && (
                    <button
                      onClick={() => setLightboxImage(getThumbnailUrl(selectedSlideData)!)}
                      className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors opacity-0 group-hover:opacity-100"
                      title="全屏查看"
                    >
                      <ZoomIn size={16} className="text-gray-700" />
                    </button>
                  )}

                  {/* 左右导航 */}
                  {selectedSlide > 0 && (
                    <button
                      onClick={() => navigateSlide('prev')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  )}
                  {selectedSlide < items.length - 1 && (
                    <button
                      onClick={() => navigateSlide('next')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* 详细信息 - 可滚动区域 */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3">
                {/* 标题 */}
                {selectedSlideData.title && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-0.5 block">标题</label>
                    <p className="text-sm text-gray-800">{selectedSlideData.title}</p>
                  </div>
                )}

                {/* 文本内容 */}
                {selectedSlideData.textContent && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-0.5 block">正文内容</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed line-clamp-6">
                      {selectedSlideData.textContent}
                    </p>
                  </div>
                )}

                {/* 变体数量 */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-0.5 block">变体</label>
                  <p className="text-sm text-gray-700">
                    {selectedSlideData.variants.length} 个变体
                  </p>
                </div>

                {/* 所有变体预览 */}
                {selectedSlideData.variants.length > 1 && (
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">所有变体</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSlideData.variants.slice(0, 4).map((variant, vIndex) => (
                        <div
                          key={vIndex}
                          className="aspect-video rounded-lg overflow-hidden bg-gray-100 border border-gray-100"
                        >
                          <img
                            src={variant}
                            alt={`变体 ${vIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    {selectedSlideData.variants.length > 4 && (
                      <p className="text-xs text-gray-400 mt-1">还有 {selectedSlideData.variants.length - 4} 个变体</p>
                    )}
                  </div>
                )}
              </div>

              {/* 底部操作 - 固定在底部 */}
              <div className="p-4 border-t border-gray-50 space-y-2 shrink-0">
                {isEditMode ? (
                  /* 编辑模式 */
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">标题</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入标题..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">正文内容</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="输入正文内容..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">修改需求（可选）</label>
                      <textarea
                        value={editRequirements}
                        onChange={(e) => setEditRequirements(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="描述你想要的修改，例如：调整配色、增加图表等..."
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setIsEditMode(false);
                          setEditTitle('');
                          setEditContent('');
                          setEditRequirements('');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ArrowLeft size={14} />
                        取消
                      </button>
                      <button
                        onClick={async () => {
                          setIsRegenerating(true);
                          try {
                            await onModifySlide?.(selectedSlide, {
                              title: editTitle,
                              content: editContent,
                              requirements: editRequirements
                            });
                            setIsEditMode(false);
                            setEditTitle('');
                            setEditContent('');
                            setEditRequirements('');
                            showToast?.('已提交重新生成请求', 'success');
                          } catch (error) {
                            showToast?.('重新生成失败', 'error');
                          } finally {
                            setIsRegenerating(false);
                          }
                        }}
                        disabled={isRegenerating}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isRegenerating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        {isRegenerating ? '生成中...' : '再次生成'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 正常模式 */
                  <>
                    <button
                      onClick={() => {
                        // 进入编辑模式，初始化表单数据
                        setEditTitle(selectedSlideData.title || '');
                        setEditContent(selectedSlideData.textContent || '');
                        setEditRequirements('');
                        setIsEditMode(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit3 size={14} />
                      修改此页
                    </button>
                    <button
                      onClick={async () => {
                        setIsRegenerating(true);
                        try {
                          await onRegenerateSlide?.(selectedSlide);
                          showToast?.('已提交重新生成请求', 'success');
                        } catch (error) {
                          showToast?.('重新生成失败', 'error');
                        } finally {
                          setIsRegenerating(false);
                        }
                      }}
                      disabled={isRegenerating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {isRegenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {isRegenerating ? '生成中...' : '重新生成'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lightbox 全屏查看 */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImage}
              alt="全屏预览"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
