/**
 * ChatArea 对话区域组件
 * 支持虚拟滚动优化大规模消息场景
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import ConfirmationCard from './ConfirmationCard';
import HistoryConfirmCard from './HistoryConfirmCard';
import MessageBubble from './MessageBubble';
import { VirtualMessageList } from './VirtualMessageList';
import type { AgentMessage, AgentTask, AgentProgressResponse } from '../types/agent';

// 积分预估规则（标准价格，VIP折扣由后端计算）
const POINTS_ESTIMATE: Record<string, number> = {
  OUTLINE: 5,      // 大纲生成基础积分
  CONTENT: 20,     // 内容生成基础积分（约 10 页）
  IMAGE: 30        // 配图生成基础积分（约 10 页）
};

interface ChatAreaProps {
  messages: AgentMessage[];
  tasks: AgentTask[];
  progress: AgentProgressResponse | null;
  isLoading: boolean;
  onConfirmTask?: (taskId: string) => void;
  onModifyTask?: (taskId: string) => void;
  onRegenerateTask?: (taskId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onResetMessage?: (messageId: string) => void;
  onRegenerateSelectedImages?: (taskId: string, indexes: number[], prompt?: string) => void;
  onConfirmAllImages?: (taskId: string) => void;
  onContinue?: () => void;
  onRegeneratePage?: (slideIndex: number) => void;
  onModifyPage?: (slideIndex: number) => void;
  onExportZip?: () => void;
  onExportPdf?: () => void;
  onExportPptx?: () => void;
  onSendAiModify?: (instruction: string) => void;
  streamingOutline?: { slides: any[]; isGenerating: boolean };
  streamingContent?: { slides: any[]; isGenerating: boolean };
  isVip?: boolean;
  autoMode?: boolean;
}

// 计算任务预估积分
function estimatePoints(task: AgentTask): number {
  const params = (() => {
    if (!task.params) return {};
    try { return JSON.parse(task.params); }
    catch { return {}; }
  })();
  const basePoints = POINTS_ESTIMATE[task.type] || 0;

  // 根据参数调整积分
  if (task.type === 'OUTLINE' && params.pageCount) {
    return Math.round(basePoints * (params.pageCount / 10));
  }
  if (task.type === 'CONTENT' && params.slideCount) {
    return Math.round(basePoints * (params.slideCount / 10));
  }
  if (task.type === 'IMAGE' && params.slideCount) {
    return Math.round(basePoints * (params.slideCount / 10));
  }

  return basePoints;
}

export default function ChatArea({
  messages,
  tasks,
  progress,
  isLoading,
  onConfirmTask,
  onModifyTask,
  onRegenerateTask,
  onEditMessage,
  onResetMessage,
  onRegenerateSelectedImages,
  onConfirmAllImages,
  onContinue,
  onRegeneratePage,
  onModifyPage,
  onExportZip,
  onExportPdf,
  onExportPptx,
  onSendAiModify,
  streamingOutline,
  streamingContent,
  isVip = false,
  autoMode = false
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // 自动滚动到底部（仅在用户位于底部时）
  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tasks]);

  // 获取需要确认的任务（PENDING 和 RUNNING 状态）
  const confirmationTasks = useMemo(() =>
    tasks.filter(
      task => ['PENDING', 'RUNNING'].includes(task.status) &&
        ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE', 'IMAGE_BY_PAGE', 'FINAL_OVERVIEW'].includes(task.type) &&
        !autoMode
    ),
    [tasks, autoMode]
  );

  // 获取已完成的任务（用于历史展示）
  const completedTasks = useMemo(() =>
    tasks.filter(
      task => task.status === 'COMPLETED' &&
        ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE'].includes(task.type) &&
        task.result // 必须有结果才显示
    ).sort((a, b) => {
      // 按完成时间排序
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return timeA - timeB;
    }),
    [tasks]
  );

  // 过滤重复的消息（基于 id）
  // 同时过滤掉任务完成消息（这些信息由 HistoryConfirmCard 展示）
  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter(message => {
      if (!message.id || seen.has(message.id)) {
        return false;
      }
      // 过滤掉任务完成消息（metadata 中包含 taskType 的消息）
      // 这些信息将由 HistoryConfirmCard 更详细地展示
      try {
        if (message.metadata) {
          const metadata = typeof message.metadata === 'string'
            ? JSON.parse(message.metadata)
            : message.metadata;
          if (metadata.taskType) {
            return false;
          }
        }
      } catch {
        // 解析失败则保留消息
      }
      seen.add(message.id);
      return true;
    });
  }, [messages]);

  // 合并消息和已完成任务，按时间排序
  const timelineItems = useMemo(() => {
    type TimelineItem =
      | { type: 'message'; data: AgentMessage; timestamp: number }
      | { type: 'task'; data: AgentTask; timestamp: number };

    const items: TimelineItem[] = [];

    // 添加消息
    uniqueMessages.forEach(msg => {
      items.push({
        type: 'message',
        data: msg,
        timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : 0
      });
    });

    // 添加已完成的任务
    completedTasks.forEach(task => {
      items.push({
        type: 'task',
        data: task,
        timestamp: task.completedAt ? new Date(task.completedAt).getTime() : 0
      });
    });

    // 按时间排序
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [uniqueMessages, completedTasks]);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4" onScroll={handleScroll}>
      <div className="mx-auto max-w-2xl space-y-4">
        {/* 使用虚拟消息列表渲染消息和已完成任务 */}
        <VirtualMessageList
          messages={uniqueMessages}
          tasks={completedTasks}
          renderMessage={(message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onEdit={onEditMessage || (() => {})}
              onReset={onResetMessage || (() => {})}
              isLoading={isLoading}
            />
          )}
          renderTask={(task) => (
            <HistoryConfirmCard
              key={task.id}
              task={task}
            />
          )}
        />

        {/* 确认卡片（待处理任务） */}
        {confirmationTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {confirmationTasks.map(task => (
              <ConfirmationCard
                key={task.id}
                task={task}
                onConfirm={onConfirmTask || (() => {})}
                onModify={onModifyTask || (() => {})}
                onRegenerate={onRegenerateTask || (() => {})}
                onRegenerateSelectedImages={(indexes, prompt) => onRegenerateSelectedImages?.(task.id, indexes, prompt)}
                onConfirmAllImages={() => onConfirmAllImages?.(task.id)}
                onContinue={onContinue}
                onRegeneratePage={onRegeneratePage}
                onModifyPage={onModifyPage}
                onExportZip={onExportZip}
                onExportPdf={onExportPdf}
                onExportPptx={onExportPptx}
                onSendAiModify={onSendAiModify}
                streamingOutline={streamingOutline}
                streamingContent={streamingContent}
                isLoading={isLoading}
                estimatedPoints={estimatePoints(task)}
                isVip={isVip}
              />
            ))}
          </motion.div>
        )}

        {/* 加载中指示器 */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5"
          >
            {/* AI头像 */}
            <div className="flex-shrink-0 pt-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center ring-2 ring-white shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* 思考中动画 */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-1 ml-1">
                <span className="text-xs font-medium text-[#2563eb]">AI 助手</span>
              </div>
              <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-gray-100 inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                <span className="text-sm text-gray-500">思考中...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// 任务类型标签
function getTaskLabel(type: string): string {
  const labels: Record<string, string> = {
    OUTLINE: '生成大纲',
    CONTENT: '生成内容',
    IMAGE: '生成配图',
    EXPORT: '导出文件',
    IMPORT: '导入文档',
    MODIFY: '修改内容',
    STYLE: '更换风格',
    SNAPSHOT: '保存快照'
  };
  return labels[type] || type;
}