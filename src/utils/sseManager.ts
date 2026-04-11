/**
 * SSE 连接管理器
 *
 * 功能：
 * 1. 基于 sessionStorage 的连接锁机制
 * 2. 使用 BroadcastChannel 实现跨标签页消息同步
 * 3. 自动检测和释放过期锁
 * 4. 页面关闭时自动清理
 */

export class SSEManager {
  private lockKey = 'agent_sse_lock';
  private channel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private listeners: Set<(data: any) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private tabId: string = Math.random().toString(36).substr(2, 9);
  private currentSessionId: string | null = null;

  constructor() {
    // 使用 BroadcastChannel 同步消息（支持跨标签页通信）
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('agent_sse_sync');
      this.channel.onmessage = (e) => {
        // 收到主标签页广播的消息，通知所有监听者
        this.listeners.forEach(fn => fn(e.data));
      };
    }

    // 监听页面关闭事件，自动释放锁
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.releaseLock();
      });
    }
  }

  /**
   * 连接到 SSE 端点
   * @param sessionId 会话 ID
   * @param sseUrl SSE 端点 URL
   * @returns true = 创建了新连接，false = 监听模式
   */
  connect(sessionId: string, sseUrl: string): boolean {
    // 如果已连接到同一个会话，直接返回
    if (this.currentSessionId === sessionId && this.eventSource) {
      return true;
    }

    // 先断开旧连接
    if (this.eventSource) {
      this.disconnect();
    }

    const now = Date.now();
    const lockData = this.getLockData();

    // 检查是否已有活跃锁
    if (lockData && lockData.sessionId === sessionId) {
      // 同一个会话
      if (now - lockData.timestamp < 5 * 60 * 1000) { // 5分钟过期
        // 锁仍然有效，进入监听模式
        console.log(`[SSEManager] 检测到标签页 ${lockData.tabId} 已有活跃连接，进入监听模式`);
        this.currentSessionId = sessionId;
        return false;
      }
    }

    // 尝试获取锁
    this.acquireLock(sessionId);

    // 创建 SSE 连接
    console.log(`[SSEManager] 创建新连接: ${sessionId}`);
    this.eventSource = new EventSource(sseUrl);
    this.currentSessionId = sessionId;

    // 连接成功
    this.eventSource.onopen = () => {
      console.log('[SSEManager] 连接已建立');
      this.startHeartbeat();
    };

    // 接收消息
    this.eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // 广播给其他标签页
        if (this.channel) {
          this.channel.postMessage(data);
        }

        // 通知本标签页的所有监听者
        this.listeners.forEach(fn => fn(data));
      } catch (error) {
        console.error('[SSEManager] 解析消息失败:', error);
      }
    };

    // 错误处理
    this.eventSource.onerror = (error) => {
      console.error('[SSEManager] 连接错误:', error);
      // 错误时不立即释放锁，等待重连
    };

    return true;
  }

  /**
   * 断开连接
   */
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
  }

  /**
   * 释放锁并断开连接
   */
  releaseLock() {
    const lockData = this.getLockData();

    // 只有当前标签页持有锁时才释放
    if (lockData && lockData.tabId === this.tabId) {
      sessionStorage.removeItem(this.lockKey);
      console.log(`[SSEManager] 标签页 ${this.tabId} 释放锁`);
    }

    this.disconnect();
  }

  /**
   * 订阅消息
   * @param fn 消息处理函数
   * @returns 取消订阅函数
   */
  onMessage(fn: (data: any) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * 检查是否为主标签页
   */
  isPrimary(): boolean {
    const lockData = this.getLockData();
    return lockData?.tabId === this.tabId;
  }

  /**
   * 获取锁数据
   */
  private getLockData(): { tabId: string; timestamp: number; sessionId: string } | null {
    if (typeof sessionStorage === 'undefined') return null;

    const data = sessionStorage.getItem(this.lockKey);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * 获取锁
   */
  private acquireLock(sessionId: string) {
    const lockData = {
      tabId: this.tabId,
      timestamp: Date.now(),
      sessionId
    };

    sessionStorage.setItem(this.lockKey, JSON.stringify(lockData));
    console.log(`[SSEManager] 标签页 ${this.tabId} 获取锁`);
  }

  /**
   * 启动心跳，定期更新锁时间戳
   */
  private startHeartbeat() {
    // 每 1 分钟更新一次锁时间戳
    this.heartbeatInterval = setInterval(() => {
      if (this.currentSessionId && this.isPrimary()) {
        this.acquireLock(this.currentSessionId);
      }
    }, 60 * 1000);
  }
}

// 单例导出
export const sseManager = new SSEManager();