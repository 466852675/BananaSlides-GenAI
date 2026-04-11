/**
 * HistoryConfirmCard 历史确认卡片组件
 *
 * 用于展示已完成任务的确认卡片历史记录
 * 显示任务执行时的详细内容（配置、大纲、内容、配图）
 *
 * v2.0 增强功能：
 * - 配图卡片支持图片放大预览
 * - 内容卡片支持查看全部页面
 * - 统计信息汇总显示
 * - 快速操作入口
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Settings,
  Layers,
  Eye,
  X,
  Clock,
  Coins,
  Edit3,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Palette,
  Layout,
  Hash,
  FileText as FileTextIcon
} from 'lucide-react';

interface HistoryConfirmCardProps {
  task: {
    id: string;
    type: string;
    status: string;
    result?: string | null;
    pointsCost?: number;
    completedAt?: string | null;
  };
}

export default function HistoryConfirmCard({ task }: HistoryConfirmCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAllSlides, setShowAllSlides] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 解析任务结果
  const result = useMemo(() => {
    if (!task.result) return null;
    try {
      // 如果已经是对象，直接返回
      if (typeof task.result === 'object') return task.result;
      // 如果是字符串，解析JSON
      return JSON.parse(task.result);
    } catch (error) {
      console.error('[HistoryConfirmCard] JSON解析失败:', error);
      return null;
    }
  }, [task.result]);

  if (!result) return null;

  // 根据任务类型获取图标和标题
  const getTaskInfo = () => {
    switch (task.type) {
      case 'CONFIG_CONFIRM':
        return {
          icon: <Settings className="w-4 h-4" />,
          title: '配置确认',
          color: 'text-blue-600 bg-blue-50'
        };
      case 'OUTLINE':
        return {
          icon: <FileText className="w-4 h-4" />,
          title: '大纲确认',
          color: 'text-purple-600 bg-purple-50'
        };
      case 'CONTENT':
        return {
          icon: <Layers className="w-4 h-4" />,
          title: '内容确认',
          color: 'text-green-600 bg-green-50'
        };
      case 'IMAGE':
        return {
          icon: <Image className="w-4 h-4" />,
          title: '配图确认',
          color: 'text-orange-600 bg-orange-50'
        };
      default:
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          title: task.type,
          color: 'text-gray-600 bg-gray-50'
        };
    }
  };

  const taskInfo = getTaskInfo();

  // 渲染配置确认内容 - 增强信息展示
  const renderConfigContent = () => {
    const config = result.config || result;

    // 获取配色方案
    const colorPalette = config.colorPalette || [];
    const colorLabels = ['主色', '辅色', '背景色', '文字色'];

    // 判断配置来源
    const configSource = result.configSource || 'ai_generated';
    const isUserSelected = configSource === 'user_selected';

    // 页面结构信息
    const pageStructure = config.pageStructure || {
      cover: 1,
      directory: 1,
      transition: 0,
      content: Math.max(1, (config.pageCount || 10) - 3),
      end: 1
    };

    return (
      <div className="space-y-3">
        {/* 配置来源标识 */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            isUserSelected
              ? 'bg-green-100 text-green-600'
              : 'bg-purple-100 text-purple-600'
          }`}>
            {isUserSelected ? '✓ 用户选择模板' : '✨ AI 自动生成'}
          </span>
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-gray-500">主题：</span>
              <span className="font-medium">{result.topic || config.topic || '未命名'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-gray-500">页数：</span>
              <span className="font-medium">{config.pageCount || 10} 页</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-gray-500">风格：</span>
              <span className="font-medium">{config.styleName || '商务'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-gray-500">比例：</span>
              <span className="font-medium">{config.aspectRatio || '16:9'}</span>
            </div>
          </div>
        </div>

        {/* 页面结构详情 */}
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-xs text-gray-500 mb-1.5">页面结构</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">封面 {pageStructure.cover}</span>
            <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">目录 {pageStructure.directory}</span>
            {pageStructure.transition > 0 && (
              <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">过渡 {pageStructure.transition}</span>
            )}
            <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded">内容 {pageStructure.content}</span>
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">结束 {pageStructure.end}</span>
          </div>
        </div>

        {/* 每页生成数 */}
        {config.pagesPerGeneration && (
          <div className="flex items-center gap-2 text-sm">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">每页生成数：</span>
            <span className="font-medium">{config.pagesPerGeneration} 页/次</span>
            <span className="text-xs text-gray-400">
              ({config.pagesPerGeneration === 1 ? '精细模式' : config.pagesPerGeneration === 2 ? '标准模式' : '快速模式'})
            </span>
          </div>
        )}

        {/* 配色方案 */}
        {colorPalette.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">配色：</span>
            <div className="flex gap-1.5">
              {colorPalette.slice(0, 4).map((color: string, i: number) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-md border border-gray-200 shadow-sm relative group cursor-pointer"
                  style={{ backgroundColor: color }}
                >
                  {/* 颜色值 tooltip */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-white px-1 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {color}
                  </div>
                </div>
              ))}
            </div>
            {config.colorPaletteName && (
              <span className="text-xs text-gray-400">{config.colorPaletteName}</span>
            )}
          </div>
        )}

        {/* 设计要求 */}
        {config.requirements && (
          <div className="bg-blue-50 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <FileTextIcon className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium text-blue-600">设计要求</span>
            </div>
            <div className="text-sm text-gray-700">{config.requirements}</div>
          </div>
        )}

        {/* 积分消耗 */}
        {task.pointsCost > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Coins className="w-4 h-4" />
            <span>消耗积分：{task.pointsCost}</span>
          </div>
        )}
      </div>
    );
  };

  // 渲染大纲内容 - 支持章节层级展示
  const renderOutlineContent = () => {
    const slides = result.slides || [];

    // 按 pageType 分组
    const groups = {
      cover: slides.filter((s: any) => s.pageType === 'cover'),
      directory: slides.filter((s: any) => s.pageType === 'directory'),
      transition: slides.filter((s: any) => s.pageType === 'transition'),
      content: slides.filter((s: any) => s.pageType === 'content'),
      end: slides.filter((s: any) => s.pageType === 'end')
    };

    // 章节类型标签
    const sectionLabels: Record<string, { label: string; color: string }> = {
      cover: { label: '封面页', color: 'bg-blue-100 text-blue-600' },
      directory: { label: '目录页', color: 'bg-purple-100 text-purple-600' },
      transition: { label: '章节过渡', color: 'bg-amber-100 text-amber-600' },
      content: { label: '内容页', color: 'bg-green-100 text-green-600' },
      end: { label: '结束页', color: 'bg-gray-100 text-gray-600' }
    };

    // 渲染单张幻灯片
    const renderSlideItem = (slide: any, index: number, globalIndex: number) => (
      <div
        key={slide.id || globalIndex}
        className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
      >
        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded text-xs font-medium">
          {globalIndex + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{slide.title}</div>
          {slide.content && (
            <div className="text-gray-500 text-xs line-clamp-2 mt-0.5">
              {slide.content.substring(0, 100)}...
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-500 mb-2">
          共 {slides.length} 页大纲
        </div>

        {/* 章节层级展示 */}
        <div className="max-h-60 overflow-y-auto space-y-3">
          {/* 封面 */}
          {groups.cover.length > 0 && (
            <div>
              <div className={`text-xs font-bold px-2 py-1 rounded ${sectionLabels.cover.color}`}>
                {sectionLabels.cover.label} ({groups.cover.length})
              </div>
              <div className="space-y-1.5 mt-1.5">
                {groups.cover.map((slide: any, idx: number) => renderSlideItem(slide, idx, slides.indexOf(slide)))}
              </div>
            </div>
          )}

          {/* 目录 */}
          {groups.directory.length > 0 && (
            <div>
              <div className={`text-xs font-bold px-2 py-1 rounded ${sectionLabels.directory.color}`}>
                {sectionLabels.directory.label} ({groups.directory.length})
              </div>
              <div className="space-y-1.5 mt-1.5">
                {groups.directory.map((slide: any, idx: number) => renderSlideItem(slide, idx, slides.indexOf(slide)))}
              </div>
            </div>
          )}

          {/* 章节过渡 */}
          {groups.transition.length > 0 && (
            <div>
              <div className={`text-xs font-bold px-2 py-1 rounded ${sectionLabels.transition.color}`}>
                {sectionLabels.transition.label} ({groups.transition.length})
              </div>
              <div className="space-y-1.5 mt-1.5">
                {groups.transition.map((slide: any, idx: number) => renderSlideItem(slide, idx, slides.indexOf(slide)))}
              </div>
            </div>
          )}

          {/* 内容页 */}
          {groups.content.length > 0 && (
            <div>
              <div className={`text-xs font-bold px-2 py-1 rounded ${sectionLabels.content.color}`}>
                {sectionLabels.content.label} ({groups.content.length})
              </div>
              <div className="space-y-1.5 mt-1.5">
                {groups.content.map((slide: any, idx: number) => renderSlideItem(slide, idx, slides.indexOf(slide)))}
              </div>
            </div>
          )}

          {/* 结束页 */}
          {groups.end.length > 0 && (
            <div>
              <div className={`text-xs font-bold px-2 py-1 rounded ${sectionLabels.end.color}`}>
                {sectionLabels.end.label} ({groups.end.length})
              </div>
              <div className="space-y-1.5 mt-1.5">
                {groups.end.map((slide: any, idx: number) => renderSlideItem(slide, idx, slides.indexOf(slide)))}
              </div>
            </div>
          )}

          {/* 如果没有 pageType 信息，则按原有方式显示 */}
          {groups.cover.length === 0 && groups.directory.length === 0 &&
           groups.transition.length === 0 && groups.content.length === 0 &&
           groups.end.length === 0 && (
            <div className="space-y-1.5">
              {slides.map((slide: any, index: number) => (
                <div
                  key={slide.id || index}
                  className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded text-xs font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{slide.title}</div>
                    {slide.content && (
                      <div className="text-gray-500 text-xs line-clamp-2 mt-0.5">
                        {slide.content.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染内容确认
  const renderContentContent = () => {
    const slides = result.slides || [];
    const processed = result.slidesProcessed || slides.length;
    const displaySlides = showAllSlides ? slides : slides.slice(0, 3);

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-500">
          已为 {processed} 页幻灯片生成详细内容
        </div>
        <div className={showAllSlides ? 'max-h-80 overflow-y-auto' : 'max-h-40 overflow-y-auto'}>
          {displaySlides.map((slide: any, index: number) => (
            <div key={slide.id || index} className="p-2 bg-gray-50 rounded mb-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-green-100 text-green-600 rounded text-xs font-medium">
                  {index + 1}
                </span>
                <div className="font-medium truncate">{slide.title}</div>
              </div>
              <div className="text-gray-500 text-xs line-clamp-2 mt-0.5 ml-7">
                {slide.content?.substring(0, 150)}...
              </div>
            </div>
          ))}
        </div>
        {slides.length > 3 && (
          <button
            onClick={() => setShowAllSlides(!showAllSlides)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            {showAllSlides ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                收起
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                查看全部 {slides.length} 页
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // 渲染配图确认
  const renderImageContent = () => {
    const images = result.images || [];
    const generated = result.imagesGenerated || images.length;

    // 图片导航函数
    const navigateImage = (direction: number) => {
      const newIndex = lightboxIndex + direction;
      if (newIndex >= 0 && newIndex < images.length) {
        setLightboxIndex(newIndex);
        setLightboxImage(images[newIndex].imageUrl);
      }
    };

    return (
      <div className="space-y-2">
        <div className="text-sm text-gray-500">
          已生成 {generated} 张配图
        </div>
        {/* 所有配图网格展示 */}
        <div className="grid grid-cols-5 gap-2">
          {images.map((img: any, index: number) => (
            <div
              key={index}
              className="aspect-square bg-gray-100 rounded overflow-hidden relative group cursor-pointer"
              onClick={() => {
                if (img.imageUrl) {
                  setLightboxIndex(index);
                  setLightboxImage(img.imageUrl);
                }
              }}
            >
              {img.imageUrl ? (
                <img
                  src={img.imageUrl}
                  alt={img.slideTitle || `配图${index + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-4 h-4 text-white" />
              </div>
              {/* 序号标签 */}
              <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox 图片放大预览 */}
        <AnimatePresence>
          {lightboxImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setLightboxImage(null)}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* 图片信息 */}
              <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1.5 rounded">
                {images[lightboxIndex]?.slideTitle || `配图 ${lightboxIndex + 1}`} / 共 {images.length} 张
              </div>

              {/* 图片 */}
              <img
                src={lightboxImage}
                alt="放大预览"
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              />

              {/* 左右切换按钮 */}
              {lightboxIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(-1);
                  }}
                  className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
              )}
              {lightboxIndex < images.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateImage(1);
                  }}
                  className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // 根据任务类型渲染内容
  const renderContent = () => {
    switch (task.type) {
      case 'CONFIG_CONFIRM':
        return renderConfigContent();
      case 'OUTLINE':
        return renderOutlineContent();
      case 'CONTENT':
        return renderContentContent();
      case 'IMAGE':
        return renderImageContent();
      default:
        return (
          <div className="text-sm text-gray-500">
            任务已完成
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* 头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${taskInfo.color}`}>
            {taskInfo.icon}
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">{taskInfo.title}</div>
            <div className="text-xs text-gray-500">
              {task.pointsCost > 0 ? `消耗 ${task.pointsCost} 积分` : '已确认'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* 展开内容 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-gray-100">
              {renderContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}