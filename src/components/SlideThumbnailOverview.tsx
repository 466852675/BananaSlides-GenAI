/**
 * SlideThumbnailOverview 幻灯片缩略图总览组件
 *
 * 横向排列所有页面缩略图，用于最终确认
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check, RefreshCw, Edit2, Download } from 'lucide-react';

interface SlideThumbnail {
  index: number;
  title: string;
  imageUrl?: string;
  pageType?: string;
}

interface SlideThumbnailOverviewProps {
  slides: SlideThumbnail[];
  onConfirm: () => void;
  onRegenerateAll: () => void;
  onModifySlide?: (index: number) => void;
  onExportZip?: () => void;
  onExportPdf?: () => void;
  onExportPptx?: () => void;
  isLoading?: boolean;
}

export default function SlideThumbnailOverview({
  slides,
  onConfirm,
  onRegenerateAll,
  onModifySlide,
  onExportZip,
  onExportPdf,
  onExportPptx,
  isLoading = false
}: SlideThumbnailOverviewProps) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">
        全部 {slides.length} 页预览
      </div>

      {/* 横向滚动缩略图 */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {slides.map((slide, idx) => (
            <motion.div
              key={slide.index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex-shrink-0 w-32"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group">
                {slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">
                      {slide.index + 1}
                    </span>
                  </div>
                )}

                {/* 悬停遮罩 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => onModifySlide?.(slide.index)}
                    className="p-2 bg-white/90 rounded-full hover:bg-white"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 序号标签 */}
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {slide.index + 1}
                </div>
              </div>

              {/* 标题 */}
              <div className="mt-1 text-xs text-gray-600 truncate">
                {slide.title}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerateAll}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新生成全部
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 导出按钮组 */}
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
            <button
              onClick={onExportZip}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Download className="h-3.5 w-3.5" />
              ZIP
            </button>
            <button
              onClick={onExportPdf}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              PDF
            </button>
            <button
              onClick={onExportPptx}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              PPTX
            </button>
          </div>

          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            验收确认
          </button>
        </div>
      </div>
    </div>
  );
}
