/**
 * WebSocket 连接 Hook
 *
 * 用于 Agent 和工作台之间的实时状态同步
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TOKEN_KEY } from '../api/client';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketStatus {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

export function useWebSocket(projectId?: string) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    reconnecting: false,
    error: null
  });
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // 获取 WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:1111';
    return `${baseUrl}/ws?token=${token}`;
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated) {
      setStatus({ connected: false, reconnecting: false, error: '未登录' });
      return;
    }

    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus({ connected: true, reconnecting: false, error: null });
        reconnectAttemptsRef.current = 0;

        // 如果有项目 ID，自动加入房间
        if (projectId) {
          ws.send(JSON.stringify({
            type: 'join_project',
            payload: { projectId },
            timestamp: Date.now()
          }));
        }

        // 启动心跳
        startHeartbeat(ws);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('[WebSocket] 解析消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] 连接错误:', error);
        setStatus(prev => ({ ...prev, error: '连接错误' }));
      };

      ws.onclose = (event) => {
        setStatus({ connected: false, reconnecting: false, error: null });

        // 非正常关闭时尝试重连
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          setStatus(prev => ({ ...prev, reconnecting: true }));

          setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setStatus({ connected: false, reconnecting: false, error: '重连失败，请刷新页面' });
        }
      };

      wsRef.current = ws;
    } catch (error: any) {
      console.error('[WebSocket] 创建连接失败:', error);
      setStatus({ connected: false, reconnecting: false, error: error.message });
    }
  }, [isAuthenticated, getWebSocketUrl, projectId]);

  // 心跳检测
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = (ws: WebSocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, 25000);
  };

  // 发送消息
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] 连接未打开，无法发送消息');
    }
  }, []);

  // 加入项目房间
  const joinProject = useCallback((newProjectId: string) => {
    send({
      type: 'join_project',
      payload: { projectId: newProjectId },
      timestamp: Date.now()
    });
  }, [send]);

  // 离开项目房间
  const leaveProject = useCallback((projectIdToLeave: string) => {
    send({
      type: 'leave_project',
      payload: { projectId: projectIdToLeave },
      timestamp: Date.now()
    });
  }, [send]);

  // 发送同步请求
  const sendSyncRequest = useCallback((payload: any) => {
    send({
      type: 'sync_request',
      payload,
      timestamp: Date.now()
    });
  }, [send]);

  // 初始化连接
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      // 清理
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, '组件卸载');
      }
    };
  }, [isAuthenticated, connect]);

  // 项目 ID 变化时切换房间
  useEffect(() => {
    if (projectId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_project',
        payload: { projectId },
        timestamp: Date.now()
      }));
    }
  }, [projectId]);

  return {
    status,
    lastMessage,
    send,
    joinProject,
    leaveProject,
    sendSyncRequest,
    reconnect: connect
  };
}

export default useWebSocket;