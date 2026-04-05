/**
 * 项目状态配置
 *
 * 统一 IDE 模式和 Agent 模式的状态显示
 * 被以下组件使用：
 * - Dashboard.tsx
 * - AgentSidebar.tsx
 * - AgentHeader.tsx
 * - StatusBadge.tsx
 */

export type ProjectStatus = 'idle' | 'in-progress' | 'generating' | 'paused' | 'completed' | 'error';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
}

export const STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  'generating': { label: '生成中', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  'in-progress': { label: '进行中', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  'idle': { label: '未开始', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  'paused': { label: '已暂停', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  'error': { label: '失败', color: 'text-red-600', bgColor: 'bg-red-50' },
  'completed': { label: '已完成', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
};

/**
 * 获取状态配置，未知状态返回 idle 配置
 */
export const getStatusConfig = (status: string): StatusConfig =>
  STATUS_CONFIG[status as ProjectStatus] || STATUS_CONFIG['idle'];