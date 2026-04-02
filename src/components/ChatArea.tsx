/**
 * ChatArea 对话区域组件
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Bot, Loader2, CheckCircle } from 'lucide-react';
import ConfirmationCard from './ConfirmationCard';
import MessageBubble from './MessageBubble';
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
  isVip?: boolean;
}

// 计算任务预估积分
function estimatePoints(task: AgentTask): number {
  const params = task.params ? JSON.parse(task.params) : {};
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
  isVip = false
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, tasks]);

  // 获取需要确认的任务（PENDING 或 COMPLETED 状态的 OUTLINE/CONTENT/IMAGE 类型）
  const confirmationTasks = useMemo(() =>
    tasks.filter(
      task => ['PENDING', 'COMPLETED'].includes(task.status) && ['OUTLINE', 'CONTENT', 'IMAGE'].includes(task.type)
    ),
    [tasks]
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            onEdit={onEditMessage || (() => {})}
            onReset={onResetMessage || (() => {})}
            isLoading={isLoading}
          />
        ))}

        {/* 确认卡片 */}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-400"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">思考中...</span>
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