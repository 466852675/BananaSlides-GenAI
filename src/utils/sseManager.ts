/**
 * SSE 连接管理器
 *
 * 功能：
 * 1. 基于 localStorage 的连接锁机制
 * 2. 使用 BroadcastChannel 实现跨标签页消息同步
 * 3. 自动检测和释放过期锁
 * 4. 页面关闭时自动清理
 * 5. 标签页切换时不断连，仅降低心跳频率
 */

export class SSEManager {
  private lockKey = 'agent_sse_lock';
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Set<(data: any) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private tabId: string = Math.random().toString(36).substr(2, 9);
  private currentSessionId: string | null = null;
  private isBackground: boolean = false;
  private currentSseUrl: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('agent_sse_sync');
      this.channel.onmessage = (e) => {
        if (e.data?.sessionId && this.currentSessionId && e.data.sessionId !== this.currentSessionId) {
          return;
        }
        this.listeners.forEach(fn => fn(e.data));
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.releaseLock();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.isBackground = true;
          this.adjustHeartbeatForBackground();
        } else {
          this.isBackground = false;
          this.adjustHeartbeatForForeground();
        }
      });
    }
  }

  connect(sessionId: string, sseUrl: string): boolean {
    if (this.currentSessionId === sessionId && this.eventSource) {
      if (this.eventSource.readyState === EventSource.CLOSED) {
        console.warn('[SSEManager] EventSource 处于 CLOSED 状态，清理并重建');
        this.eventSource.close();
        this.eventSource = null;
        this.currentSessionId = null;
      } else {
        return true;
      }
    }

    if (this.eventSource) {
      this.disconnect();
    }

    this.currentSseUrl = sseUrl;

    const now = Date.now();
    const lockData = this.getLockData();

    if (lockData && lockData.sessionId === sessionId) {
      if (now - lockData.timestamp < 5 * 60 * 1000) {
        console.log(`[SSEManager] 检测到标签页 ${lockData.tabId} 已有活跃连接，进入监听模式`);
        this.currentSessionId = sessionId;
        return false;
      }
    }

    this.acquireLock(sessionId);

    console.log(`[SSEManager] 创建新连接: ${sessionId}`);
    this.eventSource = new EventSource(sseUrl);
    this.currentSessionId = sessionId;

    this.eventSource.onopen = () => {
      console.log('[SSEManager] 连接已建立');
      this.startHeartbeat();
    };

    this.eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (this.channel) {
          this.channel.postMessage({ ...data, sessionId });
        }
        this.listeners.forEach(fn => fn(data));
      } catch (error) {
        console.error('[SSEManager] 解析消息失败:', error);
      }
    };

    this.eventSource.onerror = () => {
      console.error('[SSEManager] 连接错误');
    };

    return true;
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSEManager] 连接已断开');
    }

    this.currentSessionId = null;
    this.currentSseUrl = null;
  }

  releaseLock() {
    const lockData = this.getLockData();

    if (lockData && lockData.tabId === this.tabId) {
      localStorage.removeItem(this.lockKey);
      console.log(`[SSEManager] 标签页 ${this.tabId} 释放锁`);
    }

    this.disconnect();
  }

  onMessage(fn: (data: any) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  isPrimary(): boolean {
    const lockData = this.getLockData();
    return lockData?.tabId === this.tabId;
  }

  private adjustHeartbeatForBackground() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = setInterval(() => {
        if (this.currentSessionId && this.isPrimary()) {
          this.acquireLock(this.currentSessionId);
        }
      }, 60 * 1000);
      console.log('[SSEManager] 心跳降级为 60s (后台模式)');
    }
  }

  private adjustHeartbeatForForeground() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.startHeartbeat();
      console.log('[SSEManager] 心跳恢复为 30s (前台模式)');
    }
  }

  private getLockData(): { tabId: string; timestamp: number; sessionId: string } | null {
    if (typeof localStorage === 'undefined') return null;

    const data = localStorage.getItem(this.lockKey);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private acquireLock(sessionId: string) {
    const lockData = {
      tabId: this.tabId,
      timestamp: Date.now(),
      sessionId
    };
    localStorage.setItem(this.lockKey, JSON.stringify(lockData));
    console.log(`[SSEManager] 标签页 ${this.tabId} 获取锁`);
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.currentSessionId && this.isPrimary()) {
        this.acquireLock(this.currentSessionId);
      }
    }, this.isBackground ? 60 * 1000 : 30 * 1000);
  }
}

export const sseManager = new SSEManager();