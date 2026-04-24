/**
 * StreamingOutlineDisplay 流式大纲展示组件
 *
 * 实时显示生成中的大纲内容，支持逐条添加动画
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';

interface OutlineSlide {
  index: number;
  title: string;
  brief?: string;
  pageType?: string;
}

interface StreamingOutlineDisplayProps {
  slides: OutlineSlide[];
  isGenerating: boolean;
  currentIndex?: number;
}

export default function StreamingOutlineDisplay({
  slides,
  isGenerating,
  currentIndex = -1
}: StreamingOutlineDisplayProps) {
  const [timeoutError, setTimeoutError] = useState(false);

  useEffect(() => {
    if (!isGenerating) {
      setTimeoutError(false);
      return;
    }
    setTimeoutError(false);
    const timer = setTimeout(() => setTimeoutError(true), 180000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  return (
    <div className="space-y-3">
      {/* 生成中提示 */}
      {isGenerating && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700">
            {slides.length === 0 ? '正在构思大纲...' : `已生成 ${slides.length} 页...`}
          </span>
        </div>
      )}

      {/* 超时提示 */}
      {timeoutError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">大纲生成超时，请尝试重新生成</span>
        </div>
      )}

      {/* 大纲列表 */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {slides.map((slide, index) => (
            <motion.div
              key={slide.index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex items-start gap-2 p-2 rounded-lg ${
                index === currentIndex
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {slide.title}
                </div>
                {slide.brief && (
                  <div className="text-xs text-gray-500 mt-1">
                    {slide.brief}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 完成提示 */}
      {!isGenerating && slides.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
          <span className="text-sm text-green-700">
            大纲生成完成，共 {slides.length} 页
          </span>
        </div>
      )}
    </div>
  );
}
