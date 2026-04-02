/**
 * Agent 前端类型定义
 */

// 会话状态
export type AgentSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type AgentMode = 'GUIDED' | 'AUTO';

// 任务类型
export type AgentTaskType = 'OUTLINE' | 'CONTENT' | 'IMAGE' | 'EXPORT' | 'IMPORT' | 'MODIFY' | 'STYLE' | 'SNAPSHOT';
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
  onOpenConfig?: () => void;
  onOpenStyle?: () => void;
  configSaved?: boolean;
  onConfigSaved?: (saved: boolean) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
  isVip?: boolean;
}