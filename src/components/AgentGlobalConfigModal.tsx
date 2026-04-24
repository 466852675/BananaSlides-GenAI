/**
 * AgentGlobalConfigModal Agent 全局配置弹窗组件
 *
 * 复刻工作台页面全局配置区域的功能：
 * - 上传风格参考图
 * - 风格、比例、配色选择
 * - 页面数量与结构
 * - 全局设计要求
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  ZoomIn,
  AlertCircle
} from 'lucide-react';
import { StyleControls } from './StyleControls';
import type { StyleConfig, GlobalStyleMap, PageType } from '../types';
import { resolveResourceUrl } from '../utils/resource';
import { smartRefine } from '../services/geminiService';

interface AgentGlobalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: StyleConfig, styleMap: GlobalStyleMap) => void;
  config: StyleConfig;
  styleMap: GlobalStyleMap;
  onStyleMapChange?: (styleMap: GlobalStyleMap) => void;
  onResetAll?: () => void;
}

// 页面类型标签
const PAGE_TYPE_LABELS: Record<PageType, string> = {
  cover: '封面',
  directory: '目录',
  transition: '章节过渡',
  content: '内容正文',
  end: '结束页',
  custom: '自定义'
};

// 页面类型顺序
const PAGE_TYPES: PageType[] = ['cover', 'directory', 'transition', 'content', 'end'];

export default function AgentGlobalConfigModal({
  isOpen,
  onClose,
  onSave,
  config: initialConfig,
  styleMap: initialStyleMap,
  onStyleMapChange,
  onResetAll
}: AgentGlobalConfigModalProps) {
  const [config, setConfig] = useState<StyleConfig>(initialConfig);
  const [styleMap, setStyleMap] = useState<GlobalStyleMap>(initialStyleMap);
  const [activePreviewType, setActivePreviewType] = useState<PageType>('cover');
  const [isRefiningRequirements, setIsRefiningRequirements] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 同步外部状态
  useEffect(() => {
    setConfig(initialConfig);
    setStyleMap(initialStyleMap);
  }, [initialConfig, initialStyleMap]);

  // 处理配置变更
  const handleConfigChange = (key: keyof StyleConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // 处理风格图片上传
  const handleStyleImageUpload = (type: PageType, file: File | null) => {
    const newStyleMap = { ...styleMap, [type]: file };
    setStyleMap(newStyleMap);
    onStyleMapChange?.(newStyleMap);
  };

  // 清空所有风格图片
  const handleClearAllStyleImages = () => {
    const clearedMap: GlobalStyleMap = {
      cover: null,
      directory: null,
      transition: null,
      content: null,
      end: null,
      custom: null
    };
    setStyleMap(clearedMap);
    onStyleMapChange?.(clearedMap);
  };

  // 清空所有配置（风格参考图 + 风格配置）
  const confirmReset = () => {
    setShowResetConfirm(false);
    // 清空风格参考图
    const clearedMap: GlobalStyleMap = {
      cover: null,
      directory: null,
      transition: null,
      content: null,
      end: null,
      custom: null
    };
    setStyleMap(clearedMap);

    // 清空风格配置
    const clearedConfig: StyleConfig = {
      styleName: '',
      aspectRatio: '16:9',
      colorPalette: '',
      targetPageCount: 10,
      defaultVariantCount: 4,
      pageStructure: {
        cover: 1,
        directory: 1,
        transition: 0,
        content: 7,
        end: 1
      },
      requirements: ''
    };
    setConfig(clearedConfig);

    // 立即保存清空后的配置
    onSave(clearedConfig, clearedMap);

    // 通知父组件重置所有（包括清除 Agent 模式的选中状态）
    onResetAll?.();

    // 关闭弹窗
    onClose();
  };

  // AI 智能修饰设计要求
  const handleRefineRequirements = async () => {
    if (!(config.requirements || '').trim()) return;

    try {
      setIsRefiningRequirements(true);
      const refined = await smartRefine(config.requirements, 'requirement');
      handleConfigChange('requirements', refined);
    } catch (error) {
      console.error('Failed to refine requirements:', error);
    } finally {
      setIsRefiningRequirements(false);
    }
  };

  // 保存配置
  const handleSave = () => {
    onSave(config, styleMap);
    onClose();
  };

  // 解析资源 URL
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const getImageUrl = useCallback((resource: File | string | null): string | null => {
    if (!resource) return null;
    if (resource instanceof File) {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(resource);
      objectUrlRef.current = url;
      return url;
    }
    return resolveResourceUrl(resource);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl max-h-[90vh] rounded-xl bg-white shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">全局配置</h2>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="关闭"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧：风格参考图上传 */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700">风格参考图</h3>
                  <button
                    onClick={handleClearAllStyleImages}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    全部清空
                  </button>
                </div>

                {/* 页面类型选择 */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PAGE_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setActivePreviewType(type)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        activePreviewType === type
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {PAGE_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>

                {/* 图片上传/预览区域 */}
                <div className="aspect-[4/3] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden relative">
                  {styleMap[activePreviewType] ? (
                    <div className="w-full h-full relative group">
                      <img
                        src={getImageUrl(styleMap[activePreviewType])!}
                        alt={PAGE_TYPE_LABELS[activePreviewType]}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="cursor-pointer bg-white text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100">
                          更换
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleStyleImageUpload(activePreviewType, file);
                            }}
                          />
                        </label>
                        <button
                          onClick={() => handleStyleImageUpload(activePreviewType, null)}
                          className="bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                      <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-gray-100">
                        <Upload className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 mb-1">上传{PAGE_TYPE_LABELS[activePreviewType]}参考图</p>
                      <p className="text-xs text-gray-400">点击或拖拽图片到此处</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleStyleImageUpload(activePreviewType, file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  为不同页面类型设置风格参考图，AI 生成时会参考图片风格
                </p>
              </div>

              {/* 右侧：风格配置 */}
              <div className="lg:col-span-2 space-y-6">
                {/* StyleControls 组件 */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <StyleControls
                    config={config}
                    onChange={handleConfigChange}
                  />
                </div>

                {/* 全局设计要求 */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gray-500" />
                    全局设计要求
                  </h3>
                  <div className="relative">
                    <textarea
                      value={config.requirements}
                      onChange={e => handleConfigChange('requirements', e.target.value)}
                      placeholder="例如：封面使用极简科技风格，主色调为深蓝与白色，标题使用无衬线字体，正文排版清晰，强调商务专业感..."
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all resize-none h-32"
                    />
                    <button
                      onClick={handleRefineRequirements}
                      disabled={isRefiningRequirements || !(config.requirements || '').trim()}
                      className={`absolute bottom-3 right-3 p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all shadow-sm
                        ${!(config.requirements || '').trim()
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                          : isRefiningRequirements
                            ? 'bg-blue-50 text-blue-400 cursor-wait'
                            : 'bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 hover:shadow-md'
                        }
                      `}
                      title="AI 智能修饰设计要求"
                    >
                      {isRefiningRequirements ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>AI 修饰</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-between items-center gap-3 border-t border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">
                修改全局配置将影响后续所有 AI 生成的内容
              </p>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-xs text-red-500 hover:text-red-600 underline"
              >
                重置所有配置
              </button>
            </div>

            {/* 重置确认对话框 */}
            {showResetConfirm && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                  <h3 className="text-lg font-semibold text-gray-900">重置所有配置</h3>
                  <p className="mt-2 text-sm text-gray-600">
                    确定要重置所有配置吗？此操作不可撤销，所有风格参考图和配置将被清空。
                  </p>
                  <div className="mt-4 flex gap-3 justify-end">
                    <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">取消</button>
                    <button onClick={confirmReset} className="px-4 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100">确认重置</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-gray-800"
              >
                <Save className="h-4 w-4" />
                保存
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}