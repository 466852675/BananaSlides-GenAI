/**
 * Agent API 客户端
 */

import { client, TOKEN_KEY } from './client';
import type {
  AgentSession,
  AgentMessage,
  AgentTask,
  AgentProgressResponse,
  AgentChatResponse
} from '../types/agent';

const BASE_URL = '/agent';

// 项目含 AgentSession 信息
export interface ProjectWithSession {
  id: string;
  displayId: string | null;
  title: string;
  thumbnailUrl: string | null;
  status: string;
  scenarioType: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  agentSession: {
    id: string;
    status: string;
    mode: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export const agentApi = {
  // ============================================================
  // 会话管理
  // ============================================================

  /**
   * 创建新会话
   */
  async createSession(projectId: string, mode?: 'GUIDED' | 'AUTO'): Promise<AgentSession> {
    return client.post(`${BASE_URL}/sessions`, { projectId, mode });
  },

  /**
   * 获取用户的所有项目及其 AgentSession 信息
   */
  async getProjectsWithSessions(): Promise<ProjectWithSession[]> {
    return client.get(`${BASE_URL}/projects-with-sessions`);
  },

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string): Promise<AgentSession & { messages: AgentMessage[]; tasks: AgentTask[] }> {
    return client.get(`${BASE_URL}/sessions/${sessionId}`);
  },

  /**
   * 根据项目ID获取会话
   */
  async getSessionByProjectId(projectId: string): Promise<AgentSession & { messages: AgentMessage[]; tasks: AgentTask[] }> {
    return client.get(`${BASE_URL}/projects/${projectId}/session`);
  },

  /**
   * 暂停会话
   */
  async pauseSession(sessionId: string): Promise<AgentSession> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/pause`);
  },

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string): Promise<AgentSession> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/resume`);
  },

  /**
   * 取消会话
   */
  async cancelSession(sessionId: string): Promise<AgentSession> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/cancel`);
  },

  // ============================================================
  // 消息处理
  // ============================================================

  /**
   * 发送消息
   */
  async sendMessage(sessionId: string, content: string): Promise<AgentChatResponse> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/messages`, { content });
  },

  /**
   * 获取消息历史
   */
  async getMessages(sessionId: string, limit = 50, offset = 0): Promise<{
    messages: AgentMessage[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    return client.get(`${BASE_URL}/sessions/${sessionId}/messages`, {
      params: { limit, offset }
    });
  },

  /**
   * 编辑消息
   */
  async editMessage(sessionId: string, messageId: string, newContent: string): Promise<AgentMessage> {
    return client.put(`${BASE_URL}/sessions/${sessionId}/messages/${messageId}`, { content: newContent });
  },

  /**
   * 重置消息（删除该消息及后续所有消息）
   */
  async resetMessage(sessionId: string, messageId: string): Promise<void> {
    return client.delete(`${BASE_URL}/sessions/${sessionId}/messages/${messageId}`);
  },

  // ============================================================
  // 任务管理
  // ============================================================

  /**
   * 获取任务列表
   */
  async getTasks(sessionId: string, status?: string): Promise<AgentTask[]> {
    return client.get(`${BASE_URL}/sessions/${sessionId}/tasks`, {
      params: { status }
    });
  },

  /**
   * 创建任务
   */
  async createTask(sessionId: string, type: string, params?: any): Promise<AgentTask> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/tasks`, { type, params });
  },

  /**
   * 确认任务
   */
  async confirmTask(sessionId: string, taskId: string): Promise<AgentTask> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/tasks/${taskId}/confirm`);
  },

  /**
   * 修改任务
   */
  async modifyTask(sessionId: string, taskId: string, modifications: any): Promise<AgentTask> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/tasks/${taskId}/modify`, modifications);
  },

  /**
   * 重新生成任务
   */
  async regenerateTask(sessionId: string, taskId: string): Promise<AgentTask> {
    return client.post(`${BASE_URL}/sessions/${sessionId}/tasks/${taskId}/regenerate`);
  },

  /**
   * 获取会话进度
   */
  async getProgress(sessionId: string): Promise<AgentProgressResponse> {
    return client.get(`${BASE_URL}/sessions/${sessionId}/progress`);
  },

  // ============================================================
  // SSE 进度
  // ============================================================

  /**
   * 创建进度 EventSource
   */
  createProgressEventSource(sessionId: string): EventSource {
    const token = localStorage.getItem(TOKEN_KEY);
    const url = `${import.meta.env.VITE_API_URL || ''}/api${BASE_URL}/sessions/${sessionId}/progress?token=${token}`;
    return new EventSource(url);
  },

  // ============================================================
  // 工具
  // ============================================================

  /**
   * 获取可用工具列表
   */
  async getTools(): Promise<any[]> {
    return client.get(`${BASE_URL}/tools`);
  }
};

export default agentApi;