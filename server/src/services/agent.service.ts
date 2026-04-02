/**
 * Agent 服务
 *
 * 核心 Agent 服务，负责处理用户消息、管理会话、协调任务执行
 *
 * 设计要点：
 * - 复用现有 AIService 进行 AI 生成
 * - 复用 PointsService 进行积分管理
 * - 支持引导模式和自动模式
 */

import { PrismaClient, AgentSessionStatus, AgentTaskStatus, AgentTaskType, AgentMode } from '@prisma/client';
import { AIService } from './ai.service';
import * as pointsService from './points.service';
import { snapshotService } from './snapshot.service';
import { websocketService } from './websocket.service';
import { resourceService } from './resource.service';
import {
  AgentTool,
  AgentToolCall,
  AgentMessageCreateInput,
  AgentTaskCreateInput,
  AgentSessionCreateInput,
  AgentProgressResponse,
  AgentChatResponse,
  AGENT_TOOLS
} from '../types/agent.types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class AgentService {

  // ============================================================
  // 会话管理
  // ============================================================

  /**
   * 创建新的 Agent 会话
   */
  async createSession(input: AgentSessionCreateInput) {
    // 检查项目是否已有会话
    const existingSession = await prisma.agentSession.findUnique({
      where: { projectId: input.projectId }
    });

    if (existingSession) {
      // 如果会话已完成或失败，重置它
      if (existingSession.status === AgentSessionStatus.COMPLETED ||
          existingSession.status === AgentSessionStatus.FAILED ||
          existingSession.status === AgentSessionStatus.CANCELLED) {
        return this.resetSession(existingSession.id, input.mode);
      }
      return existingSession;
    }

    // 创建新会话
    const session = await prisma.agentSession.create({
      data: {
        projectId: input.projectId,
        mode: input.mode || AgentMode.GUIDED,
        status: AgentSessionStatus.ACTIVE
      },
      include: {
        project: {
          select: { id: true, title: true, thumbnailUrl: true }
        }
      }
    });

    logger.info(`[Agent] 创建会话: ${session.id}, 项目: ${input.projectId}`);
    return session;
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string) {
    return prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        project: { select: { id: true, title: true, thumbnailUrl: true } },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        },
        tasks: {
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });
  }

  /**
   * 根据项目ID获取会话
   */
  async getSessionByProjectId(projectId: string) {
    return prisma.agentSession.findUnique({
      where: { projectId },
      include: {
        project: { select: { id: true, title: true, thumbnailUrl: true } },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          take: 50
        },
        tasks: {
          where: { status: { not: AgentTaskStatus.COMPLETED } },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
        }
      }
    });
  }

  /**
   * 获取用户的所有项目及其 AgentSession 信息
   * 用于 Agent 模式侧边栏显示
   */
  async getUserProjectsWithSessions(userId: string) {
    // 获取用户所有非删除的项目
    const projects = await prisma.project.findMany({
      where: {
        userId,
        isDeleted: false
      },
      select: {
        id: true,
        displayId: true,
        title: true,
        thumbnailUrl: true,
        status: true,
        scenarioType: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        agentSession: {
          select: {
            id: true,
            status: true,
            mode: true,
            totalTasks: true,
            completedTasks: true,
            failedTasks: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return projects.map(p => ({
      ...p,
      agentSession: p.agentSession || null
    }));
  }

  /**
   * 重置会话
   */
  private async resetSession(sessionId: string, mode?: AgentMode) {
    await prisma.$transaction([
      // 清除旧消息
      prisma.agentMessage.deleteMany({ where: { sessionId } }),
      // 清除旧任务
      prisma.agentTask.deleteMany({ where: { sessionId } }),
      // 重置会话状态
      prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.ACTIVE,
          mode: mode || AgentMode.GUIDED,
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          totalPointsUsed: 0,
          context: null,
          completedAt: null
        }
      })
    ]);

    return this.getSession(sessionId);
  }

  // ============================================================
  // 消息处理
  // ============================================================

  /**
   * 处理用户消息
   */
  async processMessage(
    sessionId: string,
    content: string,
    userId: string
  ): Promise<AgentChatResponse> {
    // 获取会话
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('会话不存在');
    }

    if (session.status !== AgentSessionStatus.ACTIVE) {
      throw new Error('会话已结束，请创建新会话');
    }

    // 保存用户消息
    const userMessage = await prisma.agentMessage.create({
      data: {
        sessionId,
        role: 'user',
        content
      }
    });

    // 解析用户意图并创建任务
    const intent = await this.parseIntent(content, session);

    // 创建任务
    const tasks: any[] = [];
    if (intent.tasks && intent.tasks.length > 0) {
      for (const taskType of intent.tasks) {
        const task = await this.createTask(sessionId, taskType, intent.params);
        tasks.push(task);
      }
    }

    // 生成助手回复
    const assistantContent = await this.generateResponse(session, userMessage, intent);
    const assistantMessage = await prisma.agentMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantContent,
        metadata: JSON.stringify({
          taskId: tasks[0]?.id
        })
      }
    });

    // 如果是自动模式，立即执行任务
    if (session.mode === AgentMode.AUTO && tasks.length > 0) {
      // 异步执行任务，不等待完成
      this.executeTasksAsync(sessionId, userId).catch(err => {
        logger.error(`[Agent] 任务执行失败: ${err.message}`);
      });
    }

    // 更新会话统计
    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { totalTasks: { increment: tasks.length } }
    });

    return {
      userMessage,  // 返回用户消息
      message: assistantMessage,
      tasks: tasks as any[],
      progress: await this.getProgress(sessionId)
    };
  }

  /**
   * 解析用户意图 - 使用 AI 智能理解
   */
  private async parseIntent(content: string, session: any) {
    // 获取会话上下文
    let context: {
      topic?: string;
      pageCount?: number;
      style?: string;
      currentStep?: string;
      confirmedOutline?: boolean;
      confirmedContent?: boolean;
    } = {};

    try {
      if (session.context) {
        context = typeof session.context === 'string'
          ? JSON.parse(session.context)
          : session.context;
      }
    } catch (e) {
      // 忽略解析错误
    }

    // 构建 AI 意图识别 Prompt
    const prompt = this.buildIntentPrompt(content, context);

    // 调用 AI 进行意图识别
    try {
      const defaultSettings = {
        ai: {
          provider: 'Gemini' as const,
          baseUrl: '',
          apiKey: '',
          models: { text: '', image: '', vision: '' }
        },
        docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
        imageGeneration: { resolution: '1920x1080' as const },
        language: 'zh' as const
      };

      const aiResponse = await AIService.smartRefine(
        prompt,
        'content',
        defaultSettings
      );

      // 解析 AI 返回的 JSON
      const intent = this.parseIntentResponse(aiResponse, content, context);

      // 更新会话上下文
      await this.updateSessionContext(session.id, intent, context);

      return intent;

    } catch (error) {
      logger.error(`[Agent] AI 意图识别失败，使用关键词回退: ${error}`);
      // 回退到关键词匹配
      return this.fallbackIntentDetection(content, context);
    }
  }

  /**
   * 构建意图识别 Prompt
   */
  private buildIntentPrompt(content: string, context: any): string {
    const contextInfo = Object.keys(context).length > 0
      ? `\n当前对话上下文：
- 主题: ${context.topic || '未确定'}
- 目标页数: ${context.pageCount || '未确定'}
- 风格偏好: ${context.style || '未确定'}
- 当前步骤: ${context.currentStep || '初始对话'}
- 大纲已确认: ${context.confirmedOutline ? '是' : '否'}
- 内容已确认: ${context.confirmedContent ? '是' : '否'}`
      : '\n当前对话上下文：新对话，无历史信息';

    return `
你是一个 PPT 生成助手的意图识别模块。请分析用户输入并返回结构化的意图数据。

用户输入: "${content}"
${contextInfo}

请识别用户的意图，并以 JSON 格式返回以下信息：

\`\`\`json
{
  "intent": "create | modify | query | confirm | cancel | continue",
  "tasks": ["outline" | "content" | "image" | "export" | "modify" | "style"],
  "params": {
    "topic": "PPT主题（如果用户提到了）",
    "pageCount": 数字页数（如果用户提到了）,
    "style": "风格描述（如果用户提到了）",
    "slideIndex": 要修改的幻灯片索引（如果是修改操作）,
    "field": "要修改的字段（title/content/image）",
    "value": "修改的值",
    "format": "导出格式（pptx/pdf/images）"
  },
  "needsMoreInfo": true/false,
  "missingInfo": ["topic" | "pageCount" | "style"],
  "response": "回复用户的话（引导用户提供缺失信息或确认执行）",
  "confidence": 0.0-1.0
}
\`\`\`

意图说明：
- create: 用户想创建新的 PPT 内容
- modify: 用户想修改已有的内容
- query: 用户在询问状态或进度
- confirm: 用户确认执行某个操作
- cancel: 用户取消操作
- continue: 用户想继续之前的流程

任务说明：
- outline: 生成大纲
- content: 生成正文内容
- image: 生成配图
- export: 导出文件
- modify: 修改幻灯片
- style: 更换风格

判断规则：
1. 如果用户说"做一个关于X的PPT"、"生成PPT"、"帮我写"等，intent 为 create
2. 如果用户提到主题但没有页数，needsMoreInfo 为 true，missingInfo 包含 "pageCount"
3. 如果用户确认（"好的"、"可以"、"确认"），intent 为 confirm
4. 如果用户修改（"改一下"、"换成"），intent 为 modify
5. 如果上下文中已有大纲且用户说"继续"，tasks 应该是下一步的任务
6. 如果用户没有提供足够信息，response 应该包含引导性问题

请只返回 JSON，不要包含其他文字。
`;
  }

  /**
   * 解析 AI 意图响应
   */
  private parseIntentResponse(aiResponse: string, originalContent: string, context: any): {
    tasks: AgentTaskType[];
    params: Record<string, unknown>;
    response: string;
    needsMoreInfo?: boolean;
    missingInfo?: string[];
  } {
    try {
      // 提取 JSON
      let jsonStr = aiResponse;
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // 尝试直接解析
        const startIndex = aiResponse.indexOf('{');
        const endIndex = aiResponse.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
          jsonStr = aiResponse.substring(startIndex, endIndex + 1);
        }
      }

      const parsed = JSON.parse(jsonStr);

      // 转换任务类型
      const taskMapping: Record<string, AgentTaskType> = {
        'outline': AgentTaskType.OUTLINE,
        'content': AgentTaskType.CONTENT,
        'image': AgentTaskType.IMAGE,
        'export': AgentTaskType.EXPORT,
        'modify': AgentTaskType.MODIFY,
        'style': AgentTaskType.STYLE
      };

      const tasks = (parsed.tasks || [])
        .map((t: string) => taskMapping[t])
        .filter(Boolean);

      return {
        tasks,
        params: parsed.params || {},
        response: parsed.response || '',
        needsMoreInfo: parsed.needsMoreInfo,
        missingInfo: parsed.missingInfo
      };

    } catch (error) {
      logger.error(`[Agent] 解析 AI 意图响应失败: ${error}`);
      return this.fallbackIntentDetection(originalContent, context);
    }
  }

  /**
   * 更新会话上下文
   */
  private async updateSessionContext(
    sessionId: string,
    intent: any,
    currentContext: any
  ): Promise<void> {
    const newContext = { ...currentContext };

    // 更新主题
    if (intent.params.topic) {
      newContext.topic = intent.params.topic;
    }

    // 更新页数
    if (intent.params.pageCount) {
      newContext.pageCount = intent.params.pageCount;
    }

    // 更新风格
    if (intent.params.style) {
      newContext.style = intent.params.style;
    }

    // 更新当前步骤
    if (intent.tasks && intent.tasks.length > 0) {
      const taskOrder = [
        AgentTaskType.OUTLINE,
        AgentTaskType.CONTENT,
        AgentTaskType.IMAGE,
        AgentTaskType.EXPORT
      ];
      const currentTask = intent.tasks[0];
      const stepIndex = taskOrder.indexOf(currentTask);
      if (stepIndex !== -1) {
        newContext.currentStep = ['大纲', '内容', '配图', '导出'][stepIndex];
      }
    }

    // 如果用户确认了大纲
    if (intent.tasks?.includes(AgentTaskType.CONTENT) && !currentContext.confirmedOutline) {
      newContext.confirmedOutline = true;
    }

    // 如果用户确认了内容
    if (intent.tasks?.includes(AgentTaskType.IMAGE) && !currentContext.confirmedContent) {
      newContext.confirmedContent = true;
    }

    await prisma.agentSession.update({
      where: { id: sessionId },
      data: { context: JSON.stringify(newContext) }
    });
  }

  /**
   * 关键词回退意图检测
   */
  private fallbackIntentDetection(content: string, context: any): {
    tasks: AgentTaskType[];
    params: Record<string, unknown>;
    response: string;
    needsMoreInfo?: boolean;
    missingInfo?: string[];
  } {
    const lowerContent = content.toLowerCase().trim();

    const result: {
      tasks: AgentTaskType[];
      params: Record<string, unknown>;
      response: string;
      needsMoreInfo?: boolean;
      missingInfo?: string[];
    } = {
      tasks: [],
      params: { topic: context.topic },
      response: ''
    };

    // ============================================================
    // 确认意图处理 - 关键！
    // ============================================================
    const confirmKeywords = ['开始', '确认', '好的', '可以', '没问题', '是的', '对', '继续', '执行', '生成'];
    if (confirmKeywords.some(kw => lowerContent.includes(kw))) {
      // 用户确认执行，根据当前上下文推断下一步
      if (context.confirmedContent) {
        result.tasks.push(AgentTaskType.IMAGE);
        result.response = '好的，我将为您生成配图。请稍候...';
      } else if (context.confirmedOutline) {
        result.tasks.push(AgentTaskType.CONTENT);
        result.response = '好的，我将为您生成正文内容。请稍候...';
      } else if (context.topic) {
        // 有主题但未确认大纲，生成大纲
        result.tasks.push(AgentTaskType.OUTLINE);
        result.params.topic = context.topic;
        result.params.pageCount = context.pageCount || 10;
        result.response = `好的，我将为您生成关于"${context.topic}"的 PPT 大纲（约 ${context.pageCount || 10} 页）。请稍候...`;
      } else {
        // 无主题，需要用户提供
        result.needsMoreInfo = true;
        result.missingInfo = ['topic'];
        result.response = '请告诉我您想制作的 PPT 主题是什么？';
      }
      return result;
    }

    // ============================================================
    // 取消意图处理
    // ============================================================
    const cancelKeywords = ['取消', '不要', '算了', '停止', '暂停'];
    if (cancelKeywords.some(kw => lowerContent.includes(kw))) {
      result.response = '好的，已取消操作。如果您需要其他帮助，请告诉我。';
      return result;
    }

    // ============================================================
    // 任务意图识别
    // ============================================================

    // 生成大纲
    if (lowerContent.includes('大纲') || lowerContent.includes('目录') ||
        lowerContent.includes('结构') || lowerContent.includes('生成') ||
        lowerContent.includes('做一个') || lowerContent.includes('帮我') ||
        lowerContent.includes('创建') || lowerContent.includes('制作')) {
      result.tasks.push(AgentTaskType.OUTLINE);
      result.params.topic = content;
    }

    // 生成内容
    if (lowerContent.includes('内容') || lowerContent.includes('正文') ||
        lowerContent.includes('详细')) {
      result.tasks.push(AgentTaskType.CONTENT);
    }

    // 生成配图
    if (lowerContent.includes('配图') || lowerContent.includes('图片') ||
        lowerContent.includes('插图') || lowerContent.includes('图像')) {
      result.tasks.push(AgentTaskType.IMAGE);
    }

    // 导出
    if (lowerContent.includes('导出') || lowerContent.includes('下载')) {
      result.tasks.push(AgentTaskType.EXPORT);
      result.params.format = lowerContent.includes('pdf') ? 'pdf' : 'pptx';
    }

    // 修改
    if (lowerContent.includes('修改') || lowerContent.includes('改') ||
        lowerContent.includes('调整') || lowerContent.includes('换成')) {
      result.tasks.push(AgentTaskType.MODIFY);
    }

    // ============================================================
    // 默认：根据上下文推断
    // ============================================================
    if (result.tasks.length === 0) {
      if (context.confirmedContent) {
        result.tasks.push(AgentTaskType.IMAGE);
        result.response = '好的，我将为您生成配图。';
      } else if (context.confirmedOutline) {
        result.tasks.push(AgentTaskType.CONTENT);
        result.response = '好的，我将继续生成正文内容。';
      } else if (context.topic) {
        // 有主题信息，推断用户想继续
        result.tasks.push(AgentTaskType.OUTLINE);
        result.params.topic = context.topic;
        result.params.pageCount = context.pageCount || 10;
      } else {
        // 无任何上下文，生成大纲
        result.tasks.push(AgentTaskType.OUTLINE);
        result.params.topic = content;
      }
    }

    return result;
  }

  /**
   * 生成助手响应
   */
  private async generateResponse(
    session: any,
    userMessage: any,
    intent: any
  ): Promise<string> {
    // 如果 AI 已经生成了响应，优先使用
    if (intent.response && intent.response.trim()) {
      return intent.response;
    }

    // 如果需要更多信息，生成引导性问题
    if (intent.needsMoreInfo && intent.missingInfo?.length) {
      const questions: string[] = [];

      if (intent.missingInfo.includes('topic')) {
        questions.push('请问您的 PPT 主题是什么？');
      }
      if (intent.missingInfo.includes('pageCount')) {
        questions.push('您希望大约多少页？（推荐 10-15 页）');
      }
      if (intent.missingInfo.includes('style')) {
        questions.push('您偏好什么风格？比如商务简约、科技感、创意活泼等');
      }

      return questions.join('\n');
    }

    const taskDescriptions: Record<AgentTaskType, string> = {
      [AgentTaskType.OUTLINE]: '生成大纲结构',
      [AgentTaskType.CONTENT]: '生成页面内容',
      [AgentTaskType.IMAGE]: '生成配图',
      [AgentTaskType.EXPORT]: '导出文件',
      [AgentTaskType.IMPORT]: '导入文档',
      [AgentTaskType.MODIFY]: '修改内容',
      [AgentTaskType.STYLE]: '更换风格',
      [AgentTaskType.SNAPSHOT]: '保存快照'
    };

    if (!intent.tasks || intent.tasks.length === 0) {
      return '我理解您的需求。请告诉我您想要做什么，比如"生成大纲"、"添加配图"或"导出PPT"。';
    }

    const taskList = intent.tasks
      .map((t: AgentTaskType) => taskDescriptions[t])
      .join('、');

    // 根据任务类型生成更智能的响应
    const firstTask = intent.tasks[0];

    if (firstTask === AgentTaskType.OUTLINE) {
      const topic = intent.params?.topic || '您的内容';
      const pageCount = intent.params?.pageCount || 10;
      const pointsCost = pageCount * 0.5; // 大纲生成约 0.5 积分/页

      if (session.mode === AgentMode.AUTO) {
        return `好的，我将为您生成关于"${topic}"的 PPT 大纲（约 ${pageCount} 页），预计消耗 ${pointsCost.toFixed(1)} 积分。请稍候...`;
      } else {
        return `我将为您生成关于"${topic}"的 PPT 大纲（约 ${pageCount} 页），预计消耗 ${pointsCost.toFixed(1)} 积分。\n\n请回复「确认」或「开始」来执行，或告诉我需要调整的地方。`;
      }
    }

    if (firstTask === AgentTaskType.CONTENT) {
      const slidesCount = intent.params?.slidesCount || '所有';
      if (session.mode === AgentMode.AUTO) {
        return `好的，我正在为您生成${slidesCount}页的正文内容...`;
      } else {
        return `我将为您生成${slidesCount}页的正文内容，每页约消耗 2 积分。\n\n请回复「确认」或「开始」来执行。`;
      }
    }

    if (firstTask === AgentTaskType.IMAGE) {
      const slidesCount = intent.params?.slidesCount || '所有';
      if (session.mode === AgentMode.AUTO) {
        return `好的，我正在为${slidesCount}页生成配图...`;
      } else {
        return `我将为${slidesCount}页生成配图，每页约消耗 3 积分。\n\n请回复「确认」或「开始」来执行。`;
      }
    }

    if (firstTask === AgentTaskType.EXPORT) {
      const format = intent.params?.format || 'pptx';
      const formatNames: Record<string, string> = {
        'pptx': 'PowerPoint 文件',
        'pdf': 'PDF 文档',
        'images': '图片包'
      };
      return `我将为您导出${formatNames[format] || format}格式。\n\n请回复「确认」来执行。`;
    }

    if (firstTask === AgentTaskType.MODIFY) {
      return `我将为您修改幻灯片。请告诉我具体要修改哪一页的什么内容？`;
    }

    // 默认响应
    if (session.mode === AgentMode.AUTO) {
      return `好的，我将为您执行以下任务：${taskList}。请稍候...`;
    } else {
      return `我将为您执行以下任务：${taskList}。\n\n请回复「确认」或「开始」来执行。`;
    }
  }

  // ============================================================
  // 任务管理
  // ============================================================

  /**
   * 创建任务
   */
  async createTask(
    sessionId: string,
    type: AgentTaskType,
    params?: Record<string, unknown>
  ) {
    // 计算积分消耗
    const tool = AGENT_TOOLS.find(t => t.name === type);
    const pointsCost = tool?.pointsCost || 0;

    return prisma.agentTask.create({
      data: {
        sessionId,
        type,
        params: params ? JSON.stringify(params) : null,
        priority: this.getTaskPriority(type),
        pointsCost
      }
    });
  }

  /**
   * 获取任务优先级
   */
  private getTaskPriority(type: AgentTaskType): number {
    const priorities: Record<AgentTaskType, number> = {
      [AgentTaskType.OUTLINE]: 100,
      [AgentTaskType.CONTENT]: 80,
      [AgentTaskType.IMAGE]: 60,
      [AgentTaskType.MODIFY]: 90,
      [AgentTaskType.STYLE]: 50,
      [AgentTaskType.EXPORT]: 30,
      [AgentTaskType.IMPORT]: 95,
      [AgentTaskType.SNAPSHOT]: 20
    };
    return priorities[type] || 50;
  }

  /**
   * 获取下一个待执行任务
   */
  async getNextTask(sessionId: string) {
    return prisma.agentTask.findFirst({
      where: {
        sessionId,
        status: AgentTaskStatus.PENDING
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId: string, progress: number, message?: string) {
    return prisma.agentTask.update({
      where: { id: taskId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? AgentTaskStatus.COMPLETED : AgentTaskStatus.RUNNING
      }
    });
  }

  /**
   * 异步执行任务队列
   */
  private async executeTasksAsync(sessionId: string, userId: string) {
    let task = await this.getNextTask(sessionId);

    while (task) {
      const currentTask = task;
      try {
        await this.executeTask(currentTask, userId);
        task = await this.getNextTask(sessionId);
      } catch (error) {
        logger.error(`[Agent] 任务执行失败: ${currentTask.id}`, error);
        break;
      }
    }

    // 检查是否所有任务完成
    const pendingCount = await prisma.agentTask.count({
      where: { sessionId, status: AgentTaskStatus.PENDING }
    });

    if (pendingCount === 0) {
      await prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: AgentSessionStatus.COMPLETED,
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: any, userId: string) {
    // 更新状态为运行中
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: AgentTaskStatus.RUNNING,
        startedAt: new Date()
      }
    });

    const params = task.params ? JSON.parse(task.params) : {};
    let result: any = {};

    try {
      switch (task.type) {
        case AgentTaskType.OUTLINE:
          result = await this.executeOutline(task.sessionId, params, userId);
          break;
        case AgentTaskType.CONTENT:
          result = await this.executeContent(task.sessionId, params, userId);
          break;
        case AgentTaskType.IMAGE:
          result = await this.executeImage(task.sessionId, params, userId);
          break;
        case AgentTaskType.MODIFY:
          result = await this.executeModify(task.sessionId, params);
          break;
        case AgentTaskType.EXPORT:
          result = await this.executeExport(task.sessionId, params);
          break;
        default:
          throw new Error(`未知任务类型: ${task.type}`);
      }

      // 标记完成
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: AgentTaskStatus.COMPLETED,
          progress: 100,
          result: JSON.stringify(result),
          completedAt: new Date()
        }
      });

      // 更新会话统计
      await prisma.agentSession.update({
        where: { id: task.sessionId },
        data: {
          completedTasks: { increment: 1 },
          totalPointsUsed: { increment: task.pointsCost || 0 }
        }
      });

    } catch (error: any) {
      // 标记失败
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: AgentTaskStatus.FAILED,
          error: error.message,
          completedAt: new Date()
        }
      });

      await prisma.agentSession.update({
        where: { id: task.sessionId },
        data: { failedTasks: { increment: 1 } }
      });

      throw error;
    }
  }

  // ============================================================
  // 任务执行实现
  // ============================================================

  /**
   * 获取项目的幻灯片列表（用于广播）
   */
  private async getProjectSlides(projectId: string) {
    const slides = await prisma.slide.findMany({
      where: { projectId },
      orderBy: { index: 'asc' }
    });
    return slides.map(slide => ({
      id: slide.id,
      index: slide.index,
      pageType: slide.pageType,
      contentType: slide.contentType,
      title: slide.title,
      content: slide.content,
      brief: slide.brief,
      previewUrl: slide.previewUrl
    }));
  }

  /**
   * 广播幻灯片更新
   */
  private async broadcastSlidesUpdate(projectId: string, source: 'agent' | 'workbench' = 'agent') {
    try {
      const items = await this.getProjectSlides(projectId);
      websocketService.broadcastSlidesUpdate(projectId, items, source);
      logger.info(`[Agent] 广播幻灯片更新: 项目 ${projectId}, ${items.length} 页`);
    } catch (error) {
      logger.error(`[Agent] 广播幻灯片更新失败: ${error}`);
    }
  }

  private async executeOutline(sessionId: string, params: any, userId: string) {
    // 获取会话和项目信息
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目配置
    const project = await prisma.project.findUnique({
      where: { id: session.projectId }
    });
    if (!project) throw new Error('项目不存在');

    // ============================================================
    // 积分预扣
    // ============================================================
    const pageCount = params.pageCount || 10;
    const deductResult = await pointsService.deductPoints(
      userId,
      'outline_generation',
      session.projectId,
      `Agent 大纲生成 (${pageCount}页)`,
      1,
      { module: 'Agent', category: '文本生成', subcategory: '大纲' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }

    logger.info(`[Agent] 大纲生成预扣积分: ${deductResult.deductedAmount}, 交易ID: ${deductResult.transactionId}`);

    try {
      // 解析风格配置
      let styleConfig: any = {
        styleName: 'default',
        colorPalette: '#000000,#FFFFFF',
        requirements: '',
        aspectRatio: '16:9',
        targetPageCount: pageCount,
        pageStructure: { cover: 1, directory: 1, transition: 0, content: pageCount - 3, end: 1 }
      };
      try {
        if (project.styleMap) {
          const parsed = JSON.parse(project.styleMap);
          styleConfig = { ...styleConfig, ...parsed };
        }
      } catch (e) {
        // 使用默认风格
      }

      // 构建默认设置
      const defaultSettings = {
        ai: {
          provider: 'Gemini' as const,
          baseUrl: '',
          apiKey: '',
          models: { text: '', image: '', vision: '' }
        },
        docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
        imageGeneration: { resolution: '1920x1080' as const },
        language: 'zh' as const
      };

      // 调用 AI 生成大纲
      const outline = await AIService.generateOutline(
        params.topic || '未命名主题',
        styleConfig,
        defaultSettings
      );

      // 更新进度
      await this.updateTaskProgress(sessionId + '_current', 50);

      // 创建幻灯片
      for (let i = 0; i < outline.length; i++) {
        const item = outline[i];
        await prisma.slide.create({
          data: {
            projectId: session.projectId,
            index: i,
            pageType: item.pageType || 'content',
            contentType: 'text',
            title: item.title,
            content: '',
            brief: item.brief || ''
          }
        });
      }

      // ============================================================
      // 积分确认扣费
      // ============================================================
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
        logger.info(`[Agent] 大纲生成积分确认: ${deductResult.transactionId}`);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return { outline, slideCount: outline.length, pointsUsed: deductResult.deductedAmount };

    } catch (error: any) {
      // ============================================================
      // 积分退还
      // ============================================================
      if (deductResult.deductedAmount > 0) {
        await pointsService.refundPoints(
          userId,
          deductResult.deductedAmount,
          deductResult.transactionId,
          `Agent 大纲生成失败: ${error.message}`
        );
        logger.info(`[Agent] 大纲生成积分退还: ${deductResult.deductedAmount} 给用户 ${userId}`);
      }

      throw error;
    }
  }

  private async executeContent(sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取所有幻灯片
    const slides = await prisma.slide.findMany({
      where: { projectId: session.projectId },
      orderBy: { index: 'asc' }
    });

    if (slides.length === 0) {
      throw new Error('没有幻灯片，请先生成大纲');
    }

    // ============================================================
    // 积分预扣
    // ============================================================
    const pageCount = slides.length;

    const deductResult = await pointsService.deductPoints(
      userId,
      'slide_content',
      session.projectId,
      `Agent 内容生成 (${pageCount}页)`,
      pageCount,
      { module: 'Agent', category: '文本生成', subcategory: '内容' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }

    logger.info(`[Agent] 内容生成预扣积分: ${deductResult.deductedAmount}, 交易ID: ${deductResult.transactionId}`);

    const results = [];
    let processedCount = 0;

    try {
      const defaultSettings = {
        ai: {
          provider: 'Gemini' as const,
          baseUrl: '',
          apiKey: '',
          models: { text: '', image: '', vision: '' }
        },
        docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
        imageGeneration: { resolution: '1920x1080' as const },
        language: 'zh' as const
      };

      for (const slide of slides) {
        // 更新进度
        const progress = Math.round((processedCount / slides.length) * 100);
        await this.updateTaskProgress(sessionId + '_current', progress);

        // 调用 AI 生成详细内容
        const content = await AIService.generateSlideDetail(
          slide.title,
          slide.brief || '',
          slide.title, // topicContext
          slide.index,
          slides.length,
          slide.pageType || 'content',
          defaultSettings
        );

        // 更新幻灯片
        await prisma.slide.update({
          where: { id: slide.id },
          data: { content }
        });

        results.push({ slideIndex: slide.index, generated: true });
        processedCount++;
      }

      // ============================================================
      // 积分确认扣费
      // ============================================================
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
        logger.info(`[Agent] 内容生成积分确认: ${deductResult.transactionId}`);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return { slidesProcessed: results.length, pointsUsed: deductResult.deductedAmount };

    } catch (error: any) {
      // ============================================================
      // 积分退还
      // ============================================================
      if (deductResult.deductedAmount > 0) {
        // 按比例退还未完成的页数（使用实际扣除的单价，支持 VIP 价格）
        const actualPointsPerPage = deductResult.deductedAmount / pageCount;
        const unusedPages = slides.length - processedCount;
        const refundAmount = Math.round(unusedPages * actualPointsPerPage * 100) / 100; // 保留两位小数
        if (refundAmount > 0) {
          await pointsService.refundPoints(
            userId,
            refundAmount,
            deductResult.transactionId,
            `Agent 内容生成部分失败: ${error.message}`
          );
          logger.info(`[Agent] 内容生成退还未完成积分: ${refundAmount} 给用户 ${userId}`);
        }
      }

      throw error;
    }
  }

  private async executeImage(sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目配置
    const project = await prisma.project.findUnique({
      where: { id: session.projectId }
    });
    if (!project) throw new Error('项目不存在');

    // 获取指定幻灯片或所有幻灯片
    const slides = params.slideIndex !== undefined
      ? await prisma.slide.findMany({
          where: { projectId: session.projectId, index: params.slideIndex }
        })
      : await prisma.slide.findMany({
          where: { projectId: session.projectId },
          orderBy: { index: 'asc' }
        });

    if (slides.length === 0) {
      throw new Error('没有幻灯片，请先生成大纲');
    }

    // ============================================================
    // 积分预扣
    // ============================================================
    const pageCount = slides.length;

    const deductResult = await pointsService.deductPoints(
      userId,
      'slide_image',
      session.projectId,
      `Agent 配图生成 (${pageCount}页)`,
      pageCount,
      { module: 'Agent', category: '图像生成', subcategory: '配图' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }

    logger.info(`[Agent] 配图生成预扣积分: ${deductResult.deductedAmount}, 交易ID: ${deductResult.transactionId}`);

    // 解析风格配置
    let styleConfig: any = {
      styleName: 'default',
      colorPalette: '#000000,#FFFFFF',
      requirements: '',
      aspectRatio: '16:9',
      targetPageCount: 10,
      pageStructure: { cover: 1, directory: 1, transition: 0, content: 7, end: 1 }
    };
    try {
      if (project.styleMap) {
        const parsed = JSON.parse(project.styleMap);
        styleConfig = { ...styleConfig, ...parsed };
      }
    } catch (e) {
      // 使用默认风格
    }

    const defaultSettings = {
      ai: {
        provider: 'Gemini' as const,
        baseUrl: '',
        apiKey: '',
        models: { text: '', image: '', vision: '' }
      },
      docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
      imageGeneration: { resolution: '1920x1080' as const },
      language: 'zh' as const
    };

    const results = [];
    const allSlideTitles = slides.map(s => s.title);
    let processedCount = 0;

    try {
      for (const slide of slides) {
        // 更新进度
        const progress = Math.round((processedCount / slides.length) * 100);
        await this.updateTaskProgress(sessionId + '_current', progress);

        // 调用 AI 生成配图
        const imageUrl = await AIService.generateSlideVariant(
          slide.content || '', // contentSource
          null, // styleFile
          styleConfig,
          'variant-1', // variantLabel
          slide.title,
          defaultSettings,
          'text', // contentType
          undefined, // contentMimeType
          slide.pageType || 'content', // pageType
          slide.content || '', // fullContent
          undefined, // globalStyleMap
          allSlideTitles
        );

        // 注册资源到 AssetRegistry
        try {
          await resourceService.registerImage({
            url: imageUrl,
            projectId: session.projectId,
            sessionId: session.id,
            slideIndex: slide.index,
            slideTitle: slide.title,
            pointsCost: deductResult.deductedAmount / pageCount
          });
        } catch (registerError) {
          logger.warn(`[Agent] 资源注册失败，但不影响生成: ${registerError}`);
        }

        results.push({ slideIndex: slide.index, imageUrl });
        processedCount++;
      }

      // ============================================================
      // 积分确认扣费
      // ============================================================
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
        logger.info(`[Agent] 配图生成积分确认: ${deductResult.transactionId}`);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return { imagesGenerated: results.length, images: results, pointsUsed: deductResult.deductedAmount };

    } catch (error: any) {
      // ============================================================
      // 积分退还
      // ============================================================
      if (deductResult.deductedAmount > 0) {
        // 按比例退还未完成的页数（使用实际扣除的单价，支持 VIP 价格）
        const actualPointsPerPage = deductResult.deductedAmount / pageCount;
        const unusedPages = slides.length - processedCount;
        const refundAmount = Math.round(unusedPages * actualPointsPerPage * 100) / 100; // 保留两位小数
        if (refundAmount > 0) {
          await pointsService.refundPoints(
            userId,
            refundAmount,
            deductResult.transactionId,
            `Agent 配图生成部分失败: ${error.message}`
          );
          logger.info(`[Agent] 配图生成退还未完成积分: ${refundAmount} 给用户 ${userId}`);
        }
      }

      throw error;
    }
  }

  private async executeModify(sessionId: string, params: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    if (params.slideIndex === undefined || !params.field || !params.value) {
      throw new Error('缺少修改参数');
    }

    const slide = await prisma.slide.findFirst({
      where: { projectId: session.projectId, index: params.slideIndex }
    });

    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`);
    }

    await prisma.slide.update({
      where: { id: slide.id },
      data: { [params.field]: params.value }
    });

    // 广播幻灯片更新
    await this.broadcastSlidesUpdate(session.projectId, 'agent');

    return { modified: true, field: params.field };
  }

  private async executeExport(sessionId: string, params: any) {
    // 导出功能需要调用现有的导出服务
    // 这里返回导出信息，实际导出由前端或专门的导出服务处理
    return {
      exportReady: true,
      format: params.format || 'pptx',
      downloadUrl: `/api/projects/export?format=${params.format || 'pptx'}`
    };
  }

  // ============================================================
  // 进度和状态
  // ============================================================

  /**
   * 获取会话进度
   */
  async getProgress(sessionId: string): Promise<AgentProgressResponse> {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        tasks: {
          where: { status: AgentTaskStatus.RUNNING },
          take: 1
        }
      }
    });

    if (!session) {
      throw new Error('会话不存在');
    }

    return {
      sessionId: session.id,
      status: session.status,
      totalTasks: session.totalTasks,
      completedTasks: session.completedTasks,
      failedTasks: session.failedTasks,
      currentTask: session.tasks[0] ? {
        id: session.tasks[0].id,
        type: session.tasks[0].type,
        progress: session.tasks[0].progress
      } : undefined,
      totalPointsUsed: session.totalPointsUsed
    };
  }

  /**
   * 暂停会话
   */
  async pauseSession(sessionId: string) {
    return prisma.agentSession.update({
      where: { id: sessionId },
      data: { status: AgentSessionStatus.PAUSED }
    });
  }

  /**
   * 恢复会话
   */
  async resumeSession(sessionId: string, userId: string) {
    const session = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { status: AgentSessionStatus.ACTIVE }
    });

    // 继续执行待处理的任务
    if (session.mode === AgentMode.AUTO) {
      this.executeTasksAsync(sessionId, userId).catch(err => {
        logger.error(`[Agent] 任务恢复执行失败: ${err.message}`);
      });
    }

    return session;
  }

  /**
   * 取消会话
   */
  async cancelSession(sessionId: string) {
    await prisma.$transaction([
      // 取消所有待处理任务
      prisma.agentTask.updateMany({
        where: { sessionId, status: AgentTaskStatus.PENDING },
        data: { status: AgentTaskStatus.CANCELLED }
      }),
      // 更新会话状态
      prisma.agentSession.update({
        where: { id: sessionId },
        data: { status: AgentSessionStatus.CANCELLED }
      })
    ]);

    return this.getSession(sessionId);
  }
}

// 导出单例
export const agentService = new AgentService();