/**
 * ConfirmationCard 分步确认卡片组件
 *
 * 用于显示大纲、内容、配图的确认交互
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Edit2, RefreshCw, ChevronDown, ChevronUp, Coins } from 'lucide-react';
import type { AgentTask, AgentTaskType } from '../types/agent';

interface ConfirmationCardProps {
  task: AgentTask;
  onConfirm: (taskId: string) => void;
  onModify: (taskId: string) => void;
  onRegenerate: (taskId: string) => void;
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
  isLoading = false,
  estimatedPoints,
  isVip = false
}: ConfirmationCardProps) {
  const [expanded, setExpanded] = useState(true);

  // 解析结果数据
  const resultData = task.result ? JSON.parse(task.result) : null;

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
    if (!resultData) return null;

    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-2">
          第 {resultData.slideIndex || 1} 页内容
        </div>
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-sm text-gray-800 whitespace-pre-wrap">
            {resultData.content || '内容已生成'}
          </div>
        </div>
      </div>
    );
  };

  // 配图类型的结果展示
  const renderImageResult = () => {
    if (!resultData) return null;

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
    // PENDING 状态时显示等待确认的提示
    if (task.status === 'PENDING') {
      const params = task.params ? JSON.parse(task.params) : {};
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
        return renderOutlineResult();
      case 'CONTENT':
        return renderContentResult();
      case 'IMAGE':
        return renderImageResult();
      default:
        return (
          <div className="text-sm text-gray-500">
            结果已生成
          </div>
        );
    }
  };

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
              : task.status === 'COMPLETED'
              ? 'bg-green-100 text-green-600'
              : 'text-gray-400'
          }`}>
            {task.status === 'PENDING' ? '待确认' : task.progress === 100 ? '已完成' : `${task.progress}%`}
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

            {/* 按钮组 */}
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

              {/* 确认按钮 */}
              <button
                onClick={() => onConfirm(task.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-white bg-black hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" />
                <span>{getConfirmButtonText(task.type, task.status)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}