/**
 * ConfirmationCard 分步确认卡片组件
 *
 * 用于显示大纲、内容、配图的确认交互
 * 支持移动端响应式布局
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit2, RefreshCw, ChevronDown, ChevronUp, Coins, X, Save, Plus, Minus, AlertCircle, StopCircle, Sparkles, Lightbulb } from 'lucide-react';
import ImagePreviewGrid from './ImagePreviewGrid';
import AgentConfigConfirmCard from './AgentConfigConfirmCard';
import StreamingOutlineDisplay from './StreamingOutlineDisplay';
import ImagePlaceholderGrid from './ImagePlaceholderGrid';
import SlideThumbnailOverview from './SlideThumbnailOverview';
import type { AgentTask, AgentTaskType } from '../types/agent';
import { CommercialGuard } from './CommercialGuard';

// 移动端断点
const MOBILE_BREAKPOINT = 768;

interface ConfirmationCardProps {
  task: AgentTask;
  onConfirm: (taskId: string) => void;
  onModify: (taskId: string, modifiedData?: any) => void;
  onRegenerate: (taskId: string) => void;
  onRegenerateSelectedImages?: (indexes: number[], prompt?: string) => void;
  onConfirmAllImages?: () => void;
  onRegeneratePage?: (slideIndex: number) => void;
  onModifyPage?: (slideIndex: number) => void;
  onSendAiModify?: (instruction: string) => void;
  onContinue?: () => void;
  onExportZip?: () => void;
  onExportPdf?: () => void;
  onExportPptx?: () => void;
  streamingOutline?: { slides: any[]; isGenerating: boolean };
  streamingContent?: { slides: any[]; isGenerating: boolean };
  isLoading?: boolean;
  estimatedPoints?: number;
  isVip?: boolean;
}

// 页面类型标签样式和文案
function getPageTypeBadge(pageType?: string): { label: string; className: string } {
  switch (pageType) {
    case 'cover': return { label: '封面', className: 'bg-purple-50 text-purple-600' };
    case 'directory': return { label: '目录', className: 'bg-orange-50 text-orange-600' };
    case 'end': return { label: '结尾', className: 'bg-slate-700 text-white' };
    case 'transition': return { label: '过渡', className: 'bg-teal-50 text-teal-600' };
    default: return { label: '内容', className: 'bg-indigo-50 text-indigo-500' };
  }
}

// 基于规则的大纲建议分析（无需额外 AI 调用）
function analyzeOutlineSuggestions(slides: any[]): Map<number, string> {
  const suggestions = new Map<number, string>();

  if (!slides || slides.length === 0) return suggestions;

  // 1. 内容过多的页面（标题+摘要超过 100 字）→ 建议拆分
  slides.forEach((slide, index) => {
    const textLength = (slide.title?.length || 0) + (slide.content?.length || 0);
    if (textLength > 100 && slide.pageType === 'content') {
      suggestions.set(index, '内容较多，建议拆分为两页');
    }
  });

  // 2. 缺少封面或结尾
  const hasCover = slides.some(s => s.pageType === 'cover');
  const hasEnd = slides.some(s => s.pageType === 'end');
  const hasDirectory = slides.some(s => s.pageType === 'directory');
  if (!hasCover && slides.length > 0) {
    suggestions.set(0, '建议添加封面页');
  }
  if (!hasEnd && slides.length > 2) {
    suggestions.set(slides.length - 1, '建议添加结尾页');
  }
  if (!hasDirectory && slides.length > 5) {
    suggestions.set(1, '页数较多，建议添加目录页');
  }

  // 3. 内容页占比过低（非内容页超过 40%）
  const contentPages = slides.filter(s => s.pageType === 'content' || !s.pageType).length;
  if (slides.length > 5 && contentPages / slides.length < 0.6) {
    const firstContentIdx = slides.findIndex(s => s.pageType === 'content' || !s.pageType);
    if (firstContentIdx >= 0 && !suggestions.has(firstContentIdx)) {
      suggestions.set(firstContentIdx, '内容页占比偏低，建议减少辅助页或增加内容页');
    }
  }

  // 4. 连续两个内容页标题相同或极相似
  for (let i = 1; i < slides.length; i++) {
    const prev = slides[i - 1]?.title || '';
    const curr = slides[i]?.title || '';
    if (prev && curr && (prev === curr || (prev.length > 3 && curr.length > 3 && levenshtein(prev, curr) <= 2))) {
      if (!suggestions.has(i)) {
        suggestions.set(i, '与上一页标题相似，建议调整区分度');
      }
    }
  }

  return suggestions;
}

// 简易编辑距离（用于标题相似度判断）
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// 获取确认类型标题
function getConfirmationTitle(type: AgentTaskType): string {
  switch (type) {
    case 'OUTLINE':
      return '大纲确认';
    case 'CONTENT':
      return '内容确认';
    case 'IMAGE':
      return '配图确认';
    case 'CONFIG_CONFIRM':
      return '配置确认';
    case 'IMAGE_BY_PAGE':
      return '逐页配图';
    case 'FINAL_OVERVIEW':
      return '总览确认';
    default:
      return '确认';
  }
}

// 获取确认按钮文本
function getConfirmButtonText(type: AgentTaskType, status: string): string {
  if (status === 'PENDING') {
    switch (type) {
      case 'OUTLINE':
        return '确认生成大纲';
      case 'CONTENT':
        return '确认生成内容';
      case 'IMAGE':
        return '确认生成配图';
      default:
        return '确认开始';
    }
  }
  switch (type) {
    case 'OUTLINE':
      return '确认大纲';
    case 'CONTENT':
      return '确认内容';
    case 'IMAGE':
      return '确认配图';
    default:
      return '确认';
  }
}

export default function ConfirmationCard({
  task,
  onConfirm,
  onModify,
  onRegenerate,
  onRegenerateSelectedImages,
  onConfirmAllImages,
  onRegeneratePage,
  onModifyPage,
  onSendAiModify,
  onContinue,
  onExportZip,
  onExportPdf,
  onExportPptx,
  streamingOutline,
  streamingContent,
  isLoading = false,
  estimatedPoints,
  isVip = false
}: ConfirmationCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);

  // 移动端检测
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 初始检测

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 安全解析结果数据
  const parseTaskResult = (result: string | null): any => {
    if (!result) return null;
    try {
      return JSON.parse(result);
    } catch (e) {
      console.error('[ConfirmationCard] JSON解析失败:', e, '原始数据:', result);
      return null;
    }
  };

  const parseTaskParams = (params: string | null): any => {
    if (!params) return {};
    try {
      return JSON.parse(params);
    } catch (e) {
      console.error('[ConfirmationCard] params JSON解析失败:', e);
      return {};
    }
  };

  const resultData = parseTaskResult(task.result);

  // 大纲建议分析（仅 OUTLINE 类型且非编辑模式下计算）
  const outlineSuggestions = useMemo(() => {
    if (task.type !== 'OUTLINE' || isEditing || !resultData?.slides) return new Map<number, string>();
    return analyzeOutlineSuggestions(resultData.slides);
  }, [task.type, isEditing, resultData?.slides]);

  // 当 resultData 变化时初始化编辑数据（编辑模式下不同步，避免覆盖用户修改）
  useEffect(() => {
    if (isEditing) return;
    if (resultData) {
      if (task.type === 'OUTLINE') {
        setEditData({
          title: resultData.title || '',
          slides: resultData.slides?.map((s: any) => ({
            id: s.id,
            title: s.title || '',
            content: s.content || '',
            pageType: s.pageType
          })) || []
        });
      } else if (task.type === 'CONTENT') {
        setEditData({
          slides: resultData.slides?.map((s: any) => ({
            index: s.index,
            title: s.title || '',
            content: s.content || ''
          })) || []
        });
      }
    }
  }, [resultData, task.type]);

  // 开始编辑
  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingSlideIndex(null);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingSlideIndex(null);
    // 重置编辑数据
    if (resultData) {
      if (task.type === 'OUTLINE') {
        setEditData({
          title: resultData.title || '',
          slides: resultData.slides?.map((s: any) => ({
            id: s.id,
            title: s.title || '',
            content: s.content || '',
            pageType: s.pageType
          })) || []
        });
      } else if (task.type === 'CONTENT') {
        setEditData({
          slides: resultData.slides?.map((s: any) => ({
            index: s.index,
            title: s.title || '',
            content: s.content || ''
          })) || []
        });
      }
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editData) {
      onModify(task.id, editData);
      setIsEditing(false);
      setEditingSlideIndex(null);
    }
  };

  // 更新大纲标题
  const updateOutlineTitle = (title: string) => {
    setEditData((prev: any) => ({ ...prev, title }));
  };

  // 更新大纲幻灯片
  const updateOutlineSlide = (index: number, field: string, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      slides: prev.slides.map((s: any, i: number) =>
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  // 添加大纲幻灯片
  const addOutlineSlide = () => {
    setEditData((prev: any) => ({
      ...prev,
      slides: [...prev.slides, { id: `new-${Date.now()}`, title: '', content: '', pageType: 'content' }]
    }));
  };

  // 删除大纲幻灯片
  const removeOutlineSlide = (index: number) => {
    setEditData((prev: any) => ({
      ...prev,
      slides: prev.slides.filter((_: any, i: number) => i !== index)
    }));
  };

  // 更新内容幻灯片
  const updateContentSlide = (index: number, field: string, value: string) => {
    setEditData((prev: any) => ({
      ...prev,
      slides: prev.slides.map((s: any, i: number) =>
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  // 格式化积分显示
  const formatPoints = (points: number | undefined) => {
    if (points === undefined) return null;
    if (points === 0) return '免费';
    return `${points} 积分`;
  };

  // 积分预估显示
  const renderPointsInfo = () => {
    if (estimatedPoints === undefined) return null;

    return (
      <CommercialGuard module="points">
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
          estimatedPoints === 0
            ? 'bg-green-50 text-green-700'
            : isVip
              ? 'bg-purple-50 text-purple-700'
              : 'bg-blue-50 text-blue-700'
        }`}>
          <Coins className="h-4 w-4" />
          <span className="text-sm font-medium">
            预计消耗：{formatPoints(estimatedPoints)}
          </span>
          {isVip && estimatedPoints > 0 && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">
              VIP优惠
            </span>
          )}
        </div>
      </CommercialGuard>
    );
  };

  // 大纲类型的结果展示
  const renderOutlineResult = () => {
    if (!resultData) return null;

    // 编辑模式
    if (isEditing && editData) {
      return (
        <div className="space-y-4">
          {/* 标题编辑 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">演示标题</label>
            <input
              type="text"
              value={editData.title || ''}
              onChange={(e) => updateOutlineTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
              placeholder="请输入演示标题"
            />
          </div>

          {/* 幻灯片列表编辑 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">页面大纲（共 {editData.slides?.length || 0} 页）</label>
              <button
                onClick={addOutlineSlide}
                className="flex items-center gap-1 text-xs text-[#2563eb] hover:text-[#1d4ed8]"
              >
                <Plus className="w-3.5 h-3.5" />
                添加页面
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {editData.slides?.map((slide: any, index: number) => (
                <div
                  key={slide.id || index}
                  className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                    {index + 1}
                  </span>
                  {slide.pageType && (() => {
                    const badge = getPageTypeBadge(slide.pageType);
                    return (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={slide.title || ''}
                      onChange={(e) => updateOutlineSlide(index, 'title', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#2563eb]"
                      placeholder="页面标题"
                    />
                    <textarea
                      value={slide.content || ''}
                      onChange={(e) => updateOutlineSlide(index, 'content', e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[#2563eb] resize-none"
                      placeholder="页面内容摘要（可选）"
                    />
                  </div>
                  <button
                    onClick={() => removeOutlineSlide(index)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded"
                    title="删除此页"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 预览模式
    return (
      <div className="space-y-3">
        {/* 标题 */}
        <div className="text-lg font-medium text-gray-900">
          {resultData.title}
        </div>

        {/* 幻灯片列表 */}
        <div className="space-y-2">
          {resultData.slides?.map((slide: any, index: number) => (
            <div
              key={slide.id || index}
              className="group flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
            >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800">
                    {slide.title}
                  </span>
                  {slide.pageType && (() => {
                    const badge = getPageTypeBadge(slide.pageType);
                    return (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
                {slide.content && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {slide.content}
                  </div>
                )}
                {/* AI 建议气泡 */}
                {outlineSuggestions.has(index) && (
                  <div className="flex items-start gap-1.5 mt-1.5 p-1.5 bg-amber-50 border border-amber-200 rounded-md">
                    <Lightbulb className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-amber-700 leading-tight">{outlineSuggestions.get(index)}</span>
                  </div>
                )}
              </div>
              {/* AI 重写按钮 */}
              {onSendAiModify && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendAiModify(`帮我重写第${index + 1}页"${slide.title}"的大纲内容`);
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-[#2563eb] hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  title="AI 重写此页"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 内容类型的结果展示
  const renderContentResult = () => {
    if (!resultData) {
      return (
        <div className="p-4 text-sm text-gray-500">
          正在准备内容预览...
        </div>
      );
    }

    // 如果结果包含多页内容（批量内容生成）
    if (resultData.slides && Array.isArray(resultData.slides) && resultData.slides.length > 0) {
      // 编辑模式
      if (isEditing && editData) {
        return (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-2">
              编辑 {editData.slides?.length || 0} 页内容
            </div>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {editData.slides?.map((slide: any, idx: number) => (
                <div
                  key={slide.id || idx}
                  className="p-2 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                      {slide.index ?? idx + 1}
                    </span>
                    <input
                      type="text"
                      value={slide.title || ''}
                      onChange={(e) => updateContentSlide(idx, 'title', e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#2563eb]"
                      placeholder="页面标题"
                    />
                  </div>
                  <textarea
                    value={slide.content || ''}
                    onChange={(e) => updateContentSlide(idx, 'content', e.target.value)}
                    rows={3}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:border-[#2563eb] resize-none"
                    placeholder="页面内容"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 预览模式
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 mb-2">
            已生成 {resultData.slides.length} 页内容
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {resultData.slides.map((slide: any, idx: number) => (
              <div
                key={slide.id || idx}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors group cursor-pointer"
                onClick={() => {
                  setEditingSlideIndex(idx);
                  setIsEditing(true);
                }}
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                  {slide.index ?? idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {slide.title}
                    </span>
                    {slide.pageType && (() => {
                      const badge = getPageTypeBadge(slide.pageType);
                      return (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  {slide.content && (
                    <div className="text-xs text-gray-500 truncate">
                      {slide.content.length > 50 ? slide.content.slice(0, 50) + '...' : slide.content}
                    </div>
                  )}
                </div>
                <Edit2 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                {onSendAiModify && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSendAiModify(`帮我重写第${(slide.index ?? idx + 1)}页"${slide.title}"的内容`);
                    }}
                    className="flex-shrink-0 p-1 text-[#2563eb] hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="AI 重写此页"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">点击任意页面修改内容</p>
        </div>
      );
    }

    // 单页内容 - 改进显示
    const slideIndex = resultData.slideIndex ?? 0;
    const slideTitle = resultData.title || resultData.slideTitle || `第 ${slideIndex + 1} 页`;
    const content = resultData.content;

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700">
          {slideTitle}
        </div>
        <div className="p-3 rounded-lg bg-gray-50 max-h-60 overflow-y-auto">
          {content ? (
            <div className="text-sm text-gray-800 whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              内容正在生成中，请稍候...
            </div>
          )}
        </div>
      </div>
    );
  };

  // 配图类型的结果展示
  const renderImageResult = () => {
    if (!resultData) return null;

    // 如果结果包含多张图片（批量配图生成）
    if (resultData.images && Array.isArray(resultData.images) && resultData.images.length > 0) {
      return (
        <ImagePreviewGrid
          images={resultData.images.map((img: any, idx: number) => ({
            slideIndex: img.slideIndex ?? idx,
            slideTitle: img.slideTitle,
            imageUrl: img.imageUrl,
            pageType: img.pageType
          }))}
          onRegenerateSelected={(indexes, prompt) => {
            onRegenerateSelectedImages?.(indexes, prompt);
          }}
          onConfirmAll={() => {
            onConfirmAllImages?.();
          }}
          isLoading={isLoading}
        />
      );
    }

    // 单张配图（旧格式兼容）
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-2">
          配图预览
        </div>
        {resultData.imageUrl && (
          <div className="p-2 rounded-lg bg-gray-50">
            <img
              src={resultData.imageUrl}
              alt="配图预览"
              className="max-w-full h-auto rounded"
              style={{ maxHeight: '200px' }}
            />
          </div>
        )}
        {!resultData.imageUrl && (
          <div className="p-3 rounded-lg bg-gray-50 text-sm text-gray-500">
            配图已生成
          </div>
        )}
      </div>
    );
  };

  // 根据类型渲染不同的结果展示
  const renderResult = () => {
    // RUNNING 状态时显示执行进度
    if (task.status === 'RUNNING') {
      const progressPercent = task.progress || 0;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-sm text-blue-700 font-medium">
              正在执行...
            </span>
          </div>
          {/* 进度条 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>进度</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      );
    }

    // PENDING 状态时显示等待确认的提示
    if (task.status === 'PENDING') {
      // 检查是否有预生成的结果
      if (resultData && (resultData.slides || resultData.title || resultData.content)) {
        // 有预生成结果，显示预览
        switch (task.type) {
          case 'OUTLINE':
            return renderOutlineResult();
          case 'CONTENT':
            return renderContentResult();
          case 'IMAGE':
            return renderImageResult();
        }
      }

      const params = parseTaskParams(task.params);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <Check className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-700 font-medium">
              准备就绪，等待您的确认
            </span>
          </div>
          {/* 参数摘要 */}
          <div className="text-sm text-gray-600 space-y-1">
            {params.topic && <p>主题：{params.topic}</p>}
            {params.pageCount && <p>页数：约 {params.pageCount} 页</p>}
            {params.style && <p>风格：{params.style}</p>}
          </div>
        </div>
      );
    }

    switch (task.type) {
      case 'OUTLINE':
        // 如果有流式数据，使用流式展示
        if (streamingOutline && streamingOutline.slides.length > 0) {
          return (
            <StreamingOutlineDisplay
              slides={streamingOutline.slides}
              isGenerating={streamingOutline.isGenerating}
              currentIndex={streamingOutline.slides.length - 1}
            />
          );
        }
        return renderOutlineResult();
      case 'CONTENT':
        return renderContentResult();
      case 'IMAGE':
        return renderImageResult();
      case 'CONFIG_CONFIRM':
        // CONFIG_CONFIRM 任务只在 PENDING 状态显示确认卡片
        // 如果已完成，显示配置已确认状态
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 font-medium">
                配置已确认，正在生成演示文稿...
              </span>
            </div>
            {resultData && (
              <div className="text-sm text-gray-600 space-y-1 pl-3">
                {resultData.title && <p>主题：{resultData.title}</p>}
                {resultData.style && <p>风格：{resultData.style}</p>}
                {resultData.pageCount && <p>页数：{resultData.pageCount} 页</p>}
              </div>
            )}
          </div>
        );
      case 'IMAGE_BY_PAGE':
        const imageResult = resultData?.pages || [];
        return (
          <ImagePlaceholderGrid
            pages={imageResult}
            totalPages={resultData?.totalPages || 10}
            currentPage={resultData?.currentPage || 0}
            onRegeneratePage={onRegeneratePage}
            onModifyPage={onModifyPage}
            onContinue={onContinue}
            isLoading={isLoading}
          />
        );
      case 'FINAL_OVERVIEW':
        return (
          <SlideThumbnailOverview
            slides={resultData?.slides || []}
            onConfirm={() => onConfirm(task.id)}
            onRegenerateAll={() => onRegenerate(task.id)}
            onModifySlide={onModifyPage}
            onExportZip={onExportZip}
            onExportPdf={onExportPdf}
            onExportPptx={onExportPptx}
            isLoading={isLoading}
          />
        );
      default:
        return (
          <div className="text-sm text-gray-500">
            结果已生成
          </div>
        );
    }
  };

  // CONFIG_CONFIRM 类型使用独立的卡片组件，不添加外层包装
  if (task.type === 'CONFIG_CONFIRM') {
    return (
      <AgentConfigConfirmCard
        task={task}
        onConfirm={onConfirm}
        onModify={onModify}
        onRegenerate={onRegenerate}
        isLoading={isLoading}
        estimatedPoints={estimatedPoints}
        isVip={isVip}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {getConfirmationTitle(task.type)}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            isEditing
              ? 'bg-blue-100 text-blue-600'
              : task.status === 'PENDING'
                ? 'bg-amber-100 text-amber-600'
                : task.status === 'RUNNING'
                  ? 'bg-blue-100 text-blue-600'
                  : task.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-600'
                    : task.status === 'FAILED'
                      ? 'bg-red-100 text-red-600'
                      : 'text-gray-400'
          }`}>
            {isEditing
              ? '编辑中'
              : task.status === 'PENDING'
                ? '待确认'
                : task.status === 'RUNNING'
                  ? '执行中'
                  : task.status === 'COMPLETED'
                    ? '已完成'
                    : task.status === 'FAILED'
                      ? '执行失败'
                      : task.status}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* 内容区域 */}
      {expanded && (
        <div className="p-4">
          {/* 结果展示 */}
          {renderResult()}

          {/* 积分预估 */}
          {task.status === 'PENDING' && renderPointsInfo()}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            {/* 积分提示（已完成状态） */}
            {task.status === 'COMPLETED' && task.pointsCost !== undefined && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                已消耗 {task.pointsCost} 积分
              </div>
            )}
            {task.status === 'COMPLETED' && task.pointsCost === undefined && (
              <div />
            )}

            {/* RUNNING 状态显示进度和取消按钮 */}
            {task.status === 'RUNNING' && (
              <div className="flex items-center gap-3 w-full">
                <div className="text-xs text-blue-500 flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  任务执行中...
                </div>
                <button
                  onClick={() => onRegenerate(task.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  title="重新执行此任务"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>重新生成</span>
                </button>
              </div>
            )}

            {/* FAILED 状态显示错误信息和重试按钮 */}
            {task.status === 'FAILED' && (
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-center gap-1.5 text-xs text-red-500 flex-1 min-w-0">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{task.error || '任务执行失败，请重试'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRegenerate(task.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重试</span>
                  </button>
                </div>
              </div>
            )}

            {/* 按钮组（PENDING 和 COMPLETED 状态显示） */}
            {task.status !== 'RUNNING' && task.status !== 'FAILED' && (
              <div className={`
                flex items-center gap-2 ml-auto
                ${isMobile ? 'fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 z-50 ml-0' : ''}
              `}>
                {/* 编辑模式按钮 */}
                {isEditing && (task.type === 'OUTLINE' || task.type === 'CONTENT') ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                        ${isMobile ? 'flex-1 justify-center' : ''}
                      `}
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>取消</span>
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                      className={`
                        flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                        ${isMobile ? 'flex-1 justify-center' : ''}
                      `}
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>保存修改</span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* 重新生成按钮 */}
                    <button
                      onClick={() => onRegenerate(task.id)}
                      disabled={isLoading}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                        ${isMobile ? 'flex-1 justify-center' : ''}
                      `}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>重新生成</span>
                    </button>

                    {/* 修改按钮 - OUTLINE 和 CONTENT 类型使用内联编辑 */}
                    <button
                      onClick={() => {
                        if (task.type === 'OUTLINE' || task.type === 'CONTENT') {
                          handleStartEdit();
                        } else {
                          onModify(task.id);
                        }
                      }}
                      disabled={isLoading}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                        ${isMobile ? 'flex-1 justify-center' : ''}
                      `}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>修改</span>
                    </button>

                    {/* 确认按钮（仅 PENDING 状态显示） */}
                    {task.status === 'PENDING' && (
                      <button
                        onClick={() => onConfirm(task.id)}
                        disabled={isLoading}
                        className={`
                          flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                          ${isMobile ? 'flex-1 justify-center' : ''}
                        `}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{getConfirmButtonText(task.type, task.status)}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* 移动端底部占位 */}
      {isMobile && <div className="h-16" />}
    </motion.div>
  );
}