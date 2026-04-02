/**
 * MessageBubble 消息气泡组件
 *
 * 支持用户消息的编辑和重置功能
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Edit2, RotateCcw, Check, X, MoreHorizontal } from 'lucide-react';
import type { AgentMessage } from '../types/agent';

interface MessageBubbleProps {
  message: AgentMessage;
  onEdit: (messageId: string, newContent: string) => void;
  onReset: (messageId: string) => void;
  isLoading?: boolean;
}

export default function MessageBubble({
  message,
  onEdit,
  onReset,
  isLoading = false
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);

  // 开始编辑
  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
    setShowActions(false);
  };

  // 保存编辑
  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // 重置消息
  const handleReset = () => {
    onReset(message.id);
    setShowActions(false);
  };

  // 用户消息组件
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="relative max-w-[80%]">
          {/* 操作按钮 */}
          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1 pr-2"
              >
                {/* 编辑按钮 */}
                <button
                  onClick={handleStartEdit}
                  disabled={isLoading}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50"
                  title="编辑"
                  aria-label="编辑"
                >
                  <Edit2 className="h-3 w-3 text-gray-500" />
                </button>

                {/* 重置按钮 */}
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow hover:bg-gray-50 disabled:opacity-50"
                  title="重置"
                  aria-label="重置"
                >
                  <RotateCcw className="h-3 w-3 text-gray-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 消息内容 */}
          {isEditing ? (
            <div className="rounded-2xl rounded-br-md bg-black px-4 py-2.5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] resize-none bg-transparent text-white text-sm placeholder-gray-300 focus:outline-none"
                placeholder="编辑消息..."
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-white"
                >
                  <X className="h-3 w-3" />
                  <span>取消</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === message.content}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-br-md bg-black px-4 py-2.5 text-white">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {/* 已编辑标记 */}
              {message.isEdited && (
                <span className="text-xs text-gray-400 mt-1">(已编辑)</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // 助手消息组件
  if (message.role === 'assistant') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
          <Bot className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // 系统消息组件
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center"
    >
      <div className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
        {message.content}
      </div>
    </motion.div>
  );
}