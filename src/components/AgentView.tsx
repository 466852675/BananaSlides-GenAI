/**
 * AgentView 主组件
 *
 * AI Agent 对话界面，支持自然语言生成演示文稿
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, Sparkles, ChevronLeft, ChevronRight, Plus, Eye, MessageCircle, PanelLeft } from 'lucide-react';
import AgentSidebar from './AgentSidebar';
import AgentHeader from './AgentHeader';
import ChatArea from './ChatArea';
import InputArea from './InputArea';
import AgentWelcome from './AgentWelcome';
import AgentPreview from './AgentPreview';
import agentApi, { type ProjectWithSession } from '../api/agent';
import { client } from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import { smartRefine } from '../services/geminiService';
import type {
  AgentSession,
  AgentMessage,
  AgentTask,
  AgentProgressResponse,
  AgentViewProps
} from '../types/agent';

// 移动端断点
const MOBILE_BREAKPOINT = 768;

export default function AgentView({
  items,
  config,
  styleMap,
  currentProjectId,
  onItemsChange,
  onConfigChange,
  onStyleMapChange,
  onCreateProject,
  onOpenConfig,
  onOpenStyle,
  configSaved: configSavedProp = false,
  showToast,
  isVip = false
}: AgentViewProps) {

  // 移动端检测
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      // 移动端默认折叠侧边栏
      if (mobile && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // 初始检测

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 错误提示辅助函数
  const showError = useCallback((message: string, error?: unknown) => {
    console.error(message, error);
    if (showToast) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showToast(`${message}${errorMsg ? `: ${errorMsg}` : ''}`, 'error');
    }
  }, [showToast]);

  // 会话状态
  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [progress, setProgress] = useState<AgentProgressResponse | null>(null);

  // UI 状态
  const [inputValue, setInputValue] = useState('');
  const [autoMode, setAutoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // 默认折叠
  const [showPreview, setShowPreview] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  // 风格选择处理
  const handleStyleSelect = useCallback(async (styleId: string | null) => {
    setSelectedStyleId(styleId);

    if (!styleId) {
      // 清除风格选择
      onStyleMapChange?.({});
      return;
    }

    try {
      // 获取风格模板详情
      const response = await client.get(`/templates/${styleId}`);
      const styleTemplate = response as any;

      if (styleTemplate && styleTemplate.styleMap) {
        // 应用风格到项目的 styleMap
        onStyleMapChange?.(styleTemplate.styleMap);
        showToast?.(`已应用风格：${styleTemplate.name}`, 'success');
      }
    } catch (error) {
      showError('应用风格失败', error);
    }
  }, [onStyleMapChange, showToast]);

  // 检测是否有已完成的幻灯片可以预览
  const hasCompletedSlides = useMemo(
    () => items && items.length > 0 && items.some(item => item.status === 'success'),
    [items]
  );

  // 项目列表（侧边栏）- 使用 ProjectWithSession 类型
  const [projects, setProjects] = useState<ProjectWithSession[]>([]);

  // WebSocket 连接
  const { status: wsStatus, lastMessage: wsMessage, joinProject, leaveProject } = useWebSocket(currentProjectId);

  // 上一次 WebSocket 连接状态（用于检测重连）
  const prevWsConnectedRef = useRef(wsStatus.connected);

  // WebSocket 重连后恢复状态
  useEffect(() => {
    // 检测从不连接到连接的状态变化（重连成功）
    if (wsStatus.connected && !prevWsConnectedRef.current && session) {
      console.log('[AgentView] WebSocket 重连成功，恢复会话状态...');
      // 重新获取会话状态
      agentApi.getSession(session.id)
        .then(updatedSession => {
          setMessages(updatedSession.messages || []);
          setTasks(updatedSession.tasks || []);
          showToast?.('连接已恢复', 'info');
        })
        .catch(error => {
          showError('恢复会话状态失败', error);
        });
    }
    prevWsConnectedRef.current = wsStatus.connected;
  }, [wsStatus.connected, session, showToast]);

  // SSE 连接
  const eventSourceRef = useRef<EventSource | null>(null);

  // 初始化会话
  useEffect(() => {
    if (currentProjectId) {
      initSession(currentProjectId);
    }
  }, [currentProjectId]);

  // 获取项目列表（含 AgentSession 信息）
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await agentApi.getProjectsWithSessions();
        setProjects(response);
      } catch (error) {
        showError('获取项目列表失败', error);
      }
    };
    fetchProjects();
  }, [showToast]);

  // SSE 进度监听
  useEffect(() => {
    if (session && session.status === 'ACTIVE') {
      // 创建 SSE 连接
      const es = agentApi.createProgressEventSource(session.id);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setProgress(data);
        } catch (e) {
          showError('解析进度数据失败', e);
        }
      };

      es.onerror = (error) => {
        showError('进度连接中断，正在重连...', error);
        es.close();
      };

      eventSourceRef.current = es;

      return () => {
        es.close();
      };
    }
  }, [session?.id, session?.status]);

  // WebSocket 消息处理
  useEffect(() => {
    if (!wsMessage) return;

    switch (wsMessage.type) {
      case 'agent_progress':
        // 更新进度
        if (wsMessage.payload?.progress) {
          setProgress(wsMessage.payload.progress);
        }
        break;

      case 'agent_task_complete':
        // 任务完成，更新任务列表
        if (wsMessage.payload?.task) {
          setTasks(prev => {
            const existingIndex = prev.findIndex(t => t.id === wsMessage.payload.task.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = wsMessage.payload.task;
              return updated;
            }
            return [...prev, wsMessage.payload.task];
          });
        }
        break;

      case 'slides_update':
        // 工作台同步更新
        if (wsMessage.payload?.items && wsMessage.payload.source === 'workbench') {
          onItemsChange(wsMessage.payload.items);
        }
        break;

      case 'connected':
        console.log('[AgentView] WebSocket 已连接');
        break;

      case 'joined_project':
        console.log('[AgentView] 已加入项目房间:', wsMessage.payload?.projectId);
        break;
    }
  }, [wsMessage, onItemsChange]);

  // 初始化会话
  const initSession = async (projectId: string) => {
    try {
      setIsLoading(true);
      const existingSession = await agentApi.getSessionByProjectId(projectId);
      setSession(existingSession);
      setMessages(existingSession.messages || []);
      setTasks(existingSession.tasks || []);
    } catch (error: any) {
      // 检查是否是"会话不存在"错误（后端返回 404）
      // 由于 axios 拦截器会转换错误，需要通过消息内容判断
      const errorMessage = error.message || '';
      if (errorMessage.includes('会话不存在') || errorMessage.includes('404')) {
        // 会话不存在，创建新会话
        try {
          const newSession = await agentApi.createSession(projectId, autoMode ? 'AUTO' : 'GUIDED');
          setSession(newSession);
          setMessages([]);
          setTasks([]);
        } catch (createError) {
          showError('创建会话失败', createError);
        }
      } else {
        showError('获取会话失败', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const content = inputValue.trim();
    setInputValue('');

    // 立即添加用户消息到对话列表（乐观更新）—— 放在 setIsLoading 之前，确保 UI 立即响应
    const tempUserMessage: AgentMessage = {
      id: `temp-user-${Date.now()}`,
      sessionId: session?.id || '',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      isEdited: false,
      isDeleted: false
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      // 如果没有项目，先创建项目
      let projectId = currentProjectId;
      if (!projectId && onCreateProject) {
        try {
          // 使用用户输入的前 50 个字符作为项目标题
          const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
          projectId = await onCreateProject(title);
        } catch (createProjectError) {
          showError('创建项目失败', createProjectError);
          setInputValue(content);
          setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id)); // 移除临时消息
          return;
        }
      }

      if (!projectId) {
        showError('无法发送消息：没有可用项目');
        setInputValue(content);
        setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
        return;
      }

      // 如果没有 session，先创建
      let currentSession = session;
      if (!currentSession) {
        try {
          currentSession = await agentApi.createSession(projectId, autoMode ? 'AUTO' : 'GUIDED');
          setSession(currentSession);
        } catch (createError) {
          showError('创建会话失败', createError);
          setInputValue(content);
          setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
          return;
        }
      }

      const response = await agentApi.sendMessage(currentSession.id, content);

      // 用服务端返回的真实消息替换临时消息
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        // 添加用户消息（使用服务端返回的）和 AI 响应
        const newMessages = [...filtered];
        if (response.userMessage) {
          newMessages.push(response.userMessage);
        }
        if (response.message) {
          newMessages.push(response.message);
        }
        return newMessages;
      });

      if (response.tasks) {
        setTasks(prev => [...prev, ...response.tasks]);
      }
      if (response.progress) {
        setProgress(response.progress);
      }
    } catch (error) {
      showError('发送消息失败', error);
      // 恢复输入
      setInputValue(content);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, session, isLoading, currentProjectId, autoMode, onCreateProject]);

  // 切换自动模式
  const handleToggleAutoMode = useCallback(() => {
    setAutoMode(prev => !prev);
  }, []);

  // 暂停会话
  const handlePauseSession = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const updatedSession = await agentApi.pauseSession(session.id);
      setSession(updatedSession);
      showToast?.('已暂停执行', 'info');
    } catch (error) {
      showError('暂停失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 恢复会话
  const handleResumeSession = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const updatedSession = await agentApi.resumeSession(session.id);
      setSession(updatedSession);
      showToast?.('已继续执行', 'info');
    } catch (error) {
      showError('恢复失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 取消会话
  const handleCancelSession = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const updatedSession = await agentApi.cancelSession(session.id);
      setSession(updatedSession);
      // 清除所有待处理的任务
      setTasks(prev => prev.map(task =>
        task.status === 'PENDING' ? { ...task, status: 'CANCELLED' as any } : task
      ));
      showToast?.('已取消任务', 'info');
    } catch (error) {
      showError('取消失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 选择项目
  const handleSelectProject = useCallback((projectId: string) => {
    initSession(projectId);
  }, []);

  // 新建项目（用于侧边栏）
  const handleCreateNewProject = useCallback(async () => {
    if (onCreateProject) {
      try {
        const projectId = await onCreateProject('新项目');
        // 创建后自动选中
        initSession(projectId);
        // 刷新项目列表
        const response = await agentApi.getProjectsWithSessions();
        setProjects(response);
      } catch (error) {
        showError('创建项目失败', error);
      }
    }
  }, [onCreateProject, showError]);

  // 欢迎界面示例点击
  const handleExampleClick = useCallback((example: string) => {
    setInputValue(example);
  }, []);

  // 确认任务
  const handleConfirmTask = useCallback(async (taskId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 确认任务
      await agentApi.confirmTask(session.id, taskId);
      // 更新任务状态（标记为已确认）
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: 'COMPLETED' as any } : task
      ));
    } catch (error) {
      showError('确认任务失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 修改任务
  const handleModifyTask = useCallback(async (taskId: string) => {
    // 设置输入框提示用户输入修改要求
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setInputValue(`请修改${getTaskTypeLabel(task.type)}：`);
    }
  }, [tasks]);

  // 重新生成任务
  const handleRegenerateTask = useCallback(async (taskId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 重新生成任务
      await agentApi.regenerateTask(session.id, taskId);
      showToast?.('已提交重新生成请求', 'info');
    } catch (error) {
      showError('重新生成失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 编辑消息
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 编辑消息
      await agentApi.editMessage(session.id, messageId, newContent);
      // 更新本地消息
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, isEdited: true } : msg
      ));
    } catch (error) {
      showError('编辑消息失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 重置消息
  const handleResetMessage = useCallback(async (messageId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 重置消息
      await agentApi.resetMessage(session.id, messageId);
      // 删除该消息及其后续所有消息
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex >= 0) {
        const targetMessage = messages[messageIndex];
        setMessages(prev => prev.slice(0, messageIndex));
        // 同时清除在该消息之后创建的任务
        // 按任务创建时间判断，删除在目标消息之后创建的任务
        const targetTime = new Date(targetMessage.createdAt).getTime();
        setTasks(prev => prev.filter(task => {
          const taskTime = new Date(task.createdAt).getTime();
          return taskTime < targetTime;
        }));
      }
    } catch (error) {
      showError('重置消息失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, messages]);

  // 任务类型标签
  const getTaskTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      OUTLINE: '大纲',
      CONTENT: '内容',
      IMAGE: '配图',
      EXPORT: '导出',
      IMPORT: '导入',
      MODIFY: '修改',
      STYLE: '风格',
      SNAPSHOT: '快照'
    };
    return labels[type] || type;
  };

  // AI 智能修饰
  const handleAIRefine = useCallback(async (text: string) => {
    try {
      const refined = await smartRefine(text, 'content');
      setInputValue(refined);
    } catch (error) {
      showError('AI 修饰失败', error);
    }
  }, []);

  // 文件上传处理
  const handleFileUpload = useCallback(async (type: 'outline' | 'document', file: File) => {
    console.log('File upload:', type, file.name);
    setIsLoading(true);

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', file);

      // 调用上传 API
      const response = await client.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }) as { url: string; filename: string; mimetype: string };

      console.log('Upload success:', response);

      // 根据上传类型处理
      if (type === 'outline') {
        // 上传大纲文件，通知 Agent 解析
        const uploadMessage = `我上传了一个大纲文件 "${file.name}"，请帮我解析并生成 PPT 结构。`;
        setInputValue(uploadMessage);

        // 如果有会话，自动发送消息
        if (session) {
          const result = await agentApi.sendMessage(session.id, uploadMessage);
          setMessages(prev => [...prev, result.message]);
          if (result.tasks) {
            setTasks(prev => [...prev, ...result.tasks]);
          }
          if (result.progress) {
            setProgress(result.progress);
          }
        }
      } else if (type === 'document') {
        // 导入现有文档
        const uploadMessage = `我上传了一个文档 "${file.name}"，请帮我将其转换为 PPT。`;
        setInputValue(uploadMessage);

        if (session) {
          const result = await agentApi.sendMessage(session.id, uploadMessage);
          setMessages(prev => [...prev, result.message]);
          if (result.tasks) {
            setTasks(prev => [...prev, ...result.tasks]);
          }
          if (result.progress) {
            setProgress(result.progress);
          }
        }
      }
    } catch (error: any) {
      showError('文件上传失败', error);
      // 显示错误提示
      setInputValue(prev => prev + `\n[上传失败: ${error.message || '未知错误'}]`);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // 检测 styleMap 是否有选择
  const hasStyleSelected = Object.values(styleMap || {}).some(v => v !== null);

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden relative" role="main" aria-label="Agent 对话界面">
      {/* 移动端侧边栏覆盖层 */}
      <AnimatePresence>
        {!sidebarCollapsed && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 z-20"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* 侧边栏 */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: isMobile ? -280 : 0 }}
            animate={{
              width: isMobile ? 280 : 280,
              opacity: 1,
              x: 0
            }}
            exit={{ width: 0, opacity: 0, x: isMobile ? -280 : 0 }}
            transition={{ duration: 0.2 }}
            className={`flex-shrink-0 ${isMobile ? 'absolute left-0 top-0 bottom-0 z-30 shadow-xl' : ''}`}
            role="navigation"
            aria-label="项目列表"
          >
            <AgentSidebar
              projects={projects}
              currentProjectId={currentProjectId}
              onSelectProject={(id) => {
                handleSelectProject(id);
                if (isMobile) setSidebarCollapsed(true);
              }}
              session={session}
              progress={progress}
              onCreateProject={handleCreateNewProject}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 侧边栏切换按钮 */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`absolute top-1/2 z-10 flex h-8 w-4 items-center justify-center rounded-r bg-white shadow hover:bg-gray-50 transition-all ${
          isMobile ? 'left-0' : ''
        }`}
        style={{ left: sidebarCollapsed ? 0 : (isMobile ? 280 : 280) }}
        aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        aria-expanded={!sidebarCollapsed}
      >
        {sidebarCollapsed ? <PanelLeft size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <AgentHeader
            session={session}
            isAutoMode={autoMode}
            isExecuting={isLoading && session?.status === 'ACTIVE'}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onCancel={handleCancelSession}
          />
          {/* 预览/聊天切换 */}
          {hasCompletedSlides && messages.length > 0 && (
            <div className="flex items-center gap-1 pr-4">
              <button
                onClick={() => setShowPreview(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  !showPreview ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <MessageCircle size={14} />
                对话
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  showPreview ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Eye size={14} />
                预览
              </button>
            </div>
          )}
        </div>

        {showPreview && hasCompletedSlides ? (
          /* 预览模式 */
          <AgentPreview
            items={items}
            projectTitle={session?.project?.title}
            onModifySlide={(index) => {
              setShowPreview(false);
              if (items[index]) {
                setInputValue(`请修改第 ${index + 1} 页「${items[index].title || ''}」的内容：`);
              }
            }}
            onRegenerateSlide={(index) => {
              // 触发重新生成该页
              if (items[index]) {
                setInputValue(`请重新生成第 ${index + 1} 页`);
                handleSend();
              }
            }}
            onClose={() => setShowPreview(false)}
          />
        ) : (
          /* 对话模式 */
          <>
            {/* 对话区域 */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {messages.length === 0 ? (
                <AgentWelcome
                  onExampleClick={handleExampleClick}
                  onCreateProject={onCreateProject}
                  onStyleSelect={handleStyleSelect}
                  selectedStyleId={selectedStyleId}
                />
              ) : (
                <ChatArea
                  messages={messages}
                  tasks={tasks}
                  progress={progress}
                  isLoading={isLoading}
                  onConfirmTask={handleConfirmTask}
                  onModifyTask={handleModifyTask}
                  onRegenerateTask={handleRegenerateTask}
                  onEditMessage={handleEditMessage}
                  onResetMessage={handleResetMessage}
                  isVip={isVip}
                />
              )}
            </div>

            {/* 输入区域 */}
            <InputArea
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              isLoading={isLoading}
              autoMode={autoMode}
              onToggleAutoMode={handleToggleAutoMode}
              onOpenConfig={onOpenConfig}
              onOpenStyle={onOpenStyle}
              configSaved={configSavedProp}
              styleSelected={hasStyleSelected}
              onAIRefine={handleAIRefine}
              onFileUpload={handleFileUpload}
            />
          </>
        )}

      </div>
    </div>
  );
}