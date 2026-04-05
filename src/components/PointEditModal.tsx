/**
 * PointEditModal 点对点编辑模态框
 *
 * 用于精确编辑特定页面的标题、内容、配图等
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Image, Type, FileText, Wand2 } from 'lucide-react';

interface PointEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  slideIndex: number;
  slideTitle: string;
  slideContent?: string;
  imageUrl?: string;
  onSave: (data: { title?: string; content?: string; imagePrompt?: string }) => void;
  onRegenerateImage?: (prompt?: string) => void;
  isLoading?: boolean;
}

export default function PointEditModal({
  isOpen,
  onClose,
  slideIndex,
  slideTitle,
  slideContent = '',
  imageUrl,
  onSave,
  onRegenerateImage,
  isLoading = false
}: PointEditModalProps) {
  const [title, setTitle] = useState(slideTitle);
  const [content, setContent] = useState(slideContent);
  const [imagePrompt, setImagePrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'content' | 'image'>('content');

  // 重置表单当打开时
  useEffect(() => {
    if (isOpen) {
      setTitle(slideTitle);
      setContent(slideContent);
      setImagePrompt('');
      setActiveTab('content');
    }
  }, [isOpen, slideTitle, slideContent]);

  const handleSave = () => {
    onSave({
      title: title !== slideTitle ? title : undefined,
      content: content !== slideContent ? content : undefined,
      imagePrompt: imagePrompt || undefined
    });
  };

  const handleRegenerateImage = () => {
    onRegenerateImage?.(imagePrompt || undefined);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    编辑第 {slideIndex + 1} 页
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    精确修改页面内容和配图
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* 标签切换 */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('content')}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'content'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  内容编辑
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'image'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Image className="h-4 w-4" />
                  配图编辑
                </button>
              </div>

              {/* 内容区域 */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {activeTab === 'content' ? (
                  <div className="space-y-4">
                    {/* 标题编辑 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Type className="h-4 w-4" />
                        页面标题
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="输入页面标题..."
                      />
                    </div>

                    {/* 内容编辑 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <FileText className="h-4 w-4" />
                        页面内容
                      </label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="输入页面内容..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 当前配图预览 */}
                    {imageUrl ? (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          当前配图
                        </label>
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={imageUrl}
                            alt="当前配图"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <Image className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">暂无配图</p>
                        </div>
                      </div>
                    )}

                    {/* 图片描述输入 */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Wand2 className="h-4 w-4" />
                        重新生成描述（可选）
                      </label>
                      <textarea
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="输入新的图片描述，如不输入则使用默认描述重新生成..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        留空将使用页面内容自动重新生成配图
                      </p>
                    </div>

                    {/* 重新生成按钮 */}
                    {onRegenerateImage && (
                      <button
                        onClick={handleRegenerateImage}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                      >
                        <Wand2 className="h-4 w-4" />
                        {isLoading ? '生成中...' : '重新生成配图'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 底部操作栏 */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || (title === slideTitle && content === slideContent && !imagePrompt)}
                  className="flex items-center gap-2 px-6 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
