/**
 * ImagePlaceholderGrid 图片占位符网格组件
 *
 * 显示每页的占位符，生成中显示动画，生成完成显示图片
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Edit2, ChevronRight } from 'lucide-react';

interface ImagePageStatus {
  slideIndex: number;
  slideTitle: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

interface ImagePlaceholderGridProps {
  pages: ImagePageStatus[];
  totalPages: number;
  currentPage: number;
  onRegeneratePage?: (slideIndex: number) => void;
  onModifyPage?: (slideIndex: number) => void;
  onContinue?: () => void;
  isLoading?: boolean;
}

export default function ImagePlaceholderGrid({
  pages,
  totalPages,
  currentPage,
  onRegeneratePage,
  onModifyPage,
  onContinue,
  isLoading = false
}: ImagePlaceholderGridProps) {
  // 获取当前正在生成的页面
  const generatingPage = pages.find(p => p.status === 'generating');

  return (
    <div className="space-y-4">
      {/* 进度指示器 */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          配图生成进度
        </div>
        <div className="text-xs text-gray-500">
          已完成 {pages.filter(p => p.status === 'completed').length} / {totalPages} 页
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 w-full rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-blue-500"
          initial={{ width: 0 }}
          animate={{
            width: `${(pages.filter(p => p.status === 'completed').length / totalPages) * 100}%`
          }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* 当前生成中的页面大卡片 */}
      <AnimatePresence mode="wait">
        {generatingPage && (
          <motion.div
            key={generatingPage.slideIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-video rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-6"
          >
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <div className="text-lg font-medium text-gray-700">
              第 {generatingPage.slideIndex + 1} 页 / 共 {totalPages} 页
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {generatingPage.slideTitle}
            </div>
            <div className="text-xs text-gray-400 mt-4">
              AI 正在生成配图...
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 已完成的页面缩略图网格 */}
      {pages.filter(p => p.status === 'completed').length > 0 && (
        <div className="grid grid-cols-5 gap-2">
          {pages
            .filter(p => p.status === 'completed')
            .map((page, idx) => (
              <motion.div
                key={page.slideIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 group"
              >
                {page.imageUrl ? (
                  <img
                    src={page.imageUrl}
                    alt={`第 ${page.slideIndex + 1} 页`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{page.slideIndex + 1}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <button
                    onClick={() => onRegeneratePage?.(page.slideIndex)}
                    className="p-1.5 bg-white/90 rounded hover:bg-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onModifyPage?.(page.slideIndex)}
                    className="p-1.5 bg-white/90 rounded hover:bg-white"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                  <span className="text-xs text-white">{page.slideIndex + 1}</span>
                </div>
              </motion.div>
            ))}
        </div>
      )}

      {/* 操作按钮 */}
      {generatingPage && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onRegeneratePage?.(generatingPage.slideIndex)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新生成
          </button>
          <button
            onClick={() => onModifyPage?.(generatingPage.slideIndex)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Edit2 className="h-3.5 w-3.5" />
            修改
          </button>
        </div>
      )}

      {/* 继续按钮（当当前页完成时显示） */}
      {pages[currentPage]?.status === 'completed' && currentPage < totalPages - 1 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50"
          >
            <span>继续生成第 {currentPage + 2} 页</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
