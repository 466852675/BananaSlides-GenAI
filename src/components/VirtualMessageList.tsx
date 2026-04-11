/**
 * VirtualMessageList 虚拟消息列表
 *
 * 功能：
 * 1. 消息数量超过阈值时自动启用虚拟滚动
 * 2. 历史消息自动折叠，保持最近消息可见
 * 3. 支持展开/折叠切换
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

// 虚拟滚动阈值
const VIRTUAL_SCROLL_THRESHOLD = 20;
// 默认显示的活跃消息数量
const VISIBLE_ACTIVE_COUNT = 5;

interface VirtualMessageListProps {
  messages: any[];
  tasks: any[];
  renderMessage: (message: any) => React.ReactNode;
  renderTask: (task: any) => React.ReactNode;
}

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  tasks,
  renderMessage,
  renderTask
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 合并并排序所有项目
  const allItems = useMemo(() => {
    const items = [
      ...messages.map(m => ({ ...m, itemType: 'message' })),
      ...tasks.map(t => ({ ...t, itemType: 'task' }))
    ];
    return items.sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, tasks]);

  // 分组：活跃项和历史项
  const { activeItems, historyItems } = useMemo(() => {
    if (allItems.length <= VIRTUAL_SCROLL_THRESHOLD) {
      return { activeItems: allItems, historyItems: [] };
    }

    // 找到正在进行的任务索引
    const lastActiveTaskIndex = [...tasks].reverse().findIndex(
      t => t.status === 'RUNNING' || t.status === 'PENDING'
    );

    // 如果有活跃任务，从它开始显示；否则显示最后 N 条
    const splitIndex = lastActiveTaskIndex >= 0
      ? Math.max(0, allItems.length - Math.max(lastActiveTaskIndex + 2, VISIBLE_ACTIVE_COUNT))
      : Math.max(0, allItems.length - VISIBLE_ACTIVE_COUNT);

    return {
      activeItems: allItems.slice(splitIndex),
      historyItems: allItems.slice(0, splitIndex)
    };
  }, [allItems, tasks]);

  // 渲染单个项目
  const renderItem = useCallback((item: any) => {
    if (item.itemType === 'message') {
      return renderMessage(item);
    } else {
      return renderTask(item);
    }
  }, [renderMessage, renderTask]);

  // 无数据
  if (allItems.length === 0) {
    return null;
  }

  // 数据量小，直接渲染
  if (allItems.length <= VIRTUAL_SCROLL_THRESHOLD) {
    return (
      <div className="space-y-4">
        {allItems.map(item => (
          <React.Fragment key={item.id}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // 数据量大，使用折叠策略
  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {/* 历史折叠区域 */}
      {historyItems.length > 0 && (
        <motion.div
          initial={false}
          animate={{ height: showHistory ? 'auto' : 0 }}
          className="overflow-hidden"
        >
          <div className="space-y-4 mb-4">
            {historyItems.map(item => (
              <React.Fragment key={item.id}>
                {renderItem(item)}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      )}

      {/* 折叠控制按钮 */}
      {historyItems.length > 0 && (
        <motion.button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-600 transition-colors w-full"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <MessageSquare className="h-4 w-4" />
          <span>
            {showHistory
              ? '收起历史记录'
              : `展开历史记录 (${historyItems.length} 条)`
            }
          </span>
          {showHistory
            ? <ChevronUp className="h-4 w-4" />
            : <ChevronDown className="h-4 w-4" />
          }
        </motion.button>
      )}

      {/* 活跃区域 - 始终可见 */}
      <div className="space-y-4">
        {activeItems.map(item => (
          <React.Fragment key={item.id}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};