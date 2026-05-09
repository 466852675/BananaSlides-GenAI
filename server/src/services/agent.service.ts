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

import { prisma } from '../db';
import {
  AgentSessionStatus,
  AgentTaskStatus,
  AgentTaskType,
  AgentMode,
  AgentSessionStatusType,
  AgentTaskTypeType,
  AgentModeType
} from '../types/user.types';
import { AIService } from './ai.service';
import * as pointsService from './points.service';
import { snapshotService } from './snapshot.service';
import { websocketService } from './websocket.service';
import { resourceService } from './resource.service';
import { SvgStorageService } from './svg-storage.service';
import {
  AgentToolCall,
  AgentMessageCreateInput,
  AgentTaskCreateInput,
  AgentSessionCreateInput,
  AgentProgressResponse,
  AgentChatResponse,
  TASK_TYPE_TOOL_MAP
} from '../types/agent.types';
import { logger } from '../utils/logger';

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

    // 创建新会话 - 捕获竞态条件导致的唯一约束冲突
    try {
      const session = await prisma.agentSession.create({
        data: {
          projectId: input.projectId,
          mode: input.mode || AgentMode.GUIDED,
          status: AgentSessionStatus.ACTIVE
        },
        include: {
          Project: {
            select: { id: true, title: true, thumbnailUrl: true }
          }
        }
      });

      logger.info(`[Agent] 创建会话: ${session.id}, 项目: ${input.projectId}`);
      return session;
    } catch (error: any) {
      // P2002 = Prisma Unique constraint failed
      if (error.code === 'P2002' && error.meta?.target?.includes('projectId')) {
        logger.warn(`[Agent] 会话已存在（竞态条件），返回现有会话: ${input.projectId}`);
        // 返回已存在的会话
        return prisma.agentSession.findUnique({
          where: { projectId: input.projectId },
          include: {
            Project: { select: { id: true, title: true, thumbnailUrl: true } }
          }
        });
      }
      throw error;
    }
  }

  /**
   * 获取会话详情
   */
  async getSession(sessionId: string) {
    return prisma.agentSession.findUnique({
      where: { id: sessionId },
      include: {
        Project: { select: { id: true, title: true, thumbnailUrl: true } },
        AgentMessage: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' }
        },
        AgentTask: {
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
        Project: { select: { id: true, title: true, thumbnailUrl: true } },
        AgentMessage: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'asc' },
          take: 50
        },
        AgentTask: {
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
        source: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        styleMap: true, // 用于缩略图回退
        Slide: {
          select: {
            id: true,
            status: true,
            pageType: true,
            variants: true,
            previewUrl: true
          },
          orderBy: { index: 'asc' }
        },
        AgentSession: {
          select: {
            id: true,
            status: true,
            mode: true,
            totalTasks: true,
            completedTasks: true,
            failedTasks: true,
            totalPointsUsed: true,
            createdAt: true,
            updatedAt: true,
            completedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 批量查询所有项目的积分消耗总和
    const projectIds = projects.map(p => p.id);
    const transactions = await prisma.transaction.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        type: 'consume'
      },
      _sum: {
        amount: true
      }
    });

    // 转换为 Map 方便查询
    const pointsMap = new Map<string, number>();
    transactions.forEach(t => {
      if (t.projectId) {
        // amount 是负数，取绝对值
        pointsMap.set(t.projectId, Math.abs(t._sum.amount || 0));
      }
    });

    return projects.map(p => {
      // 动态计算项目状态（与 IDE 模式 transformProject 保持一致）
      const itemStatuses = p.Slide.map(i => i.status);
      let effectiveStatus = p.status;

      // 1. 如果没有 items，状态为 'idle'
      if (itemStatuses.length === 0) {
        effectiveStatus = 'idle';
      }
      // 2. 如果任何 item 有错误，状态为 'error'
      else if (itemStatuses.some(s => s === 'error')) {
        effectiveStatus = 'error';
      }
      // 3. 如果任何 item 正在生成，状态为 'generating'
      else if (itemStatuses.some(s => s === 'generating')) {
        effectiveStatus = 'generating';
      }
      // 4. 如果所有 items 都是 'success'，状态为 'completed'
      else if (itemStatuses.length > 0 && itemStatuses.every(s => s === 'success')) {
        effectiveStatus = 'completed';
      }
      // 5. 有 items 但不是全部完成，状态为 'in-progress'
      else if (itemStatuses.length > 0) {
        effectiveStatus = 'in-progress';
      }

      // 动态计算缩略图（与 IDE 模式 calculateThumbnail 保持一致）
      const thumbnailUrl = this.calculateThumbnail(p.Slide, p.styleMap);

      // 动态计算统计数据（如果 session 数据为 0 或不存在）
      const session = p.AgentSession;
      const totalItems = p.Slide.length;
      const completedItems = p.Slide.filter(i => i.status === 'success').length;
      const totalPointsUsed = pointsMap.get(p.id) || 0;

      // 如果 session 存在但统计数据为 0，使用动态计算的值
      const enrichedSession = session ? {
        ...session,
        totalTasks: session.totalTasks > 0 ? session.totalTasks : totalItems,
        completedTasks: session.completedTasks > 0 ? session.completedTasks : completedItems,
        totalPointsUsed: session.totalPointsUsed > 0 ? session.totalPointsUsed : totalPointsUsed
      } : (totalItems > 0 || totalPointsUsed > 0 ? {
        // 如果没有 session 但有数据，创建一个虚拟 session
        id: `virtual-${p.id}`,
        projectId: p.id,
        status: effectiveStatus === 'completed' ? 'COMPLETED' :
                effectiveStatus === 'generating' ? 'ACTIVE' :
                effectiveStatus === 'in-progress' ? 'ACTIVE' : 'ACTIVE',
        mode: 'GUIDED',
        totalTasks: totalItems,
        completedTasks: completedItems,
        failedTasks: 0,
        totalPointsUsed: totalPointsUsed,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        completedAt: p.completedAt
      } : null);

      return {
        id: p.id,
        displayId: p.displayId,
        title: p.title,
        thumbnailUrl: thumbnailUrl || p.thumbnailUrl, // 优先使用动态计算的
        status: effectiveStatus,
        scenarioType: p.scenarioType,
        isPinned: p.isPinned,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        completedAt: p.completedAt,
        agentSession: enrichedSession
      };
    });
  }

  /**
   * 计算项目缩略图（与前端 projects.ts calculateThumbnail 保持一致）
   * 优先级：cover > directory > transition > content > end
   */
  private calculateThumbnail(items: any[], styleMap: any): string | null {
    const pageTypePriority = ['cover', 'directory', 'transition', 'content', 'end'];

    // 解析 styleMap
    let parsedStyleMap: any = null;
    if (styleMap) {
      try {
        parsedStyleMap = typeof styleMap === 'string' ? JSON.parse(styleMap) : styleMap;
      } catch {
        parsedStyleMap = null;
      }
    }

    // 按页面类型优先级查找
    for (const pageType of pageTypePriority) {
      const slide = items.find(item => item.pageType === pageType);
      if (slide) {
        // 优先使用生成的 variant
        if (slide.variants) {
          try {
            const variants = typeof slide.variants === 'string' ? JSON.parse(slide.variants) : slide.variants;
            if (Array.isArray(variants) && variants.length > 0) {
              const url = typeof variants[0] === 'string' ? variants[0] : variants[0]?.url;
              if (url) return url;
            }
          } catch {
            // 忽略解析错误
          }
        }
        // 其次使用 previewUrl
        if (slide.previewUrl) {
          return slide.previewUrl;
        }
      }
    }

    // 回退到任意有图片的幻灯片
    for (const item of items) {
      if (item.variants) {
        try {
          const variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
          if (Array.isArray(variants) && variants.length > 0) {
            const url = typeof variants[0] === 'string' ? variants[0] : variants[0]?.url;
            if (url) return url;
          }
        } catch {
          // 忽略解析错误
        }
      }
      if (item.previewUrl) {
        return item.previewUrl;
      }
    }

    // 最后回退到 styleMap
    if (parsedStyleMap) {
      for (const pageType of pageTypePriority) {
        if (parsedStyleMap[pageType]) {
          return parsedStyleMap[pageType];
        }
      }
    }

    return null;
  }

  /**
   * 获取用户最近完成的会话（用于一键复用配置）
   */
  async getRecentSessions(userId: string, limit: number = 5, status: string = 'COMPLETED') {
    const sessions = await prisma.agentSession.findMany({
      where: {
        status,
        Project: { userId, isDeleted: false, source: 'AGENT' },
      },
      select: {
        id: true,
        projectId: true,
        context: true,
        totalPointsUsed: true,
        createdAt: true,
        completedAt: true,
        Project: {
          select: { id: true, title: true, thumbnailUrl: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
    return sessions.map(s => ({
      ...s,
      context: typeof s.context === 'string' ? JSON.parse(s.context || '{}') : s.context,
    }));
  }

  /**
   * 重置会话
   */
  private async resetSession(sessionId: string, mode?: AgentModeType) {
    // 获取退还积分所需信息
    const sessionForRefund = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { totalPointsUsed: true, projectId: true }
    });
    const project = sessionForRefund ? await prisma.project.findUnique({
      where: { id: sessionForRefund.projectId },
      select: { userId: true }
    }) : null;

    await prisma.$transaction(async (tx) => {
      // 退还积分（在同一事务内，避免竞态）
      if (sessionForRefund && sessionForRefund.totalPointsUsed > 0 && project) {
        const userId = project.userId!;
        const projectId = sessionForRefund.projectId;
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { points: { increment: sessionForRefund.totalPointsUsed } }
        });
        await tx.transaction.create({
          data: {
            userId,
            projectId,
            type: 'adjust',
            amount: sessionForRefund.totalPointsUsed,
            balance: updatedUser.points,
            description: '重置会话退还积分',
            module: 'Agent',
            category: '退还'
          }
        });
        logger.info(`[Agent] 重置会话退还积分: ${sessionForRefund.totalPointsUsed}, 用户: ${userId}`);
      }

      // 清除旧消息
      await tx.agentMessage.deleteMany({ where: { sessionId } });
      // 清除旧任务
      await tx.agentTask.deleteMany({ where: { sessionId } });
      // 重置会话状态
      await tx.agentSession.update({
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
      });
    });

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
    userId: string,
    autoExecute?: boolean
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

      // 引导模式下预生成大纲和内容预览
      if (session.mode === AgentMode.GUIDED) {
        logger.info(`[Agent] 引导模式，开始预生成任务预览，任务数: ${tasks.length}`);
        for (const task of tasks) {
          if (task.type === AgentTaskType.OUTLINE || task.type === AgentTaskType.CONTENT) {
            // 异步预生成结果，不阻塞响应
            logger.info(`[Agent] 开始预生成任务预览: ${task.id}, 类型: ${task.type}`);
            this.pregenerateTaskPreview(task.id, userId).catch(err => {
              logger.error(`[Agent] 预生成任务预览失败: ${task.id}`, err);
            });
          } else if (task.type === AgentTaskType.CONFIG_CONFIRM) {
            // CONFIG_CONFIRM 任务立即执行并保存结果（但保持 PENDING 状态）
            logger.info(`[Agent] 开始执行配置确认任务: ${task.id}`);
            this.executeConfigConfirmForPreview(task.id, task.sessionId, task.params ? JSON.parse(task.params) : {}, userId).catch(err => {
              logger.error(`[Agent] 配置确认任务执行失败: ${task.id}`, err);
            });
          }
        }
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

    // 如果是自动模式或单条消息指定autoExecute，立即执行任务
    const shouldAutoExecute = autoExecute || session.mode === AgentMode.AUTO;
    if (shouldAutoExecute && tasks.length > 0) {
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
      styleName?: string;
      aspectRatio?: string;
      colorPalette?: string[];
      requirements?: string;
      currentStep?: string;
      confirmedOutline?: boolean;
      confirmedContent?: boolean;
      confirmedConfig?: boolean;
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

    // 从用户消息中提取配置信息
    const extractedConfig = this.extractConfigFromMessage(content);
    if (extractedConfig) {
      context = { ...context, ...extractedConfig };
    }

    // 检查是否需要配置确认
    // 如果有主题，且配置未确认，则显示配置确认卡片
    if (context.topic && !context.confirmedConfig) {
      // 检查是否有足够配置信息
      if (this.hasEnoughConfig(context)) {
        // 创建配置确认任务，让用户确认配置
        return {
          tasks: ['CONFIG_CONFIRM' as AgentTaskTypeType],
          params: {
            topic: context.topic,
            pageCount: context.pageCount,
            styleName: context.styleName,
            aspectRatio: context.aspectRatio || '16:9',
            requirements: context.requirements || ''
          },
          response: `我已了解您的需求。请确认以下配置信息：\n\n**主题**：${context.topic}\n**页数**：${context.pageCount}页\n**风格**：${context.styleName}\n\n如需修改，请在下方配置卡片中点击"修改"按钮。确认无误后点击"确认配置"开始生成。`,
          needsMoreInfo: false
        };
      } else {
        // 需要用户提供更多配置信息
        const missingItems = [];
        if (!context.pageCount) missingItems.push('页数');
        if (!context.styleName) missingItems.push('风格');

        return {
          tasks: [],
          params: { topic: context.topic },
          response: `我已了解您的需求："${context.topic}"。为了生成更合适的演示文稿，请提供以下信息：${missingItems.join('、')}。\n\n例如："生成10页，科技风格"`,
          needsMoreInfo: true,
          missingInfo: missingItems
        };
      }
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

      // 【强制修复】如果配置未确认且是创建意图，必须确保第一个任务是 CONFIG_CONFIRM
      if (!context.confirmedConfig &&
          (intent.tasks.includes(AgentTaskType.OUTLINE) ||
           intent.tasks.includes(AgentTaskType.CONTENT) ||
           intent.tasks.includes(AgentTaskType.IMAGE))) {
        // 检查是否已有 CONFIG_CONFIRM
        if (!intent.tasks.includes(AgentTaskType.CONFIG_CONFIRM)) {
          // 强制插入 CONFIG_CONFIRM 作为第一个任务
          intent.tasks.unshift(AgentTaskType.CONFIG_CONFIRM);
          // 同时更新 plannedTasks（如果存在）
          if (intent.plannedTasks && !intent.plannedTasks.includes(AgentTaskType.CONFIG_CONFIRM)) {
            intent.plannedTasks.unshift(AgentTaskType.CONFIG_CONFIRM);
          }
          logger.info(`[Agent] 强制插入 CONFIG_CONFIRM 任务，原任务: ${intent.tasks.slice(1).join(',')}`);
        }
      }

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
- 内容已确认: ${context.confirmedContent ? '是' : '否'}
- 配置已确认: ${context.confirmedConfig ? '是' : '否'}`
      : '\n当前对话上下文：新对话，无历史信息';

    return `
你是一个 PPT 生成助手的意图识别模块。请分析用户输入并返回结构化的意图数据。

用户输入: "${content}"
${contextInfo}

请识别用户的意图，并以 JSON 格式返回以下信息：

\`\`\`json
{
  "intent": "create | modify | query | confirm | cancel | continue",
  "tasks": ["config_confirm" | "outline" | "content" | "image" | "export" | "modify" | "style"],
  "params": {
    "topic": "PPT主题（从用户输入中提取，如'智能手表新品演示文稿'）",
    "pageCount": 数字页数（如果用户提到了，否则默认10）,
    "style": "风格描述（如果用户提到了，否则默认'商务'）",
    "styleName": "风格名称（商务/科技/简约/活泼/创意/学术等）",
    "aspectRatio": "比例（默认16:9）",
    "requirements": "其他设计要求",
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
- config_confirm: 【必须第一个】配置确认，展示风格、页数、比例等配置供用户确认
- outline: 生成大纲
- content: 生成正文内容
- image: 生成配图
- export: 导出文件
- modify: 修改幻灯片
- style: 更换风格

【关键判断规则】：
1. 如果用户说"做一个关于X的PPT"、"生成PPT"、"帮我写"等创建意图：
   - intent 为 create
   - tasks **必须**以 "config_confirm" 开头，然后是 ["outline", "content", "image", "export"]
   - params.topic 必须从用户输入中提取主题内容
   - params.pageCount 如果用户没提到，默认设为 10
   - params.styleName 如果用户没提到，默认设为 "商务"
   - needsMoreInfo 为 false（因为我们已经有默认值）

2. 如果配置已确认（confirmedConfig 为 true），tasks 从 "outline" 开始

3. 如果用户确认配置（"好的"、"可以"、"确认配置"），intent 为 confirm

4. 如果用户修改（"改一下"、"换成"），intent 为 modify

5. 如果上下文中已有大纲且用户说"继续"，tasks 应该是下一步的任务

请只返回 JSON，不要包含其他文字。
`;
  }

  /**
   * 解析 AI 意图响应
   */
  private parseIntentResponse(aiResponse: string, originalContent: string, context: any): {
    tasks: AgentTaskTypeType[];
    params: Record<string, unknown>;
    response: string;
    needsMoreInfo?: boolean;
    missingInfo?: string[];
    plannedTasks?: AgentTaskTypeType[]; // 新增：存储完整的任务链计划
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
      const taskMapping: Record<string, AgentTaskTypeType> = {
        'config_confirm': AgentTaskType.CONFIG_CONFIRM,
        'outline': AgentTaskType.OUTLINE,
        'content': AgentTaskType.CONTENT,
        'image': AgentTaskType.IMAGE,
        'export': AgentTaskType.EXPORT,
        'modify': AgentTaskType.MODIFY,
        'style': AgentTaskType.STYLE
      };

      const allTasks = (parsed.tasks || [])
        .map((t: string) => taskMapping[t])
        .filter(Boolean);

      // 【关键修复】线性流程：只返回第一个任务，其他任务存入 plannedTasks
      // 任务链由 createNextTask 方法根据 plannedTasks 逐步创建
      const firstTask = allTasks.length > 0 ? [allTasks[0]] : [];
      const remainingTasks = allTasks.length > 1 ? allTasks.slice(1) : [];

      logger.info(`[Agent] 意图解析完成，首个任务: ${firstTask[0] || '无'}, 计划任务链: ${allTasks.join(' -> ')}`);

      return {
        tasks: firstTask, // 只返回第一个任务
        plannedTasks: allTasks, // 存储完整任务链供后续使用
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

    // 如果用户确认了配置（有主题且需要生成大纲，说明配置已确认）
    if (intent.tasks?.includes(AgentTaskType.OUTLINE) && currentContext.topic && !currentContext.confirmedConfig) {
      newContext.confirmedConfig = true;
    }

    // 【关键】存储任务链计划，供 createNextTask 使用
    if (intent.plannedTasks && intent.plannedTasks.length > 0) {
      newContext.plannedTasks = intent.plannedTasks;
      logger.info(`[Agent] 任务链计划已存储: ${intent.plannedTasks.join(' -> ')}`);
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
    tasks: AgentTaskTypeType[];
    params: Record<string, unknown>;
    response: string;
    needsMoreInfo?: boolean;
    missingInfo?: string[];
  } {
    const lowerContent = content.toLowerCase().trim();

    const result: {
      tasks: AgentTaskTypeType[];
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
    const confirmKeywords = ['开始', '确认', '好的', '可以', '没问题', '是的', '对', '继续', '执行'];
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
    // 任务意图识别（else if优先级链，从具体→宽泛，只匹配一个）
    // ============================================================

    // 修改意图（最具体，优先匹配）
    if (lowerContent.includes('修改') || lowerContent.includes('改') ||
        lowerContent.includes('调整') || lowerContent.includes('换成')) {
      result.tasks.push(AgentTaskType.MODIFY);
      if (!result.response) result.response = '好的，我将为您修改。请稍候...';
    }
    // 导出意图
    else if (lowerContent.includes('导出') || lowerContent.includes('下载')) {
      result.tasks.push(AgentTaskType.EXPORT);
      result.params.format = lowerContent.includes('pdf') ? 'pdf' : 'pptx';
      result.response = '好的，我将为您导出PPT。请稍候...';
    }
    // 配图意图
    else if (lowerContent.includes('配图') || lowerContent.includes('图片') ||
             lowerContent.includes('插图') || lowerContent.includes('图像')) {
      result.tasks.push(AgentTaskType.IMAGE);
      result.response = '好的，我将为您生成配图。请稍候...';
    }
    // 内容意图
    else if (lowerContent.includes('内容') || lowerContent.includes('正文') ||
             lowerContent.includes('详细')) {
      result.tasks.push(AgentTaskType.CONTENT);
      result.response = '好的，我将为您生成正文内容。请稍候...';
    }
    // 大纲/创建意图（最宽泛，兜底匹配）
    else if (lowerContent.includes('大纲') || lowerContent.includes('目录') ||
             lowerContent.includes('结构') || lowerContent.includes('生成') ||
             lowerContent.includes('做一个') || lowerContent.includes('帮我') ||
             lowerContent.includes('创建') || lowerContent.includes('制作')) {
      result.tasks.push(AgentTaskType.OUTLINE);
      result.params.topic = content;
      result.response = `好的，我将为您生成关于"${content}"的 PPT 大纲。请稍候...`;
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

    // 强制修复：如果配置未确认且包含创建意图，插入CONFIG_CONFIRM
    if (!context.confirmedConfig &&
        (result.tasks.includes(AgentTaskType.OUTLINE) ||
         result.tasks.includes(AgentTaskType.CONTENT) ||
         result.tasks.includes(AgentTaskType.IMAGE))) {
      if (!result.tasks.includes(AgentTaskType.CONFIG_CONFIRM)) {
        result.tasks.unshift(AgentTaskType.CONFIG_CONFIRM);
        if ((result as any).plannedTasks && !(result as any).plannedTasks.includes(AgentTaskType.CONFIG_CONFIRM)) {
          (result as any).plannedTasks.unshift(AgentTaskType.CONFIG_CONFIRM);
        }
        logger.info(`[Agent] fallback强制插入CONFIG_CONFIRM任务`);
      }
    }

    return result;
  }

  /**
   * 从用户消息中提取配置信息
   */
  private extractConfigFromMessage(content: string): any {
    const config: any = {};

    // 提取页数（支持 "10页"、"十页"、"大概15页左右" 等格式）
    const pageMatch = content.match(/(\d+)\s*[页张]/);
    if (pageMatch) {
      config.pageCount = parseInt(pageMatch[1]);
    }

    // 提取比例
    if (content.includes('16:9') || content.includes('16比9') || content.includes('宽屏')) {
      config.aspectRatio = '16:9';
    } else if (content.includes('4:3') || content.includes('4比3') || content.includes('标准')) {
      config.aspectRatio = '4:3';
    }

    // 提取风格
    const styleKeywords: Record<string, string> = {
      '商务': '商务',
      '科技': '科技',
      '简约': '简约',
      '极简': '简约',
      '活泼': '活泼',
      '创意': '创意',
      '学术': '学术',
      '教育': '教育',
      '专业': '专业',
      '现代': '现代',
      '传统': '传统',
      '艺术': '艺术'
    };

    for (const [keyword, style] of Object.entries(styleKeywords)) {
      if (content.includes(keyword)) {
        config.styleName = style;
        break;
      }
    }

    // 提取设计要求（引号内的内容或特定关键词后的内容）
    const requirementsMatch = content.match(/要求[:：]\s*([^。，]+)/);
    if (requirementsMatch) {
      config.requirements = requirementsMatch[1].trim();
    }

    return Object.keys(config).length > 0 ? config : null;
  }

  /**
   * 检查是否有足够配置信息
   */
  private hasEnoughConfig(context: any): boolean {
    // 必须包含主题、页数、风格
    return !!(
      context.topic &&
      context.pageCount &&
      context.pageCount > 0 &&
      context.styleName
    );
  }

  /**
   * 标记配置已确认
   */
  private async markConfigConfirmed(sessionId: string) {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { context: true }
    });
    if (session?.context) {
      try {
        const context = typeof session.context === 'string'
          ? JSON.parse(session.context)
          : session.context;
        context.confirmedConfig = true;
        await prisma.agentSession.update({
          where: { id: sessionId },
          data: { context: JSON.stringify(context) }
        });
        logger.info(`[Agent] 配置已确认，sessionId: ${sessionId}`);
      } catch (e) {
        logger.error(`[Agent] 标记配置确认失败: ${e}`);
      }
    }
  }

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

    const taskDescriptions: Partial<Record<AgentTaskTypeType, string>> = {
      [AgentTaskType.CONFIG_CONFIRM]: '确认配置',
      [AgentTaskType.OUTLINE]: '生成大纲结构',
      [AgentTaskType.CONTENT]: '生成页面内容',
      [AgentTaskType.IMAGE]: '生成配图',
      [AgentTaskType.IMAGE_BY_PAGE]: '逐页生成配图',
      [AgentTaskType.FINAL_OVERVIEW]: '总览确认',
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
      .map((t: AgentTaskTypeType) => taskDescriptions[t])
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
    type: AgentTaskTypeType,
    params?: Record<string, unknown>
  ) {
    // 计算积分消耗 - 使用映射表获取正确的工具定义
    const tool = TASK_TYPE_TOOL_MAP[type];
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
   * 创建下一个任务（任务链）
   * 在当前任务完成后自动创建下一个任务
   */
  private async createNextTask(sessionId: string, completedTaskType: AgentTaskTypeType, userId: string) {
    // 获取会话模式与上下文（含 plannedTasks）
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { mode: true, projectId: true, context: true }
    });

    if (!session) return;

    // 确定下一个任务类型
    let nextTaskType: AgentTaskTypeType | null = null;
    let nextTaskParams: Record<string, unknown> = {};

    // 尝试从 plannedTasks 取下一个任务类型
    let parsedContext: any = null;
    try {
      parsedContext = session.context ? JSON.parse(session.context) : null;
    } catch {
      parsedContext = null;
    }
    const plannedTasks: string[] | undefined = parsedContext?.plannedTasks;
    if (plannedTasks && plannedTasks.length > 0) {
      const currentIndex = plannedTasks.indexOf(completedTaskType);
      if (currentIndex >= 0 && currentIndex < plannedTasks.length - 1) {
        nextTaskType = plannedTasks[currentIndex + 1] as AgentTaskTypeType;
        logger.info(`[Agent] 任务链: 从 plannedTasks 取下一个任务 ${completedTaskType} -> ${nextTaskType}`);
      }
    }

    // plannedTasks 未命中时，回退到硬编码 switch（向后兼容）
    if (!nextTaskType) {
      switch (completedTaskType) {
        case 'CONFIG_CONFIRM' as AgentTaskTypeType:
          // 配置确认完成后，标记配置已确认并创建大纲任务
          await this.markConfigConfirmed(sessionId);
          nextTaskType = AgentTaskType.OUTLINE;
          break;

        case AgentTaskType.OUTLINE:
          // 大纲完成后创建内容任务
          nextTaskType = AgentTaskType.CONTENT;
          // 获取幻灯片数量
          const slides = await prisma.slide.findMany({
            where: { projectId: session.projectId },
            select: { id: true }
          });
          nextTaskParams = { slideCount: slides.length };
          break;

        case AgentTaskType.CONTENT:
          // 内容完成后创建配图任务
          nextTaskType = AgentTaskType.IMAGE;
          const contentSlides = await prisma.slide.findMany({
            where: { projectId: session.projectId },
            select: { id: true }
          });
          nextTaskParams = { slideCount: contentSlides.length };
          break;

        case AgentTaskType.IMAGE:
          // 配图完成后，任务链结束
          break;

        default:
          // 其他任务类型不创建后续任务
          break;
      }
    }

    if (nextTaskType) {
      // 创建下一个任务
      const nextTask = await this.createTask(sessionId, nextTaskType, nextTaskParams);
      logger.info(`[Agent] 任务链: 创建下一个任务 ${nextTaskType} -> ${nextTask.id}`);

      // 更新会话统计
      await prisma.agentSession.update({
        where: { id: sessionId },
        data: { totalTasks: { increment: 1 } }
      });

      // 广播新任务创建事件给前端
      const sessionWithProject = await prisma.agentSession.findUnique({
        where: { id: sessionId },
        select: { projectId: true }
      });
      if (sessionWithProject?.projectId) {
        websocketService.broadcastToProject(sessionWithProject.projectId, {
          type: 'agent_task_created',
          payload: {
            sessionId,
            task: nextTask
          },
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * 获取任务优先级
   */
  private getTaskPriority(type: AgentTaskTypeType): number {
    const priorities: Partial<Record<AgentTaskTypeType, number>> = {
      [AgentTaskType.CONFIG_CONFIRM]: 110,
      [AgentTaskType.OUTLINE]: 100,
      [AgentTaskType.CONTENT]: 80,
      [AgentTaskType.IMAGE]: 60,
      [AgentTaskType.IMAGE_BY_PAGE]: 55,
      [AgentTaskType.FINAL_OVERVIEW]: 25,
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

  private async checkSessionCompletion(sessionId: string) {
    const pendingCount = await prisma.agentTask.count({
      where: { sessionId, status: AgentTaskStatus.PENDING }
    });
    const runningCount = await prisma.agentTask.count({
      where: { sessionId, status: AgentTaskStatus.RUNNING }
    });

    if (pendingCount === 0 && runningCount === 0) {
      const failedCount = await prisma.agentTask.count({
        where: { sessionId, status: AgentTaskStatus.FAILED }
      });

      await prisma.agentSession.update({
        where: { id: sessionId },
        data: {
          status: failedCount > 0 ? AgentSessionStatus.FAILED : AgentSessionStatus.COMPLETED,
          completedAt: new Date()
        }
      });
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId: string, progress: number, message?: string) {
    const task = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        status: progress >= 100 ? AgentTaskStatus.COMPLETED : AgentTaskStatus.RUNNING
      },
      include: {
        AgentSession: {
          select: { projectId: true }
        }
      }
    });

    // 广播进度更新
    if (task.AgentSession?.projectId) {
      websocketService.broadcastAgentProgress(task.sessionId, task.AgentSession.projectId, {
        taskId: task.id,
        type: task.type,
        progress: task.progress,
        status: task.status,
        message
      });
    }

    return task;
  }

  /**
   * 根据 ID 执行单个任务（用于引导模式确认后执行）
   * 公开方法，供路由层调用
   */
  async executeTaskById(taskId: string, userId: string) {
    // 获取任务详情
    const task = await prisma.agentTask.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('任务不存在');
    }

    if (task.status !== 'RUNNING') {
      throw new Error(`任务状态不正确: ${task.status}`);
    }

    // 执行任务
    await this.executeTask(task, userId);

    await this.checkSessionCompletion(task.sessionId);
  }

  /**
   * 异步执行任务队列
   */
  private async executeTasksAsync(sessionId: string, userId: string) {
    let task = await this.getNextTask(sessionId);

    while (task) {
      try {
        await this.executeTask(task, userId);
      } catch (error) {
        logger.error(`[Agent] 任务执行失败: ${task.id}`, error);
        // 继续执行下一个任务而非中断整个链
      }
      task = await this.getNextTask(sessionId);
    }

    await this.checkSessionCompletion(sessionId);
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

    // 获取 session 和 projectId（用于 WebSocket 广播）
    const session = await prisma.agentSession.findUnique({
      where: { id: task.sessionId },
      select: { projectId: true }
    });
    const projectId = session?.projectId;

    try {
      // 检查是否有预生成的预览结果
      let existingResult: any = null;
      if (task.result) {
        try {
          const parsedResult = JSON.parse(task.result);
          // 检查是否是预览结果
          if (parsedResult && (parsedResult.slides || parsedResult.title)) {
            existingResult = parsedResult;
            logger.info(`[Agent] 任务 ${task.id} 发现预生成结果，将直接应用`);
          }
        } catch (e) {
          // result 不是 JSON 格式，忽略
        }
      }

      // 如果有预生成结果，直接应用而不重新生成
      if (existingResult && (task.type === AgentTaskType.OUTLINE || task.type === AgentTaskType.CONTENT)) {
        if (task.type === AgentTaskType.OUTLINE) {
          result = await this.applyOutlineFromPreview(task.id, task.sessionId, params, userId, existingResult);
        } else if (task.type === AgentTaskType.CONTENT) {
          result = await this.applyContentFromPreview(task.id, task.sessionId, params, userId, existingResult);
        }
      } else {
        // 没有预生成结果，正常执行任务
        switch (task.type) {
          case 'CONFIG_CONFIRM' as AgentTaskTypeType:
            result = await this.executeConfigConfirm(task.id, task.sessionId, params, userId);
            break;
          case AgentTaskType.OUTLINE:
            result = await this.executeOutline(task.id, task.sessionId, params, userId);
            break;
          case AgentTaskType.CONTENT:
            result = await this.executeContent(task.id, task.sessionId, params, userId);
            break;
          case AgentTaskType.IMAGE:
            result = await this.executeImage(task.id, task.sessionId, params, userId);
            break;
          case 'IMAGE_BY_PAGE' as any:
            result = await this.executeImageByPage(task.id, task.sessionId, params, userId);
            break;
          case AgentTaskType.MODIFY:
            result = await this.executeModify(task.sessionId, params);
            break;
          case AgentTaskType.EXPORT:
            result = await this.executeExport(task.sessionId, params);
            break;
          case AgentTaskType.SNAPSHOT:
            result = await this.executeSnapshot(task.sessionId, userId, params);
            break;
          case AgentTaskType.IMPORT:
            result = { importReady: false, message: '文档导入请通过项目上传界面操作', uploadUrl: '/api/upload' };
            break;
          // STYLE 任务暂未实现独立执行逻辑，不应 fall-through 到 MODIFY
          case AgentTaskType.STYLE:
            throw new Error('样式切换功能暂未实现，请使用修改功能调整幻灯片样式');
          case 'GENERATE_OUTLINE' as any:
            result = await this.executeOutline(task.id, task.sessionId, params, userId);
            break;
          case 'EXPAND_CONTENT' as any:
            result = await this.executeContent(task.id, task.sessionId, params, userId);
            break;
          case 'GENERATE_IMAGE' as any:
          case 'BATCH_GENERATE_IMAGES' as any:
            result = await this.executeImage(task.id, task.sessionId, params, userId);
            break;
          case 'MODIFY_SLIDE' as any:
          case 'SWITCH_STYLE_TEMPLATE' as any:
            result = await this.executeModify(task.sessionId, params);
            break;
          case 'IMPORT_DOCUMENT' as any:
            result = { importReady: false, message: '文档导入请通过项目上传界面操作' };
            break;
          case 'EXPORT_PROJECT' as any:
            result = await this.executeExport(task.sessionId, params);
            break;
          case 'FINALIZE_PROJECT' as any:
            result = { finalized: true, message: '项目已完成' };
            break;
          default:
            throw new Error(`未知任务类型: ${task.type}`);
        }
      }

      // 标记完成 - 使用实际消耗的积分
      const actualPointsUsed = result.pointsUsed || 0;
      const completedTask = await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: AgentTaskStatus.COMPLETED,
          progress: 100,
          result: JSON.stringify(result),
          pointsCost: actualPointsUsed,  // 更新为实际消耗
          completedAt: new Date()
        }
      });

      // 更新会话统计 - 使用实际消耗的积分
      await prisma.agentSession.update({
        where: { id: task.sessionId },
        data: {
          completedTasks: { increment: 1 },
          totalPointsUsed: { increment: actualPointsUsed }
        }
      });

      // 广播任务完成事件
      if (projectId) {
        websocketService.broadcastAgentTaskComplete(task.sessionId, projectId, {
          id: completedTask.id,
          type: completedTask.type,
          status: completedTask.status,
          progress: completedTask.progress,
          result: result
        });
        // 同时广播幻灯片更新（因为任务可能修改了幻灯片）
        await this.broadcastSlidesUpdate(projectId, 'agent');
        logger.info(`[Agent] 任务完成并广播: ${task.id}`);
      }

      // 创建下一个任务（任务链）
      await this.createNextTask(task.sessionId, task.type, userId);

    } catch (error: any) {
      // 标记失败
      const failedTask = await prisma.agentTask.update({
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

      // 广播任务失败事件
      if (projectId) {
        websocketService.broadcastAgentTaskComplete(task.sessionId, projectId, {
          id: failedTask.id,
          type: failedTask.type,
          status: failedTask.status,
          error: error.message
        });
        logger.error(`[Agent] 任务失败并广播: ${task.id}`, error);
      }

      throw error;
    }
  }

  // ============================================================
  // 任务预生成（引导模式下预览）
  // ============================================================

  /**
   * 预生成任务预览结果（引导模式下）
   * 在任务处于 PENDING 状态时生成预览内容，存储在 result 字段
   * 用户确认后直接将预览内容应用到项目
   */
  private async pregenerateTaskPreview(taskId: string, userId: string) {
    logger.info(`[Agent] pregenerateTaskPreview 被调用: ${taskId}`);
    const task = await prisma.agentTask.findUnique({ where: { id: taskId } });
    if (!task || task.status !== AgentTaskStatus.PENDING) {
      logger.warn(`[Agent] 预生成跳过: 任务不存在或状态不是 PENDING`);
      return;
    }

    const params = task.params ? JSON.parse(task.params) : {};
    let previewResult: any = null;

    try {
      if (task.type === AgentTaskType.OUTLINE) {
        previewResult = await this.generateOutlinePreview(task.sessionId, params);
      } else if (task.type === AgentTaskType.CONTENT) {
        previewResult = await this.generateContentPreview(task.sessionId, params);
      }

      if (previewResult) {
        // 更新任务 result 字段，存储预览内容
        await prisma.agentTask.update({
          where: { id: taskId },
          data: {
            result: JSON.stringify({ ...previewResult, _isPreview: true, _previewGeneratedAt: new Date().toISOString() })
          }
        });

        // 广播任务预览更新，通知前端刷新
        const session = await prisma.agentSession.findUnique({
          where: { id: task.sessionId },
          select: { projectId: true }
        });
        if (session?.projectId) {
          websocketService.broadcastAgentTaskPreview(task.sessionId, session.projectId, {
            id: task.id,
            type: task.type,
            status: task.status,
            progress: 0,
            result: previewResult
          });
          logger.info(`[Agent] 任务预览已广播: ${taskId}`);
        }

        logger.info(`[Agent] 任务预览生成完成: ${taskId}`);
      }
    } catch (error: any) {
      logger.error(`[Agent] 预生成任务预览失败: ${taskId}`, error);
      // 预览生成失败不影响主流程，只是不显示预览
    }
  }

  /**
   * 生成大纲预览（不创建幻灯片，不扣积分）
   */
  private async generateOutlinePreview(sessionId: string, params: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    const project = await prisma.project.findUnique({ where: { id: session.projectId } });
    if (!project) throw new Error('项目不存在');

    // 解析风格配置
    let styleConfig: any = {
      styleName: 'default',
      colorPalette: '#000000,#FFFFFF',
      requirements: '',
      aspectRatio: '16:9',
      targetPageCount: params.pageCount || 10,
      pageStructure: { cover: 1, directory: 1, transition: 0, content: (params.pageCount || 10) - 3, end: 1 }
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
      ai: { provider: 'Gemini' as const, baseUrl: '', apiKey: '', models: { text: '', image: '', vision: '' } },
      docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
      imageGeneration: { resolution: '1920x1080' as const },
      language: 'zh' as const
    };

    // 调用 AI 生成大纲（不创建幻灯片，不扣积分）
    const outline = await AIService.generateOutline(
      params.topic || '未命名主题',
      styleConfig,
      defaultSettings
    );

    return {
      title: params.topic || '未命名主题',
      slides: outline.map((item: any, index: number) => ({
        id: `preview-${index}`,
        index,
        title: item.title,
        content: item.brief || '',
        pageType: item.pageType || 'content'
      }))
    };
  }

  /**
   * 生成内容预览（不写入幻灯片，不扣积分）
   */
  private async generateContentPreview(sessionId: string, params: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目的幻灯片
    const slides = await prisma.slide.findMany({
      where: { projectId: session.projectId },
      orderBy: { index: 'asc' }
    });

    if (slides.length === 0) {
      return { slides: [], message: '暂无大纲，请先生成大纲' };
    }

    const defaultSettings = {
      ai: { provider: 'Gemini' as const, baseUrl: '', apiKey: '', models: { text: '', image: '', vision: '' } },
      docParser: { provider: 'None' as const, baseUrl: '', apiKey: '' },
      imageGeneration: { resolution: '1920x1080' as const },
      language: 'zh' as const
    };

    // 为每个幻灯片生成内容预览
    const contentSlides = [];
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const pageType = slide.pageType || 'content';

      // 跳过封面、目录、结束页
      if (pageType === 'cover' || pageType === 'tableOfContents' || pageType === 'end') {
        contentSlides.push({
          id: slide.id,
          index: slide.index,
          title: slide.title,
          content: slide.content || '',
          pageType
        });
        continue;
      }

      try {
        const content = await AIService.generateSlideDetail(
          slide.title || '',
          slide.brief || '',
          slide.title || '',
          slide.index,
          slides.length,
          pageType,
          defaultSettings
        );
        contentSlides.push({
          id: slide.id,
          index: slide.index,
          title: slide.title,
          content: content || '',
          pageType
        });
      } catch (error) {
        // 单页失败继续处理其他页
        contentSlides.push({
          id: slide.id,
          index: slide.index,
          title: slide.title,
          content: slide.content || '',
          pageType
        });
      }
    }

    return { slides: contentSlides };
  }

  /**
   * 应用预生成的大纲预览结果（用户确认后执行）
   */
  private async applyOutlineFromPreview(taskId: string, sessionId: string, params: any, userId: string, previewResult: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 积分预扣
    const pageCount = previewResult.slides?.length || 10;
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

    try {
      // 更新进度
      await this.updateTaskProgress(taskId, 50);

      // 创建幻灯片（从预览结果）
      for (let i = 0; i < previewResult.slides.length; i++) {
        const slide = previewResult.slides[i];
        await prisma.slide.create({
          data: {
            projectId: session.projectId,
            index: i,
            pageType: slide.pageType || 'content',
            contentType: 'text',
            title: slide.title,
            content: '',
            brief: slide.content || ''
          }
        });
      }

      // 积分确认扣费
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return {
        title: previewResult.title,
        slides: previewResult.slides,
        pointsUsed: deductResult.deductedAmount
      };
    } catch (error: any) {
      // 失败时退款
      if (deductResult.transactionId) {
        await pointsService.refundPoints(
          userId,
          deductResult.deductedAmount,
          deductResult.transactionId,
          `大纲应用失败: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 应用预生成的内容预览结果（用户确认后执行）
   */
  private async applyContentFromPreview(taskId: string, sessionId: string, params: any, userId: string, previewResult: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 积分预扣
    const slideCount = previewResult.slides?.length || 0;
    const deductResult = await pointsService.deductPoints(
      userId,
      'slide_content',
      session.projectId,
      `Agent 内容生成 (${slideCount}页)`,
      slideCount,
      { module: 'Agent', category: '文本生成', subcategory: '内容' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }

    try {
      // 更新进度
      await this.updateTaskProgress(taskId, 50);

      // 应用内容到幻灯片
      for (const slideData of previewResult.slides || []) {
        if (slideData.id && !slideData.id.startsWith('preview-')) {
          await prisma.slide.update({
            where: { id: slideData.id },
            data: { content: slideData.content || '' }
          });
        }
      }

      // 积分确认扣费
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return {
        slides: previewResult.slides,
        pointsUsed: deductResult.deductedAmount
      };
    } catch (error: any) {
      // 失败时退款
      if (deductResult.transactionId) {
        await pointsService.refundPoints(
          userId,
          deductResult.deductedAmount,
          deductResult.transactionId,
          `内容应用失败: ${error.message}`
        );
      }
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

  private async executeOutline(taskId: string, sessionId: string, params: any, userId: string) {
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
      await this.updateTaskProgress(taskId, 50);

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

      // 返回前端期望的格式：包含标题和幻灯片列表
      return {
        title: params.topic || '未命名演示文稿',
        slides: outline.map((item, index) => ({
          id: `slide-${index}`,
          index,
          title: item.title,
          content: item.brief || '',
          pageType: item.pageType || 'content'
        })),
        slideCount: outline.length,
        pointsUsed: deductResult.deductedAmount
      };

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

  private async executeContent(taskId: string, sessionId: string, params: any, userId: string) {
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
        await this.updateTaskProgress(taskId, progress);

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

        results.push({
          id: slide.id,
          index: slide.index,
          title: slide.title,
          content: content.slice(0, 200) + (content.length > 200 ? '...' : '') // 只返回预览
        });
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

      return { slidesProcessed: results.length, slides: results, pointsUsed: deductResult.deductedAmount };

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

  private async executeImage(taskId: string, sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目配置
    const project = await prisma.project.findUnique({
      where: { id: session.projectId }
    });
    if (!project) throw new Error('项目不存在');

    // === SVG 模式分支：检查 generationMode ===
    const generationMode = (project as any).generationMode || 'image';
    if (generationMode === 'svg') {
      return this.executeSvgGeneration(taskId, sessionId, params, userId);
    }

    // 获取指定幻灯片或所有幻灯片
    let slides;
    if (params.slideIndexes && Array.isArray(params.slideIndexes) && params.slideIndexes.length > 0) {
      // 重新生成选中的页面
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId, index: { in: params.slideIndexes } },
        orderBy: { index: 'asc' }
      });
    } else if (params.slideIndex !== undefined) {
      // 单个指定页面
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId, index: params.slideIndex }
      });
    } else {
      // 所有页面
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId },
        orderBy: { index: 'asc' }
      });
    }

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
        await this.updateTaskProgress(taskId, progress);

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

        results.push({
          slideIndex: slide.index,
          slideTitle: slide.title,
          imageUrl,
          pageType: slide.pageType
        });
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

  /**
   * SVG 模式：生成幻灯片 SVG 代码（可编辑模式）
   * 由 executeImage 在检测到 generationMode === 'svg' 时调用
   */
  private async executeSvgGeneration(taskId: string, sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    const project = await prisma.project.findUnique({ where: { id: session.projectId } });
    if (!project) throw new Error('项目不存在');

    // 获取幻灯片
    let slides;
    if (params.slideIndexes && Array.isArray(params.slideIndexes) && params.slideIndexes.length > 0) {
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId, index: { in: params.slideIndexes } },
        orderBy: { index: 'asc' }
      });
    } else if (params.slideIndex !== undefined) {
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId, index: params.slideIndex }
      });
    } else {
      slides = await prisma.slide.findMany({
        where: { projectId: session.projectId },
        orderBy: { index: 'asc' }
      });
    }

    if (slides.length === 0) throw new Error('没有幻灯片，请先生成大纲');

    // 积分预扣（SVG 生成使用 slide_content 类别，低于 image 成本）
    const pageCount = slides.length;
    const deductResult = await pointsService.deductPoints(
      userId,
      'slide_content',
      session.projectId,
      `Agent SVG 生成 (${pageCount}页)`,
      pageCount,
      { module: 'Agent', category: 'SVG生成', subcategory: '可编辑模式' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }
    logger.info(`[Agent] SVG 生成预扣积分: ${deductResult.deductedAmount}, 交易ID: ${deductResult.transactionId}`);

    // 解析风格配置
    let styleConfig: any = {
      styleName: 'default',
      colorPalette: '#0052D4,#4FC3F7,#FFFFFF,#1A1A2E',
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
    } catch (e) { /* use defaults */ }

    const defaultSettings: any = {
      ai: {
        provider: 'Gemini' as const,
        baseUrl: '',
        apiKey: '',
        models: { text: '', image: '', vision: '' }
      },
    };

    const projectId = session.projectId;
    const allSlideTitles = slides.map(s => s.title);
    const totalSlides = slides.length;

    let processedCount = 0;
    let lastError: Error | null = null;

    try {
      // 逐页生成 SVG
      for (const slide of slides) {
        try {
          await this.updateTaskProgress(taskId, processedCount, String(pageCount));
          logger.info(`[Agent] SVG 生成第 ${slide.index + 1}/${pageCount} 页: ${slide.title || ''}`);

          const svgContent = await AIService.generateSlideSvg(
            slide.title || '',
            slide.content || '',
            slide.pageType || 'content',
            styleConfig,
            undefined,            // styleKeywords
            allSlideTitles,
            slide.index || 0,
            totalSlides,
            (defaultSettings as any)
          );

          const svgUrl = await SvgStorageService.save(projectId, slide.index || 0, svgContent);

          await prisma.slide.update({
            where: { id: slide.id },
            data: { svgContent: svgUrl, status: 'success' }
          });

          processedCount++;
        } catch (slideError: any) {
          logger.error(`[Agent] SVG 生成第 ${slide.index + 1} 页失败: ${slideError.message}`);
          await prisma.slide.update({
            where: { id: slide.id },
            data: { status: 'error' }
          }).catch(() => {});
          lastError = slideError;
        }
      }

      // 广播更新
      websocketService.broadcastSlidesUpdate(projectId, slides.map(s => s.id), 'agent');

      // 完成积分事务
      if (deductResult.transactionId) {
        try {
          await pointsService.completeTransaction(deductResult.transactionId);
        } catch (e: any) {
          logger.error(`[Agent] SVG 生成积分事务完成失败: ${e.message}`);
        }
      }

      // 更新任务状态
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          result: JSON.stringify({
            svgGenerated: processedCount,
            totalSlides: pageCount,
            imagesGenerated: 0,
            images: [],
          })
        }
      });

      if (lastError) {
        logger.warn(`[Agent] SVG 生成部分完成: ${processedCount}/${pageCount}`);
      }
    } catch (error: any) {
      // 部分失败：退还未完成积分
      if (deductResult.transactionId) {
        const actualPointsPerPage = deductResult.deductedAmount / pageCount;
        const unusedPages = slides.length - processedCount;
        const refundAmount = Math.round(unusedPages * actualPointsPerPage * 100) / 100;
        if (refundAmount > 0) {
          await pointsService.refundPoints(userId, refundAmount, deductResult.transactionId,
            `Agent SVG 生成部分失败: ${error.message}`
          );
          logger.info(`[Agent] SVG 生成退还未完成积分: ${refundAmount} 给用户 ${userId}`);
        }
      }
      throw error;
    }
  }

  /**
   * 执行配置确认任务（仅生成预览，不改变任务状态）
   * 用于引导模式下立即展示配置信息
   */
  private async executeConfigConfirmForPreview(taskId: string, sessionId: string, params: any, userId: string) {
    // 直接执行配置确认逻辑获取结果
    const result = await this.executeConfigConfirm(taskId, sessionId, params, userId);

    // 只更新 result 字段，保持 PENDING 状态
    await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        result: JSON.stringify(result)
      }
    });

    // 获取会话信息用于广播
    const session = await this.getSession(sessionId);
    if (session?.projectId) {
      websocketService.broadcastAgentTaskPreview(sessionId, session.projectId, {
        id: taskId,
        type: AgentTaskType.CONFIG_CONFIRM,
        status: AgentTaskStatus.PENDING,
        progress: 100,
        result
      });
      logger.info(`[Agent] 配置确认任务预览已广播: ${taskId}`);
    }
  }

  /**
   * 执行配置确认任务
   * 返回配置信息供前端展示
   *
   * 场景判断逻辑：
   * 1. 如果 globalConfig 中包含完整的配置信息（styleName, colorPalette, aspectRatio, targetPageCount, pageStructure），
   *    则认为用户已选择模板，使用 globalConfig 作为基础配置
   * 2. 否则，认为配置未确定，使用 AI 从 params 或 styleMap 推断的配置
   */
  private async executeConfigConfirm(taskId: string, sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目完整信息
    const project = await prisma.project.findUnique({
      where: { id: session.projectId },
      select: {
        styleMap: true,
        globalConfig: true,
        title: true
      }
    });

    // 解析配置
    let styleConfig: any = {};
    let globalConfig: any = {};

    if (project?.styleMap) {
      try {
        styleConfig = JSON.parse(project.styleMap);
      } catch (e) {
        logger.warn(`[Agent] styleMap 解析失败: ${e}`);
      }
    }

    if (project?.globalConfig) {
      try {
        globalConfig = JSON.parse(project.globalConfig);
      } catch (e) {
        logger.warn(`[Agent] globalConfig 解析失败: ${e}`);
      }
    }

    // 判断场景：用户是否已选择模板（配置是否完整）
    const hasUserSelectedTemplate = !!(
      globalConfig.styleName &&
      globalConfig.colorPalette &&
      globalConfig.aspectRatio &&
      globalConfig.targetPageCount &&
      globalConfig.pageStructure
    );

    logger.info(`[Agent] 配置确认场景判断: ${hasUserSelectedTemplate ? '用户已选模板' : 'AI自动生成'}, projectId: ${session.projectId}`);

    // 构建页面结构
    const targetPageCount = globalConfig.targetPageCount || params.pageCount || 10;
    const pageStructure = globalConfig.pageStructure || {
      cover: 1,
      directory: 1,
      transition: 0,
      content: Math.max(1, targetPageCount - 3),
      end: 1
    };

    // 计算内容页数（确保总和等于目标页数）
    const fixedPages = (pageStructure.cover || 1) + (pageStructure.directory || 1) + (pageStructure.end || 1) + (pageStructure.transition || 0);
    if (targetPageCount < fixedPages + 1) {
      logger.warn(`[Agent] 目标页数 ${targetPageCount} 小于固定页 ${fixedPages}+1，自动调整为 ${fixedPages + 1}`);
    }
    pageStructure.content = Math.max(1, targetPageCount - fixedPages);

    // 辅助函数：确保 colorPalette 是数组
    const ensureColorPalette = (palette: any): string[] => {
      if (Array.isArray(palette)) return palette;
      if (typeof palette === 'string') {
        try {
          const parsed = JSON.parse(palette);
          return Array.isArray(parsed) ? parsed : ['#000000', '#FFFFFF', '#2563EB', '#F59E0B'];
        } catch {
          return ['#000000', '#FFFFFF', '#2563EB', '#F59E0B'];
        }
      }
      return ['#000000', '#FFFFFF', '#2563EB', '#F59E0B'];
    };

    // 构建配置确认结果
    const config = {
      topic: params.topic || project?.title || '未命名演示文稿',
      pageCount: targetPageCount,
      styleName: globalConfig.styleName || styleConfig.styleName || params.styleName || '默认风格',
      aspectRatio: globalConfig.aspectRatio || styleConfig.aspectRatio || params.aspectRatio || '16:9',
      colorPalette: ensureColorPalette(globalConfig.colorPalette || styleConfig.colorPalette || params.colorPalette),
      colorPaletteName: globalConfig.colorPaletteName || styleConfig.colorPaletteName || '默认配色',
      requirements: params.requirements || globalConfig.requirements || styleConfig.requirements || '',
      pagesPerGeneration: globalConfig.pagesPerGeneration || styleConfig.pagesPerGeneration || 1,
      pageStructure: pageStructure,
      // 场景标记
      configSource: hasUserSelectedTemplate ? 'user_selected' : 'ai_generated',
      hasCompleteConfig: hasUserSelectedTemplate
    };

    logger.info(`[Agent] 配置确认任务执行完成: ${taskId}, topic: ${config.topic}, source: ${config.configSource}`);

    return {
      type: 'CONFIG_CONFIRM',
      topic: config.topic,
      config,
      pointsUsed: 0,
      configSource: config.configSource
    };
  }

  /**
   * 重新生成配置确认任务
   * 调用 AI 重新分析用户需求并生成新的配置建议
   */
  async regenerateConfigConfirm(taskId: string, sessionId: string, userMessage: string, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    logger.info(`[Agent] 开始重新生成配置: ${taskId}, 用户消息: "${userMessage.slice(0, 50)}..."`);

    try {
      // 获取项目配置
      const project = await prisma.project.findUnique({
        where: { id: session.projectId },
        select: { styleMap: true }
      });

      let styleConfig: any = {};
      if (project?.styleMap) {
        try {
          styleConfig = JSON.parse(project.styleMap);
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 构建重新生成配置的 Prompt
      const prompt = `用户需求：${userMessage}

请基于用户需求，生成一套新的演示文稿配置建议。注意：请生成不同于默认配置的新建议，可以适当调整风格、配色等元素。

请以 JSON 格式返回配置，格式如下：
{
  "topic": "演示主题",
  "pageCount": 页数（数字，建议5-20之间）,
  "styleName": "风格名称（如：科技简约、商务大气、创意活泼等）",
  "aspectRatio": "页面比例（如：16:9、4:3等）",
  "colorPalette": ["主色", "辅色", "背景色", "文字色"],
  "requirements": "设计要求说明"
}

注意：
- 主题要精炼概括用户需求
- 风格名称要具体且贴切
- 配色方案要提供4个十六进制颜色值
- 页数要合理，根据需求复杂度调整`;

      // 调用 AI 生成新配置
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
      let newConfig: any;
      try {
        // 尝试从 AI 响应中提取 JSON
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          newConfig = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI 响应中未找到有效的 JSON');
        }
      } catch (parseError) {
        logger.error('[Agent] 解析 AI 配置响应失败:', parseError);
        // 使用回退配置
        newConfig = {
          topic: userMessage.slice(0, 50),
          pageCount: 10,
          styleName: '简约现代',
          aspectRatio: '16:9',
          colorPalette: ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
          requirements: ''
        };
      }

      // 构建完整的配置对象
      const config = {
        topic: newConfig.topic || userMessage.slice(0, 50),
        pageCount: newConfig.pageCount || 10,
        styleName: newConfig.styleName || styleConfig.styleName || '简约现代',
        aspectRatio: newConfig.aspectRatio || styleConfig.aspectRatio || '16:9',
        colorPalette: newConfig.colorPalette || styleConfig.colorPalette || ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
        requirements: newConfig.requirements || '',
        pageStructure: {
          cover: 1,
          directory: 1,
          transition: 0,
          content: (newConfig.pageCount || 10) - 3,
          end: 1
        }
      };

      // 更新任务结果
      const taskResult = {
        type: 'CONFIG_CONFIRM',
        topic: config.topic,
        config
      };

      const completedTask = await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: AgentTaskStatus.PENDING,
          progress: 0,
          result: JSON.stringify(taskResult),
          params: JSON.stringify({
            topic: config.topic,
            pageCount: config.pageCount,
            styleName: config.styleName,
            aspectRatio: config.aspectRatio,
            requirements: config.requirements
          })
        }
      });

      logger.info(`[Agent] 配置重新生成完成（待用户确认）: ${taskId}, 新主题: ${config.topic}`);

      // 使用预览事件广播，让前端展示配置供用户确认
      websocketService.broadcastAgentTaskPreview(sessionId, session.projectId, {
        id: completedTask.id,
        type: completedTask.type,
        status: completedTask.status,
        progress: 100,
        result: taskResult
      });

      // 添加 AI 响应消息
      await prisma.agentMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: `我已根据您的需求重新生成了一套新的配置建议，请查看并确认：`,
          metadata: JSON.stringify({ taskId })
        }
      });

    } catch (error) {
      logger.error(`[Agent] 重新生成配置失败: ${taskId}`, error);

      // 更新任务错误状态
      await prisma.agentTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : '重新生成配置失败'
        }
      });
    }
  }

  private async executeModify(sessionId: string, params: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    if (params.slideIndex === undefined || !params.field || !params.value) {
      throw new Error('缺少修改参数');
    }

    const ALLOWED_MODIFY_FIELDS = ['title', 'content', 'brief'] as const;
    if (!ALLOWED_MODIFY_FIELDS.includes(params.field as typeof ALLOWED_MODIFY_FIELDS[number])) {
      throw new Error(`不允许修改字段: ${params.field}，仅允许: title, content, brief`);
    }

    const field = params.field as typeof ALLOWED_MODIFY_FIELDS[number];

    const slide = await prisma.slide.findFirst({
      where: { projectId: session.projectId, index: params.slideIndex }
    });

    if (!slide) {
      throw new Error(`幻灯片 ${params.slideIndex} 不存在`);
    }

    await prisma.slide.update({
      where: { id: slide.id },
      data: { [field]: params.value }
    });

    // 广播幻灯片更新
    await this.broadcastSlidesUpdate(session.projectId, 'agent');

    return { modified: true, field: params.field };
  }

  /**
   * 逐页生成配图任务
   * 一页一页地生成配图，每完成一页广播进度，用户可以实时看到进度
   */
  private async executeImageByPage(taskId: string, sessionId: string, params: any, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('会话不存在');

    // 获取项目配置
    const project = await prisma.project.findUnique({
      where: { id: session.projectId }
    });
    if (!project) throw new Error('项目不存在');

    // 获取所有幻灯片
    const slides = await prisma.slide.findMany({
      where: { projectId: session.projectId },
      orderBy: { index: 'asc' }
    });

    if (slides.length === 0) {
      throw new Error('没有幻灯片，请先生成大纲');
    }

    // 积分预扣
    const pageCount = slides.length;
    const deductResult = await pointsService.deductPoints(
      userId,
      'slide_image',
      session.projectId,
      `Agent 逐页配图生成 (${pageCount}页)`,
      pageCount,
      { module: 'Agent', category: '图像生成', subcategory: '逐页配图' }
    );

    if (!deductResult.success) {
      throw new Error(`积分不足: ${deductResult.message}`);
    }

    logger.info(`[Agent] 逐页配图生成预扣积分: ${deductResult.deductedAmount}, 交易ID: ${deductResult.transactionId}`);

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
        await this.updateTaskProgress(taskId, progress);

        // 广播当前正在生成的页面
        websocketService.broadcastImageProgress(sessionId, session.projectId, {
          slideIndex: slide.index,
          slideTitle: slide.title,
          status: 'generating',
          totalPages: slides.length,
          currentPage: processedCount
        });

        // 调用 AI 生成配图
        const imageUrl = await AIService.generateSlideVariant(
          slide.content || '',
          null,
          styleConfig,
          'variant-1',
          slide.title,
          defaultSettings,
          'text',
          undefined,
          slide.pageType || 'content',
          slide.content || '',
          undefined,
          allSlideTitles
        );

        // 注册资源
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
          logger.warn(`[Agent] 资源注册失败: ${registerError}`);
        }

        // 广播完成当前页
        websocketService.broadcastImageProgress(sessionId, session.projectId, {
          slideIndex: slide.index,
          slideTitle: slide.title,
          status: 'completed',
          imageUrl,
          totalPages: slides.length,
          currentPage: processedCount
        });

        results.push({
          slideIndex: slide.index,
          slideTitle: slide.title,
          imageUrl,
          pageType: slide.pageType
        });
        processedCount++;
      }

      // 积分确认扣费
      if (deductResult.transactionId) {
        await pointsService.completeTransaction(deductResult.transactionId);
        logger.info(`[Agent] 逐页配图生成积分确认: ${deductResult.transactionId}`);
      }

      // 广播幻灯片更新
      await this.broadcastSlidesUpdate(session.projectId, 'agent');

      return {
        imagesGenerated: results.length,
        images: results,
        pointsUsed: deductResult.deductedAmount,
        mode: 'by_page'
      };

    } catch (error: any) {
      // 积分退还
      if (deductResult.deductedAmount > 0) {
        const actualPointsPerPage = deductResult.deductedAmount / pageCount;
        const unusedPages = slides.length - processedCount;
        const refundAmount = Math.round(unusedPages * actualPointsPerPage * 100) / 100;
        if (refundAmount > 0) {
          await pointsService.refundPoints(
            userId,
            refundAmount,
            deductResult.transactionId,
            `Agent 逐页配图生成部分失败: ${error.message}`
          );
          logger.info(`[Agent] 逐页配图生成退还未完成积分: ${refundAmount}`);
        }
      }

      throw error;
    }
  }

  private async executeExport(sessionId: string, params: any) {
    // 检查是否为 SVG 模式
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { projectId: true }
    });

    if (session?.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: session.projectId },
        select: { generationMode: true }
      });
      const generationMode = (project as any)?.generationMode || 'image';

      if (generationMode === 'svg') {
        return {
          exportReady: true,
          format: params.format || 'pptx',
          svgMode: true,
          downloadUrl: `/api/export/pptx?projectId=${session.projectId}&mode=native`
        };
      }
    }

    // 图像模式：使用现有的客户端导出路径
    return {
      exportReady: true,
      format: params.format || 'pptx',
      downloadUrl: `/api/projects/export?format=${params.format || 'pptx'}`
    };
  }

  private async executeSnapshot(sessionId: string, userId: string, params: any) {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { projectId: true }
    });
    if (!session) throw new Error('会话不存在');

    const projectId = session.projectId;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { Slide: { orderBy: { index: 'asc' } } }
    });
    if (!project) throw new Error('项目不存在');

    const snapshotData: any = {
      id: project.id,
      title: project.title,
      lastModified: Date.now(),
      createdAt: project.createdAt.getTime(),
      status: project.status || 'idle',
      items: project.Slide.map((slide: any) => ({
        id: slide.id,
        contentType: slide.contentType || 'text',
        pageType: slide.pageType || 'content',
        title: slide.title,
        textContent: slide.content,
        brief: slide.brief,
        previewUrl: slide.previewUrl,
        variants: slide.variants ? JSON.parse(slide.variants) : [],
        variantCount: slide.variantCount || 0,
        status: slide.status || 'idle'
      })),
      globalConfig: project.globalConfig ? JSON.parse(project.globalConfig) : {},
      globalStyleMap: project.styleMap ? JSON.parse(project.styleMap) : {}
    };

    const { SettingService } = await import('./setting.service');
    const settings = await SettingService.getSettings();

    const snapshot = await snapshotService.create(
      projectId,
      userId,
      snapshotData,
      settings || { ai: { provider: 'Gemini' } }
    );

    return {
      snapshotCreated: true,
      snapshotId: snapshot.id,
      version: snapshot.version,
      message: `已保存项目快照 (v${snapshot.version})`
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
        AgentTask: {
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
      status: session.status as AgentSessionStatusType,
      totalTasks: session.totalTasks,
      completedTasks: session.completedTasks,
      failedTasks: session.failedTasks,
      currentTask: session.AgentTask[0] ? {
        id: session.AgentTask[0].id,
        type: session.AgentTask[0].type as AgentTaskTypeType,
        progress: session.AgentTask[0].progress
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
    // 获取退还积分所需信息
    const sessionForRefund = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { totalPointsUsed: true, projectId: true }
    });
    const project = sessionForRefund ? await prisma.project.findUnique({
      where: { id: sessionForRefund.projectId },
      select: { userId: true }
    }) : null;

    // 查询已部分退款的金额，避免双倍退款
    const existingRefunds = await prisma.transaction.findMany({
      where: {
        projectId: sessionForRefund?.projectId,
        type: 'refund',
        module: 'Agent',
        description: { contains: '部分退款' }
      },
      select: { amount: true }
    });
    const alreadyRefunded = existingRefunds.reduce((sum, t) => sum + t.amount, 0);
    const netPointsToRefund = Math.max(0, (sessionForRefund?.totalPointsUsed || 0) - alreadyRefunded);

    await prisma.$transaction(async (tx) => {
      // 退还积分（在同一事务内，避免竞态）
      if (sessionForRefund && netPointsToRefund > 0 && project) {
        const userId = project.userId!;
        const projectId = sessionForRefund.projectId;
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { points: { increment: netPointsToRefund } }
        });
        await tx.transaction.create({
          data: {
            userId,
            projectId,
            type: 'refund',
            amount: netPointsToRefund,
            balance: updatedUser.points,
            description: `取消会话退还积分（已排除部分退款 ${alreadyRefunded}）`,
            module: 'Agent',
            category: '退还'
          }
        });
        logger.info(`[Agent] 取消会话退还积分: ${netPointsToRefund} (已排除部分退款: ${alreadyRefunded}), 用户: ${userId}`);
      }

      // 取消 PENDING 和 RUNNING 任务
      await tx.agentTask.updateMany({
        where: { sessionId, status: { in: [AgentTaskStatus.PENDING, AgentTaskStatus.RUNNING] } },
        data: { status: AgentTaskStatus.CANCELLED }
      });
      await tx.agentSession.update({
        where: { id: sessionId },
        data: { status: AgentSessionStatus.CANCELLED }
      });
    });

    return this.getSession(sessionId);
  }

  /**
   * 更新会话模式（引导/自动）
   */
  async updateSessionMode(sessionId: string, mode: AgentModeType, userId: string) {
    const session = await prisma.agentSession.findUnique({
      where: { id: sessionId },
      select: { mode: true, status: true }
    });

    if (!session) {
      throw new Error('会话不存在');
    }

    // 更新模式
    const updatedSession = await prisma.agentSession.update({
      where: { id: sessionId },
      data: { mode }
    });

    // 如果切换到自动模式且有待处理任务，开始执行
    if (mode === AgentMode.AUTO && session.status === AgentSessionStatus.ACTIVE) {
      const pendingTasks = await prisma.agentTask.count({
        where: { sessionId, status: AgentTaskStatus.PENDING }
      });

      if (pendingTasks > 0) {
        this.executeTasksAsync(sessionId, userId).catch(err => {
          logger.error(`[Agent] 自动执行任务失败: ${err.message}`);
        });
      }
    }

    logger.info(`[Agent] 会话模式更新: ${sessionId} -> ${mode}`);
    return this.getSession(sessionId);
  }
}

// 导出单例
export const agentService = new AgentService();
