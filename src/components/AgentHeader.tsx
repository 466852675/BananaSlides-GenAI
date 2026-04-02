/**
 * AgentHeader 顶部导航组件
 */

import { Bot, Pause, Play, Square } from 'lucide-react';
import type { AgentSession } from '../types/agent';

interface AgentHeaderProps {
  session: AgentSession | null;
  isAutoMode?: boolean;
  isExecuting?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export default function AgentHeader({
  session,
  isAutoMode = false,
  isExecuting = false,
  onPause,
  onResume,
  onCancel,
}: AgentHeaderProps) {
  const showControls = isAutoMode && session && (session.status === 'ACTIVE' || session.status === 'PAUSED');

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      {/* 左侧：标题 */}
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-gray-800" />
        <h1 className="text-lg font-bold text-gray-800">AI Agent</h1>
        {isAutoMode && (
          <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            自动模式
          </span>
        )}
      </div>

      {/* 右侧：状态和控制 */}
      <div className="flex items-center gap-3">
        {/* 自动模式控制按钮 */}
        {showControls && (
          <div className="flex items-center gap-2">
            {session.status === 'ACTIVE' ? (
              <button
                onClick={onPause}
                disabled={!isExecuting}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="暂停执行"
              >
                <Pause className="h-4 w-4" />
                暂停
              </button>
            ) : (
              <button
                onClick={onResume}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                title="继续执行"
              >
                <Play className="h-4 w-4" />
                继续
              </button>
            )}
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              title="取消任务"
            >
              <Square className="h-4 w-4" />
              取消
            </button>
          </div>
        )}

        {/* 状态显示 */}
        {session && (
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1">
            <span className={`text-xs ${
              session.status === 'ACTIVE' ? 'text-green-600' :
              session.status === 'PAUSED' ? 'text-amber-600' :
              session.status === 'COMPLETED' ? 'text-blue-600' :
              session.status === 'FAILED' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {session.status === 'ACTIVE' ? '进行中' :
               session.status === 'PAUSED' ? '已暂停' :
               session.status === 'COMPLETED' ? '已完成' :
               session.status === 'FAILED' ? '失败' : '空闲'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}