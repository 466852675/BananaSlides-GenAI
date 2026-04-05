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
  const projectIdRef = useRef(projectId);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const joinedProjectRef = useRef<string | null>(null);

  // 更新 projectId ref
  useEffect(() => {
    projectIdRef.current = projectId;
  }, [projectId]);

  // 获取 WebSocket URL - 使用相对路径通过 Vite 代理，避免跨端口不稳定
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    // 开发环境：通过 Vite 代理 /ws -> ws://127.0.0.1:1111/ws
    // 生产环境：使用 VITE_WS_URL 或相对路径
    const baseUrl = import.meta.env.VITE_WS_URL
      || (import.meta.env.DEV ? '' : 'ws://localhost:1111');
    // 构建完整 URL
    const wsUrl = baseUrl
      ? `${baseUrl}/ws?token=${token}`
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    return wsUrl;
  }, []);

  // 心跳检测
  const startHeartbeat = useCallback((ws: WebSocket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', payload: {} }));
      }
    }, 25000);
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || isConnectingRef.current) {
      return;
    }

    // 如果已有连接，先关闭
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);

      ws.onopen = () => {
        isConnectingRef.current = false;
        setStatus({ connected: true, reconnecting: false, error: null });
        reconnectAttemptsRef.current = 0;

        // 如果有项目 ID，自动加入房间
        if (projectIdRef.current) {
          ws.send(JSON.stringify({
            type: 'join_project',
            payload: { projectId: projectIdRef.current },
            timestamp: Date.now()
          }));
          joinedProjectRef.current = projectIdRef.current;
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
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        wsRef.current = null;
        joinedProjectRef.current = null;

        // 清理心跳
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

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
      isConnectingRef.current = false;
      console.error('[WebSocket] 创建连接失败:', error);
      setStatus({ connected: false, reconnecting: false, error: error.message });
    }
  }, [isAuthenticated, getWebSocketUrl, startHeartbeat]);

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
    if (!newProjectId || joinedProjectRef.current === newProjectId) {
      return;
    }

    if (joinedProjectRef.current && joinedProjectRef.current !== newProjectId) {
      send({
        type: 'leave_project',
        payload: { projectId: joinedProjectRef.current },
        timestamp: Date.now()
      });
    }

    send({
      type: 'join_project',
      payload: { projectId: newProjectId },
      timestamp: Date.now()
    });
    joinedProjectRef.current = newProjectId;
  }, [send]);

  // 离开项目房间
  const leaveProject = useCallback((projectIdToLeave: string) => {
    if (!projectIdToLeave || joinedProjectRef.current !== projectIdToLeave) {
      return;
    }

    send({
      type: 'leave_project',
      payload: { projectId: projectIdToLeave },
      timestamp: Date.now()
    });
    joinedProjectRef.current = null;
  }, [send]);

  // 发送同步请求
  const sendSyncRequest = useCallback((payload: any) => {
    send({
      type: 'sync_request',
      payload,
      timestamp: Date.now()
    });
  }, [send]);

  // 初始化连接 - 只在认证状态变化时连接
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      // 清理
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, '组件卸载');
        wsRef.current = null;
      }
    };
  }, [isAuthenticated]); // 只依赖 isAuthenticated

  // 项目 ID 变化时切换房间
  useEffect(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    const joinedProjectId = joinedProjectRef.current;

    if (!projectId) {
      if (joinedProjectId) {
        wsRef.current.send(JSON.stringify({
          type: 'leave_project',
          payload: { projectId: joinedProjectId },
          timestamp: Date.now()
        }));
        joinedProjectRef.current = null;
      }
      return;
    }

    if (joinedProjectId === projectId) {
      return;
    }

    if (joinedProjectId) {
      wsRef.current.send(JSON.stringify({
        type: 'leave_project',
        payload: { projectId: joinedProjectId },
        timestamp: Date.now()
      }));
    }

    wsRef.current.send(JSON.stringify({
      type: 'join_project',
      payload: { projectId },
      timestamp: Date.now()
    }));
    joinedProjectRef.current = projectId;
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
