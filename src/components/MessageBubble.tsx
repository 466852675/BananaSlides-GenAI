/**
 * MessageBubble 消息气泡组件
 *
 * 支持用户消息的编辑和重置功能
 * 带有美观的头像显示
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bot, Edit2, RotateCcw, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AgentMessage } from '../types/agent';

interface MessageBubbleProps {
  message: AgentMessage;
  onEdit: (messageId: string, newContent: string) => void;
  onReset: (messageId: string) => void;
  isLoading?: boolean;
}

// 用户头像组件
function UserAvatar({ user }: { user: { avatar?: string | null; nickname?: string | null; username?: string | null } | null }) {
  // 获取显示名称的首字母
  const getInitials = () => {
    const name = user?.nickname || user?.username || 'User';
    return name.charAt(0).toUpperCase();
  };

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt="用户头像"
        className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
      />
    );
  }

  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center ring-2 ring-white shadow-sm">
      <span className="text-xs font-semibold text-white">{getInitials()}</span>
    </div>
  );
}

// AI头像组件 - 使用品牌色
function AIAvatar() {
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center ring-2 ring-white shadow-sm">
      <Sparkles className="h-4 w-4 text-white" />
    </div>
  );
}

export default function MessageBubble({
  message,
  onEdit,
  onReset,
  isLoading = false
}: MessageBubbleProps) {
  const { user } = useAuth();
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
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex justify-end gap-2.5"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* 消息内容区 */}
        <div className="relative max-w-[75%]">
          {/* 操作按钮 */}
          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full flex items-center gap-1.5 pr-2"
              >
                {/* 编辑按钮 */}
                <button
                  onClick={handleStartEdit}
                  disabled={isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="编辑"
                  aria-label="编辑"
                >
                  <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {/* 重置按钮 */}
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="重置"
                  aria-label="重置"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 消息气泡 */}
          {isEditing ? (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-2xl rounded-tr-md bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] px-4 py-3 shadow-lg inline-block min-w-[200px]"
            >
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] resize-none bg-transparent text-white text-sm placeholder-blue-200 focus:outline-none whitespace-pre-wrap"
                placeholder="编辑消息..."
                autoFocus
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/20">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-100 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span>取消</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === message.content}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#2563eb] bg-white rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  <span>保存</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] px-4 py-3 shadow-lg">
              <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{message.content}</p>
              {/* 已编辑标记 */}
              {message.isEdited && (
                <span className="text-[10px] text-blue-200 mt-1 block">已编辑</span>
              )}
            </div>
          )}
        </div>

        {/* 用户头像 */}
        <div className="flex-shrink-0 pt-1">
          <UserAvatar user={user} />
        </div>
      </motion.div>
    );
  }

  // 助手消息组件
  if (message.role === 'assistant') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="flex gap-2.5"
      >
        {/* AI头像 */}
        <div className="flex-shrink-0 pt-1">
          <AIAvatar />
        </div>

        {/* 消息内容区 */}
        <div className="flex-1 max-w-[85%]">
          {/* AI名称标签 */}
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <span className="text-xs font-medium text-[#2563eb]">AI 助手</span>
          </div>

          {/* 消息气泡 */}
          <div className="rounded-2xl rounded-tl-md bg-white px-4 py-3 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message.content}</p>
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