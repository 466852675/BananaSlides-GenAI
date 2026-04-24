/**
 * Agent 前端类型定义
 */

// 会话状态
export type AgentSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AgentMode = 'GUIDED' | 'AUTO';

// 任务类型（包含短名称和 legacy 别名，确保与后端 AgentTaskType 对齐）
export type AgentTaskType = 'CONFIG_CONFIRM' | 'OUTLINE' | 'CONTENT' | 'IMAGE' | 'IMAGE_BY_PAGE' | 'FINAL_OVERVIEW' | 'EXPORT' | 'IMPORT' | 'MODIFY' | 'STYLE' | 'SNAPSHOT'
  | 'GENERATE_OUTLINE' | 'EXPAND_CONTENT' | 'GENERATE_IMAGE' | 'BATCH_GENERATE_IMAGES' | 'MODIFY_SLIDE' | 'SWITCH_STYLE_TEMPLATE' | 'IMPORT_DOCUMENT' | 'EXPORT_PROJECT' | 'FINALIZE_PROJECT';
export type AgentTaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// Agent 会话
export interface AgentSession {
  id: string;
  projectId: string;
  status: AgentSessionStatus;
  mode: AgentMode;
  context?: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalPointsUsed: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  project?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

// Agent 消息
export interface AgentMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: string;
  metadata?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  createdAt: string;
}

// Agent 任务
export interface AgentTask {
  id: string;
  sessionId: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  priority: number;
  params?: string;
  result?: string;
  progress: number;
  error?: string;
  retryCount: number;
  pointsCost?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 进度响应
export interface AgentProgressResponse {
  sessionId: string;
  status: AgentSessionStatus;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  currentTask?: {
    id: string;
    type: AgentTaskType;
    progress: number;
  };
  totalPointsUsed: number;
}

// API 响应
export interface AgentChatResponse {
  userMessage?: AgentMessage;  // 用户消息（服务端保存后返回）
  message: AgentMessage;       // AI 助手消息
  tasks?: AgentTask[];
  progress?: AgentProgressResponse;
}

// Props
export interface AgentViewProps {
  items: any[];
  config: any;
  styleMap: any;
  currentProjectId: string | null;
  onItemsChange?: (items: any[]) => void;
  onConfigChange?: (config: any) => void;
  onStyleMapChange?: (styleMap: any) => void;
  onCreateProject?: (title: string) => Promise<string>; // 返回新项目ID
  onSelectProject?: (projectId: string) => void; // 选择项目时回调
  onOpenConfig?: () => void;
  onOpenStyle?: () => void;
  configSaved?: boolean;
  onConfigSaved?: (saved: boolean) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
  isVip?: boolean;
  styleSelectionCleared?: number; // 当这个值变化时清除风格选中状态
  // WebSocket 相关 - 由 App.tsx 统一管理
  wsStatus?: { connected: boolean; reconnecting: boolean; error: string | null };
  wsMessage?: { type: string; payload?: any; timestamp?: number } | null;
  onWsJoinProject?: (projectId: string) => void;
  onWsLeaveProject?: (projectId: string) => void;
}