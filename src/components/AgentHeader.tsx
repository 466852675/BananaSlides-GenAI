/**
 * AgentHeader 顶部导航组件
 */

import { Bot, Pause, Play, Square } from 'lucide-react';
import { getStatusConfig } from '../config/status-config';
import type { AgentSession, AgentProgressResponse } from '../types/agent';

interface AgentHeaderProps {
  session: AgentSession | null;
  projectStatus?: string;
  progress?: AgentProgressResponse | null; // 新增：进度信息
  isAutoMode?: boolean;
  isExecuting?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
}

export default function AgentHeader({
  session,
  projectStatus,
  progress,
  isAutoMode = false,
  isExecuting = false,
  onPause,
  onResume,
  onCancel,
}: AgentHeaderProps) {
  const showControls = isAutoMode && session && (session.status === 'ACTIVE' || session.status === 'PAUSED');

  // 优先使用实时进度，否则从 session 获取
  const totalTasks = progress?.totalTasks || session?.totalTasks || 0;
  const completedTasks = progress?.completedTasks || session?.completedTasks || 0;
  const totalPointsUsed = progress?.totalPointsUsed || session?.totalPointsUsed || 0;

  // 计算进度百分比
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* 左侧：标题 */}
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-gray-700" />
        <span className="text-base font-semibold text-gray-800">AI Agent</span>
        {/* 模式标签 - 始终显示，用颜色区分 */}
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          isAutoMode
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-purple-100 text-purple-700 border-purple-200'
        }`}>
          {isAutoMode ? '自动模式' : '引导模式'}
        </span>
      </div>

      {/* 分隔符 */}
      <div className="h-5 w-px bg-gray-200" />

      {/* 状态和进度信息 - 使用圆角矩形背景 */}
      {(projectStatus || session) && (
        <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1">
          {/* 状态标签 */}
          <span className={`text-xs font-medium ${
            projectStatus
              ? getStatusConfig(projectStatus).color
              : (session!.status === 'ACTIVE' ? 'text-green-600' :
                 session!.status === 'PAUSED' ? 'text-amber-600' :
                 session!.status === 'COMPLETED' ? 'text-blue-600' :
                 session!.status === 'FAILED' ? 'text-red-600' : 'text-gray-600')
          }`}>
            {projectStatus
              ? getStatusConfig(projectStatus).label
              : (session!.status === 'ACTIVE' ? '进行中' :
                 session!.status === 'PAUSED' ? '已暂停' :
                 session!.status === 'COMPLETED' ? '已完成' :
                 session!.status === 'FAILED' ? '失败' : '空闲')}
          </span>

          {/* 进度信息 */}
          {session && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-600 font-medium">{progressPercent}%</span>
              <span className="text-xs text-gray-500">完成 {completedTasks}/{totalTasks}</span>
              {totalPointsUsed > 0 && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-amber-600 font-medium">{totalPointsUsed} 积分</span>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* 自动模式控制按钮 */}
      {showControls && (
        <div className="flex items-center gap-1.5 ml-auto">
          {session.status === 'ACTIVE' ? (
            <button
              onClick={onPause}
              disabled={!isExecuting}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="暂停执行"
            >
              <Pause className="h-3.5 w-3.5" />
              暂停
            </button>
          ) : (
            <button
              onClick={onResume}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-full transition-colors"
              title="继续执行"
            >
              <Play className="h-3.5 w-3.5" />
              继续
            </button>
          )}
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
            title="取消任务"
          >
            <Square className="h-3.5 w-3.5" />
            取消
          </button>
        </div>
      )}
    </div>
  );
}