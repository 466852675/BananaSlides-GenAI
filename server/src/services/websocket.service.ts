/**
 * WebSocket 服务
 *
 * 用于 Agent 和工作台之间的实时状态同步
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage, Server } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../db';
import { logger } from '../utils/logger';


interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp?: number;
}

interface ConnectedClient {
  socket: WebSocket;
  userId: string;
  projectId?: string;
  lastPing: number;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private projectRooms: Map<string, Set<string>> = new Map(); // projectId -> clientIds
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化 WebSocket 服务
   */
  init(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    logger.info('[WebSocket] 服务已启动，路径: /ws');

    this.wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      this.handleConnection(socket, req);
    });

    // 启动心跳检测
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, 30000);
  }

  /**
   * 处理新连接
   */
  private handleConnection(socket: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateClientId();

    try {
      // 从 URL 参数获取 token
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(4001, '缺少认证 Token');
        return;
      }

      // 验证 JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true }
      }).then(user => {
        if (!user) {
          socket.close(4002, '用户不存在');
          return;
        }

        // 注册客户端
        this.clients.set(clientId, {
          socket,
          userId: user.id,
          lastPing: Date.now()
        });

        logger.info(`[WebSocket] 客户端 ${clientId} 已连接 (用户: ${user.id})`);

        // 发送连接成功消息
        this.send(socket, {
          type: 'connected',
          payload: { clientId },
          timestamp: Date.now()
        });

        // 监听消息
        socket.on('message', (data: RawData) => {
          this.handleMessage(clientId, data);
        });

        // 监听关闭
        socket.on('close', () => {
          this.handleDisconnect(clientId);
        });

        // 监听错误
        socket.on('error', (error: Error) => {
          logger.error(`[WebSocket] 客户端 ${clientId} 错误:`, error);
          this.handleDisconnect(clientId);
        });
      }).catch(err => {
        logger.error('[WebSocket] 查询用户失败:', err);
        socket.close(5000, '服务器错误');
      });

    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      logger.error('[WebSocket] 连接处理失败:', error);
      if (err.name === 'JsonWebTokenError') {
        socket.close(4003, 'Token 无效');
      } else if (err.name === 'TokenExpiredError') {
        socket.close(4004, 'Token 已过期');
      } else {
        socket.close(5000, '服务器错误');
      }
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(clientId: string, data: RawData): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      if (!client) {
        return;
      }

      // 更新心跳时间
      client.lastPing = Date.now();

      switch (message.type) {
        case 'ping':
          this.send(client.socket, { type: 'pong', payload: {}, timestamp: Date.now() });
          break;

        case 'join_project':
          this.joinProject(clientId, message.payload.projectId);
          break;

        case 'leave_project':
          this.leaveProject(clientId, message.payload.projectId);
          break;

        case 'sync_request':
          this.handleSyncRequest(clientId, message.payload);
          break;

        default:
          logger.warn(`[WebSocket] 未知消息类型: ${message.type}`);
      }
    } catch (error: unknown) {
      logger.error(`[WebSocket] 解析消息失败:`, error);
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      // 从所有项目房间移除
      if (client.projectId) {
        this.removeFromRoom(client.projectId, clientId);
      }

      this.clients.delete(clientId);
      logger.info(`[WebSocket] 客户端 ${clientId} 已断开`);
    }
  }

  /**
   * 加入项目房间
   */
  joinProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // 离开之前的房间
    if (client.projectId) {
      this.leaveProject(clientId, client.projectId);
    }

    // 加入新房间
    client.projectId = projectId;

    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)?.add(clientId);

    logger.info(`[WebSocket] 客户端 ${clientId} 加入项目房间 ${projectId}`);

    // 发送确认
    this.send(client.socket, {
      type: 'joined_project',
      payload: { projectId },
      timestamp: Date.now()
    });
  }

  /**
   * 离开项目房间
   */
  leaveProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.removeFromRoom(projectId, clientId);

    if (client.projectId === projectId) {
      client.projectId = undefined;
    }

    logger.info(`[WebSocket] 客户端 ${clientId} 离开项目房间 ${projectId}`);

    this.send(client.socket, {
      type: 'left_project',
      payload: { projectId },
      timestamp: Date.now()
    });
  }

  /**
   * 从房间移除客户端
   */
  private removeFromRoom(projectId: string, clientId: string): void {
    const room = this.projectRooms.get(projectId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }
  }

  /**
   * 处理同步请求
   */
  private handleSyncRequest(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.projectId) return;

    // 广播同步请求到同一项目的其他客户端
    this.broadcastToProject(client.projectId, {
      type: 'sync_update',
      payload: payload,
      timestamp: Date.now()
    }, clientId); // 排除发送者
  }

  /**
   * 发送消息到指定客户端
   */
  private send(socket: WebSocket, message: WebSocketMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /**
   * 广播到项目房间
   */
  broadcastToProject(projectId: string, message: WebSocketMessage, excludeClientId?: string): void {
    const room = this.projectRooms.get(projectId);
    if (!room) return;

    const messageData = JSON.stringify(message);

    for (const clientId of room) {
      if (excludeClientId && clientId === excludeClientId) continue;

      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageData);
      }
    }
  }

  /**
   * 发送消息到特定用户
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        this.send(client.socket, message);
      }
    }
  }

  /**
   * 广播 Agent 进度更新
   */
  broadcastAgentProgress(sessionId: string, projectId: string, progress: any): void {
    this.broadcastToProject(projectId, {
      type: 'agent_progress',
      payload: {
        sessionId,
        progress
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播 Agent 任务完成
   */
  broadcastAgentTaskComplete(sessionId: string, projectId: string, task: any): void {
    this.broadcastToProject(projectId, {
      type: 'agent_task_complete',
      payload: {
        sessionId,
        task
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播 Agent 任务预览更新（引导模式下预生成结果）
   */
  broadcastAgentTaskPreview(sessionId: string, projectId: string, task: any): void {
    this.broadcastToProject(projectId, {
      type: 'agent_task_preview',
      payload: {
        sessionId,
        task
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播大纲流式输出块
   */
  broadcastOutlineChunk(sessionId: string, projectId: string, chunk: any): void {
    this.broadcastToProject(projectId, {
      type: 'outline_streaming_chunk',
      payload: {
        sessionId,
        chunk
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播内容流式输出块
   */
  broadcastContentChunk(sessionId: string, projectId: string, chunk: any): void {
    this.broadcastToProject(projectId, {
      type: 'content_streaming_chunk',
      payload: {
        sessionId,
        chunk
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播图片生成进度（逐页）
   */
  broadcastImageProgress(sessionId: string, projectId: string, data: {
    slideIndex: number;
    slideTitle?: string;
    totalSlides?: number;
    totalPages?: number;
    currentPage?: number;
    status: 'generating' | 'completed' | 'failed';
    imageUrl?: string;
    error?: string;
  }): void {
    this.broadcastToProject(projectId, {
      type: 'image_progress',
      payload: {
        sessionId,
        ...data
      },
      timestamp: Date.now()
    });
  }

  /**
   * 广播幻灯片更新
   */
  broadcastSlidesUpdate(projectId: string, items: any[], source: 'agent' | 'workbench'): void {
    this.broadcastToProject(projectId, {
      type: 'slides_update',
      payload: {
        projectId,
        items,
        source
      },
      timestamp: Date.now()
    });
  }

  /**
   * 心跳检测
   */
  private checkHeartbeat(): void {
    const now = Date.now();
    const timeout = 60000; // 60秒超时

    for (const [clientId, client] of this.clients) {
      if (now - client.lastPing > timeout) {
        logger.warn(`[WebSocket] 客户端 ${clientId} 心跳超时，断开连接`);
        client.socket.close(4005, '心跳超时');
        this.handleDisconnect(clientId);
      }
    }
  }

  /**
   * 生成客户端 ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取统计信息
   */
  getStats(): { totalClients: number; projectRooms: number; } {
    return {
      totalClients: this.clients.size,
      projectRooms: this.projectRooms.size
    };
  }

  /**
   * 关闭服务
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      // 关闭所有客户端连接
      for (const [clientId, client] of this.clients) {
        client.socket.close(1001, '服务器关闭');
      }

      this.wss.close();
      logger.info('[WebSocket] 服务已关闭');
    }
  }
}

// 导出单例
export const websocketService = new WebSocketService();