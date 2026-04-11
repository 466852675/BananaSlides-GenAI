/**
 * AgentView 主组件
 *
 * AI Agent 对话界面，支持自然语言生成演示文稿
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, Sparkles, ChevronLeft, ChevronRight, Plus, Eye, MessageCircle, PanelLeft, Trash2 } from 'lucide-react';
import AgentSidebar from './AgentSidebar';
import AgentHeader from './AgentHeader';
import ChatArea from './ChatArea';
import InputArea from './InputArea';
import AgentWelcome from './AgentWelcome';
import AgentPreview from './AgentPreview';
import { ConfirmDialog } from './ConfirmDialog';
import agentApi, { type ProjectWithSession } from '../api/agent';
import { client } from '../api/client';
import { smartRefine } from '../services/geminiService';
import { exportToZip, exportToPdf, exportToPptx } from '../services/exportService';
import { sseManager } from '../utils/sseManager';
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
  onSelectProject,
  onOpenConfig,
  onOpenStyle,
  configSaved: configSavedProp = false,
  showToast,
  isVip = false,
  styleSelectionCleared,
  // WebSocket props - 由 App.tsx 统一管理
  wsStatus,
  wsMessage,
  onWsJoinProject,
  onWsLeaveProject
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

  // 流式输出状态
  const [streamingOutline, setStreamingOutline] = useState<{
    slides: any[];
    isGenerating: boolean;
  }>({ slides: [], isGenerating: false });

  const [streamingContent, setStreamingContent] = useState<{
    slides: any[];
    isGenerating: boolean;
  }>({ slides: [], isGenerating: false });

  const [imageProgress, setImageProgress] = useState<{
    pages: any[];
    currentPage: number;
  }>({ pages: [], currentPage: 0 });

  // UI 状态
  const [inputValue, setInputValue] = useState('');
  const [autoMode, setAutoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 默认展开
  const [showPreview, setShowPreview] = useState(false);
  const [userHasSelectedMode, setUserHasSelectedMode] = useState(false); // 用户是否主动选择了模式
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false); // 清空确认对话框状态

  // 监听外部清除风格选中状态
  useEffect(() => {
    if (styleSelectionCleared !== undefined && styleSelectionCleared > 0) {
      setSelectedStyleId(null);
    }
  }, [styleSelectionCleared]);

  // 风格选择处理
  const handleStyleSelect = useCallback(async (styleId: string | null, styleMap?: Record<string, any>, config?: Record<string, any>) => {
    setSelectedStyleId(styleId);

    if (!styleId) {
      // 清除风格选择 - 同时清空 styleMap 和 config
      onStyleMapChange?.({});
      onConfigChange?.({});
      return;
    }

    // 如果传入了 styleMap 和 config，直接使用
    if (styleMap && Object.keys(styleMap).length > 0) {
      onStyleMapChange?.(styleMap);
      // 同时更新 config（如果有传入）
      if (config && Object.keys(config).length > 0) {
        onConfigChange?.(config);
      }
      showToast?.('已应用风格模板', 'success');
      return;
    }

    // 否则从 API 获取风格模板详情
    try {
      const response = await client.get(`/templates/${styleId}`);
      const styleTemplate = response as any;

      if (styleTemplate) {
        // 更新 styleMap
        if (styleTemplate.styleMap) {
          onStyleMapChange?.(styleTemplate.styleMap);
        }
        // 更新 config
        if (styleTemplate.config) {
          onConfigChange?.(styleTemplate.config);
        }
        showToast?.(`已应用风格：${styleTemplate.name}`, 'success');
      }
    } catch (error) {
      showError('应用风格失败', error);
    }
  }, [onStyleMapChange, onConfigChange, showToast]);

  // 复用历史配置处理
  const handleReuseConfig = useCallback((config: Record<string, any>) => {
    // 应用配置到当前项目
    if (config && Object.keys(config).length > 0) {
      onConfigChange?.(config);
      showToast?.('已复用历史配置', 'success');
    }
  }, [onConfigChange, showToast]);

  // 检测是否有已完成的幻灯片可以预览
  const hasCompletedSlides = useMemo(
    () => items && items.length > 0 && items.some(item => item.status === 'success'),
    [items]
  );

  // 项目列表（侧边栏）- 使用 ProjectWithSession 类型
  const [projects, setProjects] = useState<ProjectWithSession[]>([]);

  // 【修复】组件加载时获取项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await agentApi.getProjectsWithSessions();
        setProjects(response);
      } catch (error) {
        console.error('[AgentView] 获取项目列表失败:', error);
      }
    };
    fetchProjects();
  }, []);

  // 获取当前项目状态（用于判断显示对话还是预览）
  const currentProject = useMemo(() => {
    if (!currentProjectId) return null;
    return projects.find(p => p.id === currentProjectId);
  }, [currentProjectId, projects]);

  // 合并 session 数据：优先使用 session state，但补充 currentProject.agentSession 的进度数据
  // 这样历史库项目的进度信息也能正确显示
  const displaySession = useMemo(() => {
    if (!session && !currentProject?.agentSession) return null;

    // 如果有 session state，使用它
    if (session) {
      // 但如果 session 缺少进度数据，从 currentProject.agentSession 补充
      const projectSession = currentProject?.agentSession;
      if (projectSession && (session.totalTasks === 0 || session.totalPointsUsed === 0)) {
        return {
          ...session,
          totalTasks: projectSession.totalTasks || session.totalTasks,
          completedTasks: projectSession.completedTasks || session.completedTasks,
          totalPointsUsed: projectSession.totalPointsUsed || session.totalPointsUsed,
          failedTasks: projectSession.failedTasks || session.failedTasks
        };
      }
      return session;
    }

    // 没有 session state 但有 currentProject.agentSession（历史库项目）
    return currentProject?.agentSession || null;
  }, [session, currentProject?.agentSession]);

  // 切换项目时重置用户模式选择状态，并根据项目状态设置默认视图
  useEffect(() => {
    setUserHasSelectedMode(false);
    // 已完成项目默认显示预览，其他状态默认显示对话
    setShowPreview(currentProject?.status === 'completed');
  }, [currentProjectId, currentProject?.status]);

  // WebSocket 状态 - 使用从 App.tsx 传递的 props
  // 默认值用于兼容旧调用
  const connected = wsStatus?.connected ?? false;
  const reconnecting = wsStatus?.reconnecting ?? false;

  // 上一次 WebSocket 连接状态（用于检测重连）
  const prevWsConnectedRef = useRef(connected);

  // 请求锁：防止 initSession 并发调用
  const initSessionRef = useRef<string | null>(null);
  const initSessionLoadingRef = useRef(false);
  const lastInitializedProjectRef = useRef<string | null>(null);
  const sessionProjectIdRef = useRef<string | null>(null);
  const autoModeRef = useRef(autoMode);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    sessionProjectIdRef.current = session?.projectId ?? null;
  }, [session?.projectId]);

  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // WebSocket 重连后恢复状态
  const reconnectingRef = useRef(false);
  useEffect(() => {
    // 检测从不连接到连接的状态变化（重连成功）
    if (connected && !prevWsConnectedRef.current && session) {
      // 防止并发恢复请求
      if (!reconnectingRef.current) {
        reconnectingRef.current = true;
        agentApi.getSession(session.id)
          .then(updatedSession => {
            setMessages(updatedSession.messages || []);
            setTasks(updatedSession.tasks || []);
            showToast?.('连接已恢复', 'info');
          })
          .catch(error => {
            showError('恢复会话状态失败', error);
          })
          .finally(() => {
            reconnectingRef.current = false;
          });
      }
    }
    prevWsConnectedRef.current = connected;
  }, [connected, session, showToast]);

  // SSE 连接 - 使用 sseManager 管理跨标签页去重
  const sseConnectedRef = useRef(false);
  const sseUnsubscribeRef = useRef<(() => void) | null>(null);

  // SSE 进度监听
  useEffect(() => {
    if (session && session.status === 'ACTIVE') {
      const sseUrl = `/api/agent/sessions/${session.id}/stream`;

      // 使用 sseManager 连接，自动处理跨标签页去重
      const isPrimary = sseManager.connect(session.id, sseUrl);
      sseConnectedRef.current = true;

      console.log(`[AgentView] SSE 连接模式: ${isPrimary ? '主连接' : '监听模式'}`);

      // 订阅消息
      const unsubscribe = sseManager.onMessage((data) => {
        setProgress(data);
      });

      sseUnsubscribeRef.current = unsubscribe;

      return () => {
        // 组件卸载时取消订阅
        if (unsubscribe) {
          unsubscribe();
        }
        sseConnectedRef.current = false;
      };
    } else {
      // session 不是 ACTIVE，断开 SSE
      if (sseUnsubscribeRef.current) {
        sseUnsubscribeRef.current();
        sseUnsubscribeRef.current = null;
      }
    }
  }, [session?.id, session?.status]);

  // WebSocket 消息处理
  useEffect(() => {
    if (!wsMessage) return;

    // 校验消息所属的 session，防止切换项目时收到旧消息
    if (wsMessage.payload?.sessionId && session && wsMessage.payload.sessionId !== session.id) {
      return;
    }

    switch (wsMessage.type) {
      case 'agent_progress':
        // 更新进度
        if (wsMessage.payload?.progress) {
          setProgress(wsMessage.payload.progress);
        }
        // 更新任务进度
        if (wsMessage.payload?.taskId && wsMessage.payload?.progress !== undefined) {
          setTasks(prev => prev.map(task =>
            task.id === wsMessage.payload.taskId
              ? {
                  ...task,
                  progress: wsMessage.payload.progress,
                  status: wsMessage.payload.status ?? task.status,
                  error: wsMessage.payload.error ?? task.error,
                  result: wsMessage.payload.result !== undefined
                    ? (typeof wsMessage.payload.result === 'string'
                      ? wsMessage.payload.result
                      : JSON.stringify(wsMessage.payload.result))
                    : task.result
                }
              : task
          ));
        }
        break;

      case 'agent_task_complete':
        // 任务完成，更新任务列表
        if (wsMessage.payload?.task) {
          const completedTask = wsMessage.payload.task;
          setTasks(prev => {
            const existingIndex = prev.findIndex(t => t.id === completedTask.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = completedTask;
              return updated;
            }
            return [...prev, completedTask];
          });

          // 流式输出完成信号
          if (completedTask.type === 'OUTLINE') {
            setStreamingOutline({ slides: [], isGenerating: false });
          } else if (completedTask.type === 'CONTENT') {
            setStreamingContent({ slides: [], isGenerating: false });
          }
        }
        break;

      case 'agent_task_preview':
        // 任务预览更新（引导模式下预生成结果）
        if (wsMessage.payload?.task) {
          const previewTask = wsMessage.payload.task;
          setTasks(prev => {
            const existingIndex = prev.findIndex(t => t.id === previewTask.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              // result 从 WebSocket 接收时是对象，需要序列化为字符串存储
              updated[existingIndex] = {
                ...updated[existingIndex],
                result: typeof previewTask.result === 'string'
                  ? previewTask.result
                  : JSON.stringify(previewTask.result)
              };
              return updated;
            }
            return prev;
          });
        }
        break;

      case 'outline_streaming_chunk':
        // 大纲流式输出块
        if (wsMessage.payload?.chunk) {
          const chunk = wsMessage.payload.chunk;
          setStreamingOutline(prev => ({
            isGenerating: true,
            slides: [...prev.slides, {
              index: chunk.slideIndex,
              title: chunk.title,
              brief: chunk.brief,
              pageType: chunk.pageType
            }]
          }));
        }
        break;

      case 'content_streaming_chunk':
        // 内容流式输出块
        if (wsMessage.payload?.chunk) {
          const chunk = wsMessage.payload.chunk;
          setStreamingContent(prev => {
            const slides = [...prev.slides];
            if (chunk.isComplete || !slides[chunk.slideIndex]) {
              slides[chunk.slideIndex] = {
                index: chunk.slideIndex,
                content: chunk.content
              };
            } else {
              slides[chunk.slideIndex].content += chunk.content;
            }
            return { isGenerating: true, slides };
          });
        }
        break;

      case 'image_progress':
        // 图片生成进度（逐页）
        if (wsMessage.payload) {
          const data = wsMessage.payload;
          setImageProgress(prev => {
            const pages = [...prev.pages];
            pages[data.slideIndex] = {
              slideIndex: data.slideIndex,
              slideTitle: data.slideTitle,
              status: data.status,
              imageUrl: data.imageUrl,
              error: data.error
            };
            return {
              pages,
              currentPage: data.status === 'generating' ? data.slideIndex : prev.currentPage
            };
          });
        }
        break;

      case 'agent_task_created':
        // 新任务创建（任务链）
        if (wsMessage.payload?.task) {
          setTasks(prev => {
            // 避免重复添加
            const exists = prev.some(t => t.id === wsMessage.payload.task.id);
            if (!exists) {
              return [...prev, wsMessage.payload.task];
            }
            return prev;
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
        break;

      case 'joined_project':
        break;
    }
  }, [wsMessage, onItemsChange]);

  // 初始化会话
  const initSession = useCallback(async (projectId: string) => {
    if (!projectId) return;

    if (initSessionLoadingRef.current && initSessionRef.current === projectId) {
      return;
    }

    if (
      lastInitializedProjectRef.current === projectId &&
      sessionProjectIdRef.current === projectId &&
      session?.projectId === projectId  // 【新增】确保会话已关联当前项目
    ) {
      return;
    }

    // 如果正在加载其他项目，先取消前一个请求的后续处理
    initSessionRef.current = projectId;
    initSessionLoadingRef.current = true;

    try {
      setIsLoading(true);
      const existingSession = await agentApi.getSessionByProjectId(projectId);

      // 确认返回的是当前请求的项目
      if (initSessionRef.current !== projectId) {
        return;
      }

      setSession(existingSession);
      setMessages(existingSession.messages || []);
      setTasks(existingSession.tasks || []);
      lastInitializedProjectRef.current = projectId;
    } catch (error: any) {
      // 再次确认是当前请求的项目
      if (initSessionRef.current !== projectId) return;

      const errorMessage = error.message || '';
      if (errorMessage.includes('会话不存在') || errorMessage.includes('404')) {
        try {
          const newSession = await agentApi.createSession(projectId, autoModeRef.current ? 'AUTO' : 'GUIDED');
          if (initSessionRef.current !== projectId) return;
          setSession(newSession);
          setMessages([]);
          setTasks([]);
          lastInitializedProjectRef.current = projectId;
        } catch (createError) {
          showErrorRef.current('创建会话失败', createError);
        }
      } else {
        showErrorRef.current('获取会话失败', error);
      }
    } finally {
      if (initSessionRef.current === projectId) {
        setIsLoading(false);
        initSessionLoadingRef.current = false;
      }
    }
  }, []);

  // 当 currentProjectId 变化时初始化会话
  useEffect(() => {
    if (currentProjectId) {
      initSession(currentProjectId);
      return;
    }
    lastInitializedProjectRef.current = null;
  }, [currentProjectId, initSession]);

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
      let shouldInitSession = false;  // 【新增】标记是否需要初始化会话
      if (!projectId && onCreateProject) {
        try {
          // 使用用户输入的前 50 个字符作为项目标题
          const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
          projectId = await onCreateProject(title);
          shouldInitSession = true;  // 新创建的项目需要初始化会话
          // 【修复】标记当前项目已处理，避免 initSession 被重复触发
          lastInitializedProjectRef.current = projectId;
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
      if (!currentSession || shouldInitSession) {  // 【修复】新项目需要创建会话
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

      // 【修复】发送消息后刷新项目列表（新创建的项目需要显示在侧边栏）
      try {
        const updatedProjects = await agentApi.getProjectsWithSessions();
        setProjects(updatedProjects);
      } catch (refreshError) {
        console.error('[AgentView] 刷新项目列表失败:', refreshError);
      }
    } catch (error) {
      showError('发送消息失败', error);
      // 恢复输入
      setInputValue(content);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, session, isLoading, currentProjectId, autoMode, onCreateProject]);

  // AI 重写指令：直接发送自然语言修改指令
  const handleSendAiModify = useCallback(async (instruction: string) => {
    if (isLoading || !instruction.trim() || !session?.id) return;

    // 添加用户消息到对话列表
    const tempUserMessage: AgentMessage = {
      id: `temp-ai-${Date.now()}`,
      sessionId: session.id,
      role: 'user',
      content: instruction,
      createdAt: new Date().toISOString(),
      isEdited: false,
      isDeleted: false
    };
    setMessages(prev => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const result = await agentApi.sendMessage(session.id, instruction);
      if (result.message) {
        setMessages(prev => [...prev.filter(m => !m.id.startsWith('temp-ai-')), result.message]);
      }
      if (result.tasks) {
        setTasks(result.tasks);
      }
    } catch (error: any) {
      console.error('[AgentView] AI 重写指令发送失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, isLoading]);

  // 切换自动模式
  const handleToggleAutoMode = useCallback(async () => {
    const newMode = !autoMode;

    // 如果有会话，同步到后端
    if (session) {
      try {
        const updatedSession = await agentApi.updateSessionMode(session.id, newMode ? 'AUTO' : 'GUIDED');
        setSession(updatedSession);
        setAutoMode(newMode);
        showToast?.(newMode ? '已切换到自动执行模式' : '已切换到引导模式', 'info');
      } catch (error) {
        showError('切换模式失败', error);
      }
    } else {
      // 没有会话时只更新本地状态
      setAutoMode(newMode);
    }
  }, [autoMode, session, showToast]);

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

  // 选择项目 - 直接更新 currentProjectId，React state setter 会自动处理相同值的优化
  const handleSelectProject = useCallback((projectId: string) => {
    onSelectProject?.(projectId);
  }, [onSelectProject]);

  // 侧边栏选择项目 - 包装原始选择函数，添加移动端侧边栏收起逻辑
  // 使用 useCallback 确保回调函数稳定，避免每次渲染创建新函数导致 AgentSidebar 不必要重渲染
  const handleSidebarSelectProject = useCallback((projectId: string) => {
    handleSelectProject(projectId);
    if (isMobile) setSidebarCollapsed(true);
  }, [handleSelectProject, isMobile, setSidebarCollapsed]);

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

  // 删除项目 - 实时从列表中移除
  const handleDeleteProject = useCallback((projectId: string) => {
    const wasCurrentProject = currentProjectId === projectId;

    // 从列表中移除项目
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== projectId);

      // 如果删除的是当前选中的项目
      if (wasCurrentProject) {
        if (remaining.length > 0) {
          // 自动选择第一个项目（延迟执行，确保 state 更新完成）
          setTimeout(() => initSession(remaining[0].id), 0);
        } else {
          // 没有其他项目，清除会话
          setSession(null);
          setMessages([]);
          setTasks([]);
        }
      }

      return remaining;
    });
  }, [currentProjectId]);

  // 欢迎界面示例点击
  const handleExampleClick = useCallback((example: string) => {
    setInputValue(example);
  }, []);

  // 确认任务
  const handleConfirmTask = useCallback(async (taskId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 确认任务（后端会将状态改为 RUNNING 并执行）
      await agentApi.confirmTask(session.id, taskId);
      // 更新任务状态为 RUNNING（等待 SSE/WebSocket 推送完成事件）
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: 'RUNNING' as any } : task
      ));
      showToast?.('任务开始执行', 'info');

      // 【修复】配置确认后刷新项目列表，确保新创建的项目显示在侧边栏
      try {
        const updatedProjects = await agentApi.getProjectsWithSessions();
        setProjects(updatedProjects);
      } catch (refreshError) {
        console.error('[AgentView] 刷新项目列表失败:', refreshError);
      }
    } catch (error) {
      showError('确认任务失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 修改任务
  const handleModifyTask = useCallback(async (taskId: string, modifiedData?: any) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 如果提供了修改数据，直接调用 API 更新任务参数
      if (modifiedData) {
        const task = tasks.find(t => t.id === taskId);

        // 根据任务类型处理不同的修改数据
        if (task?.type === 'OUTLINE') {
          // 大纲修改：更新任务的 result
          await agentApi.modifyTask(session.id, taskId, { params: modifiedData });
          // 更新本地任务状态
          setTasks(prev => prev.map(t =>
            t.id === taskId
              ? { ...t, result: JSON.stringify({ title: modifiedData.title, slides: modifiedData.slides }) }
              : t
          ));
          showToast?.('大纲已修改', 'success');
        } else if (task?.type === 'CONTENT') {
          // 内容修改：更新任务的 result
          await agentApi.modifyTask(session.id, taskId, { params: modifiedData });
          // 更新本地任务状态
          setTasks(prev => prev.map(t =>
            t.id === taskId
              ? { ...t, result: JSON.stringify({ slides: modifiedData.slides }) }
              : t
          ));
          showToast?.('内容已修改', 'success');
        } else {
          // 配置修改（原有逻辑）
          await agentApi.modifyTask(session.id, taskId, { params: modifiedData });
          setTasks(prev => prev.map(task =>
            task.id === taskId
              ? { ...task, result: JSON.stringify({ topic: modifiedData.topic, config: modifiedData }) }
              : task
          ));
          showToast?.('配置已修改', 'success');
        }
      } else {
        // 原有逻辑：设置输入框提示用户输入修改要求
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setInputValue(`请修改${getTaskTypeLabel(task.type)}：`);
        }
      }
    } catch (error) {
      showError('修改任务失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, tasks, showToast, showError]);

  // 重新生成任务
  const handleRegenerateTask = useCallback(async (taskId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 重新生成任务
      const updatedTask = await agentApi.regenerateTask(session.id, taskId);
      // 更新本地任务状态为 PENDING
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: 'PENDING' as any, progress: 0, result: null, error: null } : task
      ));
      showToast?.('已重置任务，请重新确认', 'info');
    } catch (error) {
      showError('重新生成失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // 确认所有配图
  const handleConfirmAllImages = useCallback(async (taskId: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用后端 API 确认所有配图
      await agentApi.confirmAllImages(session.id, taskId);
      // 更新本地任务状态
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: 'COMPLETED' as any } : task
      ));
      showToast?.('配图已全部确认，演示文稿制作完成', 'success');
    } catch (error) {
      showError('确认失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast, showError]);

  // 重新生成选中的配图
  const handleRegenerateSelectedImages = useCallback(async (taskId: string, indexes: number[], prompt?: string) => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用后端 API 创建重新生成任务
      const newTask = await agentApi.regenerateSelectedImages(session.id, taskId, indexes, prompt);
      // 添加新任务到列表
      setTasks(prev => [...prev, newTask]);
      showToast?.(`已创建重新生成任务，将重新生成第 ${indexes.map(i => i + 1).join('、')} 页配图`, 'info');
    } catch (error) {
      showError('创建重新生成任务失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast, showError]);

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
      const result = await agentApi.resetMessage(session.id, messageId);
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
      // 显示退还积分提示
      if (result.refundedPoints > 0) {
        showToast?.(`已退还 ${result.refundedPoints} 积分`, 'success');
      }
    } catch (error) {
      showError('重置消息失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, messages, showToast]);

  // 清空会话（删除所有消息和任务）
  const handleClearSession = useCallback(() => {
    if (!session) return;
    setClearDialogOpen(true);
  }, [session]);

  // 确认清空会话
  const confirmClearSession = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      // 调用 API 清空会话
      const result = await agentApi.clearSession(session.id);
      // 清空本地消息和任务状态
      setMessages([]);
      setTasks([]);
      // 重置流式输出状态
      setStreamingOutline({ slides: [], isGenerating: false });
      setStreamingContent({ slides: [], isGenerating: false });
      // 显示提示
      showToast?.('对话历史已清空', 'success');
      // 显示退还积分提示
      if (result.refundedPoints > 0) {
        showToast?.(`已退还 ${result.refundedPoints} 积分`, 'success');
      }
    } catch (error) {
      showError('清空对话失败', error);
    } finally {
      setIsLoading(false);
      setClearDialogOpen(false);
    }
  }, [session, showToast, showError]);

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

  // 导出功能处理
  const handleExportZip = useCallback(async () => {
    if (!items || items.length === 0) {
      showToast?.('没有可导出的幻灯片', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await exportToZip(items, currentProject?.title || 'slides');
      showToast?.('导出 ZIP 成功', 'success');
    } catch (error) {
      showError('导出 ZIP 失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [items, currentProject?.title, showToast]);

  const handleExportPdf = useCallback(async () => {
    if (!items || items.length === 0) {
      showToast?.('没有可导出的幻灯片', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await exportToPdf(items, currentProject?.title || 'presentation');
      showToast?.('导出 PDF 成功', 'success');
    } catch (error) {
      showError('导出 PDF 失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [items, currentProject?.title, showToast]);

  const handleExportPptx = useCallback(async () => {
    if (!items || items.length === 0) {
      showToast?.('没有可导出的幻灯片', 'error');
      return;
    }
    try {
      setIsLoading(true);
      await exportToPptx(items, currentProject?.title || 'presentation');
      showToast?.('导出 PPTX 成功', 'success');
    } catch (error) {
      showError('导出 PPTX 失败', error);
    } finally {
      setIsLoading(false);
    }
  }, [items, currentProject?.title, showToast]);

  // 文件上传处理
  const handleFileUpload = useCallback(async (type: 'outline' | 'document', file: File) => {
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

  // 检测 config 是否已应用（有有效的风格名称才表示真正应用了模板）
  const hasConfigApplied = useMemo(() => {
    if (!config) return false;
    // 只有 styleName 才是模板应用的标志，aspectRatio 默认值是 16:9 不能作为判断依据
    return !!config.styleName;
  }, [config]);

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
            initial={{ width: 0 }}
            animate={{ width: 280 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`flex-shrink-0 overflow-hidden ${isMobile ? 'absolute left-0 top-0 bottom-0 z-30 shadow-xl' : ''}`}
            role="navigation"
            aria-label="项目列表"
          >
            <AgentSidebar
              projects={projects}
              currentProjectId={currentProjectId}
              onSelectProject={handleSidebarSelectProject}
              session={displaySession}
              progress={progress}
              onCreateProject={handleCreateNewProject}
              onDeleteProject={handleDeleteProject}
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
        {/* 顶部导航栏 - 统一背景 */}
        <div className="flex items-center justify-between bg-gray-50 border-b border-gray-100">
          <AgentHeader
            session={displaySession}
            projectStatus={currentProject?.status}
            progress={progress}
            isAutoMode={autoMode}
            isExecuting={isLoading && displaySession?.status === 'ACTIVE'}
            onPause={handlePauseSession}
            onResume={handleResumeSession}
            onCancel={handleCancelSession}
          />
          {/* 预览/聊天切换 - 所有项目都可切换 */}
          <div className="flex items-center gap-1 pr-4">
            {/* 清空对话按钮 - 只在有消息时显示 */}
            {messages.length > 0 && (
              <button
                onClick={handleClearSession}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 mr-2"
                title="清空对话历史"
              >
                <Trash2 size={14} />
                清空
              </button>
            )}
            <button
              onClick={() => {
                setShowPreview(false);
                setUserHasSelectedMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                !showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <MessageCircle size={14} />
              对话
            </button>
            <button
              onClick={() => {
                setShowPreview(true);
                setUserHasSelectedMode(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                showPreview ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              <Eye size={14} />
              预览
            </button>
          </div>
        </div>

        {/* 根据 showPreview 状态决定显示预览或对话页面 */}
        {showPreview ? (
          /* 预览模式 - 需要明确的高度限制 */
          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentPreview
              items={items}
              projectTitle={session?.project?.title}
              onModifySlide={async (index, data) => {
                // 在本弹窗中直接处理修改请求
                if (items[index]) {
                  const slide = items[index];
                  let message = `请修改第 ${index + 1} 页`;
                  if (data.title) {
                    message += `「${data.title}」`;
                  }
                  message += '的内容';
                  if (data.requirements) {
                    message += `：${data.requirements}`;
                  }
                  // 设置输入值并发送
                  setInputValue(message);
                  await handleSend();
                }
              }}
              onRegenerateSlide={async (index) => {
                // 在本弹窗中直接处理重新生成请求
                if (items[index]) {
                  const message = `请重新生成第 ${index + 1} 页${items[index].title ? `「${items[index].title}」` : ''}`;
                  setInputValue(message);
                  await handleSend();
                }
              }}
              onClose={() => {
                setShowPreview(false);
                setUserHasSelectedMode(true);
              }}
            />
          </div>
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
                  onReuseConfig={handleReuseConfig}
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
                  onRegenerateSelectedImages={handleRegenerateSelectedImages}
                  onConfirmAllImages={handleConfirmAllImages}
                  onExportZip={handleExportZip}
                  onExportPdf={handleExportPdf}
                  onExportPptx={handleExportPptx}
                  onSendAiModify={handleSendAiModify}
                  streamingOutline={streamingOutline}
                  streamingContent={streamingContent}
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
              configSaved={configSavedProp || hasConfigApplied}
              styleSelected={hasStyleSelected}
              onAIRefine={handleAIRefine}
              onFileUpload={handleFileUpload}
            />
          </>
        )}

      </div>

      {/* 清空对话确认对话框 */}
      <ConfirmDialog
        isOpen={clearDialogOpen}
        title="清空对话"
        message="确定要清空所有对话历史吗？此操作不可恢复。"
        onConfirm={confirmClearSession}
        onCancel={() => setClearDialogOpen(false)}
        type="danger"
        confirmText="确认清空"
        cancelText="取消"
        isLoading={isLoading}
      />
    </div>
  );
}
