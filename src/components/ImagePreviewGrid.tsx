/**
 * ImagePreviewGrid 配图预览网格组件
 *
 * 用于配图生成后的批量确认流程
 * 支持单选/多选、重新生成选中配图、全部确认
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, RefreshCw, CheckCircle, Image as ImageIcon, AlertCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImagePreview {
  slideIndex: number;
  slideTitle?: string;
  imageUrl: string;
  pageType?: string;
}

interface ImagePreviewGridProps {
  images: ImagePreview[];
  onRegenerateSelected: (indexes: number[], prompt?: string) => void;
  onConfirmAll: () => void;
  isLoading?: boolean;
}

export default function ImagePreviewGrid({
  images,
  onRegenerateSelected,
  onConfirmAll,
  isLoading = false
}: ImagePreviewGridProps) {
  // 选中的图片索引
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const navigateLightbox = useCallback((delta: number) => {
    setLightboxIndex(prev => {
      if (prev === null) return null;
      const next = prev + delta;
      return next >= 0 && next < images.length ? next : prev;
    });
  }, [images.length]);

  // 切换选中状态
  const toggleSelect = useCallback((index: number) => {
    setSelectedIndexes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIndexes.size === images.length) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(new Set(images.map((_, i) => i)));
    }
  }, [selectedIndexes.size, images.length]);

  // 重新生成选中的配图
  const handleRegenerateSelected = useCallback(() => {
    if (selectedIndexes.size > 0) {
      onRegenerateSelected(Array.from(selectedIndexes));
      setSelectedIndexes(new Set());
    }
  }, [selectedIndexes, onRegenerateSelected]);

  // 页面类型标签
  const getPageTypeLabel = (pageType?: string) => {
    const labels: Record<string, string> = {
      'cover': '封面',
      'directory': '目录',
      'content': '内容',
      'end': '结尾',
      'transition': '过渡'
    };
    return pageType ? labels[pageType] || pageType : '';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* 标题 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-800">配图预览</h3>
          <span className="text-xs text-gray-400">({images.length}张)</span>
        </div>
        <button
          onClick={toggleSelectAll}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {selectedIndexes.size === images.length ? '取消全选' : '全选'}
        </button>
      </div>

      {/* 提示 */}
      <p className="text-xs text-gray-500 mb-4">
        点击选择不满意的配图，可以批量重新生成
      </p>

      {/* 图片网格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
        {images.map((image, index) => {
          const isSelected = selectedIndexes.has(index);
          return (
            <motion.button
              key={index}
              onClick={() => toggleSelect(index)}
              onDoubleClick={(e) => openLightbox(index, e)}
              className={`relative aspect-[16/9] rounded-lg overflow-hidden border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 图片 */}
              <img
                src={image.imageUrl}
                alt={image.slideTitle || `第${index + 1}页`}
                className="w-full h-full object-contain bg-gray-100"
                loading="lazy"
              />

              {/* 选中标记 */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 序号和标题 */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <div className="flex items-center gap-1 text-white text-[10px]">
                  <span className="font-medium">第{index + 1}页</span>
                  {image.pageType && (
                    <span className="px-1 py-0.5 bg-white/20 rounded text-[9px]">
                      {getPageTypeLabel(image.pageType)}
                    </span>
                  )}
                </div>
                {image.slideTitle && (
                  <p className="text-white/80 text-[10px] truncate mt-0.5">
                    {image.slideTitle}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          {selectedIndexes.size > 0 ? (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              已选择 {selectedIndexes.size} 张配图
            </span>
          ) : (
            '点击图片选择要重新生成的配图'
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerateSelected}
            disabled={selectedIndexes.size === 0 || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            重新生成选中
          </button>
          <button
            onClick={onConfirmAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            全部确认
          </button>
        </div>
      </div>

      {/* Lightbox 放大预览 */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <img
              src={images[lightboxIndex]?.imageUrl}
              alt={images[lightboxIndex]?.slideTitle || ''}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button onClick={closeLightbox} className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <X className="h-6 w-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }} disabled={lightboxIndex === 0} className="absolute left-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }} disabled={lightboxIndex === images.length - 1} className="absolute right-4 p-2 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30">
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="absolute bottom-4 text-white/60 text-sm">{lightboxIndex + 1} / {images.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}