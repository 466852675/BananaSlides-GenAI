/**
 * ConfirmationCard 分步确认卡片组件
 *
 * 用于显示大纲、内容、配图的确认交互
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit2, RefreshCw, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import ImagePreviewGrid from './ImagePreviewGrid';
import AgentConfigConfirmCard from './AgentConfigConfirmCard';
import StreamingOutlineDisplay from './StreamingOutlineDisplay';
import ImagePlaceholderGrid from './ImagePlaceholderGrid';
import SlideThumbnailOverview from './SlideThumbnailOverview';
import type { AgentTask, AgentTaskType } from '../types/agent';

interface ConfirmationCardProps {
  task: AgentTask;
  onConfirm: (taskId: string) => void;
  onModify: (taskId: string, modifiedData?: any) => void;
  onRegenerate: (taskId: string) => void;
  onRegenerateSelectedImages?: (indexes: number[], prompt?: string) => void;
  onConfirmAllImages?: () => void;
  onRegeneratePage?: (slideIndex: number) => void;
  onModifyPage?: (slideIndex: number) => void;
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
    );
  };

  // 大纲类型的结果展示
  const renderOutlineResult = () => {
    if (!resultData) return null;

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
              className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
            >
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {slide.title}
                </div>
                {slide.content && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {slide.content}
                  </div>
                )}
              </div>
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
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700 mb-2">
            已生成 {resultData.slides.length} 页内容
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1">
            {resultData.slides.map((slide: any, idx: number) => (
              <button
                key={slide.id || idx}
                onClick={() => onModify(task.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-left transition-colors group"
              >
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                  {slide.index ?? idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {slide.title}
                  </div>
                  {slide.content && (
                    <div className="text-xs text-gray-500 truncate">
                      {slide.content.slice(0, 50)}...
                    </div>
                  )}
                </div>
                <Edit2 className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
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
            task.status === 'PENDING'
              ? 'bg-amber-100 text-amber-600'
              : task.status === 'RUNNING'
                ? 'bg-blue-100 text-blue-600'
                : task.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-600'
                  : 'text-gray-400'
          }`}>
            {task.status === 'PENDING'
              ? '待确认'
              : task.status === 'RUNNING'
                ? '执行中'
                : task.status === 'COMPLETED'
                  ? '已完成'
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

            {/* RUNNING 状态不显示操作按钮 */}
            {task.status === 'RUNNING' && (
              <div className="text-xs text-gray-400 italic">
                任务执行中，请稍候...
              </div>
            )}

            {/* 按钮组（PENDING 和 COMPLETED 状态显示） */}
            {task.status !== 'RUNNING' && (
              <div className="flex items-center gap-2 ml-auto">
                {/* 重新生成按钮 */}
                <button
                  onClick={() => onRegenerate(task.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>重新生成</span>
                </button>

                {/* 修改按钮 */}
                <button
                  onClick={() => onModify(task.id)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>修改</span>
                </button>

                {/* 确认按钮（仅 PENDING 状态显示） */}
                {task.status === 'PENDING' && (
                  <button
                    onClick={() => onConfirm(task.id)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-[#2563eb] hover:bg-[#1d4ed8] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{getConfirmButtonText(task.type, task.status)}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}