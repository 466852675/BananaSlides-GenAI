/**
 * Agent API 路由
 *
 * 提供 Agent 模块的所有 API 端点
 */

import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth.middleware';
import { agentSessionLimiter, agentMessageLimiter, agentTaskLimiter } from '../middleware/rateLimitMiddleware';
import { agentService } from '../services/agent.service';
import { logger } from '../utils/logger';
import { AgentMode, AgentTaskType } from '@prisma/client';
import { prisma } from '../db';

const router = Router();

/**
 * 验证会话归属的辅助函数
 * 确保用户只能操作自己的会话
 */
async function verifySessionOwnership(sessionId: string, userId: string): Promise<{
  valid: boolean;
  session?: any;
  error?: string;
}> {
  const session = await prisma.agentSession.findUnique({
    where: { id: sessionId },
    include: {
      project: {
        select: { userId: true }
      }
    }
  });

  if (!session) {
    return { valid: false, error: '会话不存在' };
  }

  // 通过项目的 userId 判断会话归属
  if (session.project?.userId !== userId) {
    logger.warn(`[Agent] 用户 ${userId} 尝试访问非本人的会话 ${sessionId}`);
    return { valid: false, error: '无权访问此会话' };
  }

  return { valid: true, session };
}

/**
 * 验证项目归属的辅助函数
 */
async function verifyProjectOwnership(projectId: string, userId: string): Promise<{
  valid: boolean;
  project?: any;
  error?: string;
}> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true }
  });

  if (!project) {
    return { valid: false, error: '项目不存在' };
  }

  if (project.userId !== userId) {
    logger.warn(`[Agent] 用户 ${userId} 尝试访问非本人的项目 ${projectId}`);
    return { valid: false, error: '无权访问此项目' };
  }

  return { valid: true, project };
}

// ============================================================
// 会话管理
// ============================================================

/**
 * POST /api/agent/sessions
 * 创建新的 Agent 会话
 * 权限: agent.session.create
 */
router.post('/sessions',
  agentSessionLimiter,
  authenticate,
  requirePermission('agent.session.create'),
  async (req: Request, res: Response) => {
    try {
      const { projectId, mode } = req.body;
      const userId = req.user?.id;

      if (!projectId) {
        return res.status(400).json({ error: '缺少项目ID' });
      }

      // 验证项目归属
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // 检查自动执行权限
      if (mode === 'AUTO') {
        // 需要在 controller 层检查权限，这里简化处理
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        // PROFESSIONAL 及以上才能使用自动执行模式
        const autoExecuteRoles = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE', 'ADMIN', 'SUPER_ADMIN'];
        if (!user || !autoExecuteRoles.includes(user.role)) {
          return res.status(403).json({ error: '您的账户等级不支持自动执行模式，请升级到专业版' });
        }
      }

      // 创建会话
      const session = await agentService.createSession({
        projectId,
        mode: mode as AgentMode
      });

      if (!session) {
        return res.status(500).json({ error: '创建会话失败' });
      }

      logger.info(`[Agent] 用户 ${userId} 创建会话: ${session.id}`);

      res.status(201).json(session);
    } catch (error: any) {
      logger.error('[Agent] 创建会话失败:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/agent/projects-with-sessions
 * 获取用户的所有项目及其 AgentSession 信息
 * 用于 Agent 模式侧边栏显示
 */
router.get('/projects-with-sessions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const projects = await agentService.getUserProjectsWithSessions(userId);
    res.json(projects);
  } catch (error: any) {
    logger.error('[Agent] 获取项目列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent/sessions/:id
 * 获取会话详情
 */
router.get('/sessions/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const session = await agentService.getSession(id);

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json(session);
  } catch (error: any) {
    logger.error('[Agent] 获取会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent/projects/:projectId/session
 * 根据项目ID获取会话
 */
router.get('/projects/:projectId/session', authenticate, async (req: Request, res: Response) => {
  try {
    const projectId = String(req.params.projectId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证项目归属
    const ownership = await verifyProjectOwnership(projectId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const session = await agentService.getSessionByProjectId(projectId);

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json(session);
  } catch (error: any) {
    logger.error('[Agent] 获取项目会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/pause
 * 暂停会话
 */
router.post('/sessions/:id/pause', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const session = await agentService.pauseSession(id);
    res.json(session);
  } catch (error: any) {
    logger.error('[Agent] 暂停会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/resume
 * 恢复会话
 */
router.post('/sessions/:id/resume', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const session = await agentService.resumeSession(id, userId);
    res.json(session);
  } catch (error: any) {
    logger.error('[Agent] 恢复会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/cancel
 * 取消会话
 */
router.post('/sessions/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const session = await agentService.cancelSession(id);
    res.json(session);
  } catch (error: any) {
    logger.error('[Agent] 取消会话失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 消息处理
// ============================================================

/**
 * POST /api/agent/sessions/:id/messages
 * 发送消息到会话
 * 权限: agent.task.execute (如果消息会触发任务执行)
 */
router.post('/sessions/:id/messages',
  agentMessageLimiter,
  authenticate,
  requirePermission('agent.task.execute'),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { content, autoExecute } = req.body;
      const userId = req.user?.id;

      if (!content) {
        return res.status(400).json({ error: '消息内容不能为空' });
      }

      if (!userId) {
        return res.status(401).json({ error: '未授权' });
      }

      // 验证会话归属
      const ownership = await verifySessionOwnership(id, userId);
      if (!ownership.valid) {
        return res.status(403).json({ error: ownership.error });
      }

      // 检查自动执行权限
      if (autoExecute) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true }
        });
        const autoExecuteRoles = ['PROFESSIONAL', 'PREMIUM', 'ENTERPRISE', 'ADMIN', 'SUPER_ADMIN'];
        if (!user || !autoExecuteRoles.includes(user.role)) {
          return res.status(403).json({ error: '您的账户等级不支持自动执行模式' });
        }
      }

      const result = await agentService.processMessage(id, content, userId);

      logger.info(`[Agent] 用户 ${userId} 发送消息到会话 ${id}`);

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('[Agent] 发送消息失败:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/agent/sessions/:id/messages
 * 获取会话消息历史
 */
router.get('/sessions/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const messages = await prisma.agentMessage.findMany({
      where: {
        sessionId: id,
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take: limit
    });

    const total = await prisma.agentMessage.count({
      where: {
        sessionId: id,
        isDeleted: false
      }
    });

    res.json({
      messages,
      pagination: { total, limit, offset }
    });
  } catch (error: any) {
    logger.error('[Agent] 获取消息历史失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 任务管理
// ============================================================

/**
 * GET /api/agent/sessions/:id/tasks
 * 获取会话任务列表
 */
router.get('/sessions/:id/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    const status = req.query.status as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    const whereClause: any = { sessionId: id };
    if (status) {
      whereClause.status = status;
    }

    const tasks = await prisma.agentTask.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(tasks);
  } catch (error: any) {
    logger.error('[Agent] 获取任务列表失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/tasks
 * 手动创建任务
 */
router.post('/sessions/:id/tasks', authenticate, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = req.user?.id;
    const { type, params, priority } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(id, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    if (!type) {
      return res.status(400).json({ error: '缺少任务类型' });
    }

    const task = await agentService.createTask(id, type as AgentTaskType, params);

    logger.info(`[Agent] 手动创建任务: ${task.id}`);

    res.status(201).json(task);
  } catch (error: any) {
    logger.error('[Agent] 创建任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/agent/sessions/:id/messages/:messageId
 * 编辑消息
 */
router.put('/sessions/:id/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const messageId = String(req.params.messageId);
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    if (!content) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(sessionId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    // 验证消息存在且属于该会话
    const existingMessage = await prisma.agentMessage.findFirst({
      where: { id: messageId, sessionId }
    });

    if (!existingMessage) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 更新消息
    const updatedMessage = await prisma.agentMessage.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date()
      }
    });

    logger.info(`[Agent] 用户 ${userId} 编辑消息: ${messageId}`);

    res.json(updatedMessage);
  } catch (error: any) {
    logger.error('[Agent] 编辑消息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/agent/sessions/:id/messages/:messageId
 * 重置消息（删除该消息及后续所有消息）
 */
router.delete('/sessions/:id/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const messageId = String(req.params.messageId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(sessionId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    // 获取目标消息
    const targetMessage = await prisma.agentMessage.findFirst({
      where: { id: messageId, sessionId }
    });

    if (!targetMessage) {
      return res.status(404).json({ error: '消息不存在' });
    }

    // 删除该消息及之后的所有消息
    const deleteResult = await prisma.agentMessage.deleteMany({
      where: {
        sessionId,
        createdAt: { gte: targetMessage.createdAt }
      }
    });

    // 同时删除在该消息之后创建的任务
    await prisma.agentTask.deleteMany({
      where: {
        sessionId,
        createdAt: { gte: targetMessage.createdAt }
      }
    });

    logger.info(`[Agent] 用户 ${userId} 重置消息: ${messageId}，删除了 ${deleteResult.count} 条消息`);

    res.json({ success: true, deletedCount: deleteResult.count });
  } catch (error: any) {
    logger.error('[Agent] 重置消息失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/tasks/:taskId/confirm
 * 确认任务（在引导模式下）
 */
router.post('/sessions/:id/tasks/:taskId/confirm', agentTaskLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const taskId = String(req.params.taskId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(sessionId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    // 获取任务
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, sessionId }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.status !== 'PENDING') {
      return res.status(400).json({ error: '只能确认待处理的任务' });
    }

    // 更新任务状态为已确认（标记为准备执行）
    const updatedTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        // 可以添加 confirmedAt 字段，或者直接执行
        // 这里简单地将状态保持为 PENDING，由前端触发执行
      }
    });

    logger.info(`[Agent] 用户 ${userId} 确认任务: ${taskId}`);

    res.json(updatedTask);
  } catch (error: any) {
    logger.error('[Agent] 确认任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/tasks/:taskId/modify
 * 修改任务参数
 */
router.post('/sessions/:id/tasks/:taskId/modify', authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const taskId = String(req.params.taskId);
    const { params } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(sessionId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    // 获取任务
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, sessionId }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.status !== 'PENDING') {
      return res.status(400).json({ error: '只能修改待处理的任务' });
    }

    // 合并参数
    const existingParams = task.params ? JSON.parse(task.params as string) : {};
    const newParams = { ...existingParams, ...params };

    // 更新任务参数
    const updatedTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: { params: JSON.stringify(newParams) }
    });

    logger.info(`[Agent] 用户 ${userId} 修改任务: ${taskId}`);

    res.json(updatedTask);
  } catch (error: any) {
    logger.error('[Agent] 修改任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/sessions/:id/tasks/:taskId/regenerate
 * 重新生成任务
 */
router.post('/sessions/:id/tasks/:taskId/regenerate', agentTaskLimiter, authenticate, async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.params.id);
    const taskId = String(req.params.taskId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证会话归属
    const ownership = await verifySessionOwnership(sessionId, userId);
    if (!ownership.valid) {
      return res.status(403).json({ error: ownership.error });
    }

    // 获取任务
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, sessionId }
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 重置任务状态为 PENDING，清除之前的结果和错误
    const updatedTask = await prisma.agentTask.update({
      where: { id: taskId },
      data: {
        status: 'PENDING',
        progress: 0,
        result: null,
        error: null,
        startedAt: null,
        completedAt: null
      }
    });

    logger.info(`[Agent] 用户 ${userId} 重新生成任务: ${taskId}`);

    res.json(updatedTask);
  } catch (error: any) {
    logger.error('[Agent] 重新生成任务失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SSE 进度推送
// ============================================================

/**
 * GET /api/agent/sessions/:id/progress
 * SSE 端点，推送任务进度
 * 支持 Authorization header 或 ?token= query parameter 认证（EventSource 不支持自定义 header）
 */
router.get('/sessions/:id/progress', async (req: Request, res: Response) => {
  // SSE 认证：支持 header 和 query parameter 两种方式
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null) || queryToken;

  if (!token) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'SSE 连接需要认证' } });
    return;
  }

  // 验证 token
  const { verifyToken } = await import('../utils/jwt.util');
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token 无效或已过期' } });
    return;
  }

  // 验证用户存在且活跃
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, status: true }
  });
  if (!user) {
    res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '用户不存在' } });
    return;
  }

  // 附加用户信息到 req
  req.user = user as any;

  const id = String(req.params.id);

  // 验证会话归属
  const ownership = await verifySessionOwnership(id, user.id);
  if (!ownership.valid) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: ownership.error || '无权访问此会话' } });
    return;
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲

  // 心跳检测相关
  let lastHeartbeat = Date.now();
  const heartbeatInterval = 30000; // 30秒
  const connectionTimeout = 90000; // 90秒无响应则断开

  // 发送初始进度
  try {
    const progress = await agentService.getProgress(id);
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
    return;
  }

  // 进度更新定时器
  const progressIntervalId = setInterval(async () => {
    try {
      const progress = await agentService.getProgress(id);
      res.write(`data: ${JSON.stringify(progress)}\n\n`);

      // 如果会话已完成，关闭连接
      if (progress.status === 'COMPLETED' || progress.status === 'FAILED' || progress.status === 'CANCELLED') {
        clearInterval(progressIntervalId);
        clearInterval(heartbeatIntervalId);
        res.end();
      }
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      clearInterval(progressIntervalId);
      clearInterval(heartbeatIntervalId);
      res.end();
    }
  }, 1000);

  // 心跳检测定时器 - 每30秒发送心跳并验证用户状态
  const heartbeatIntervalId = setInterval(async () => {
    try {
      // 检查连接是否超时
      const now = Date.now();
      if (now - lastHeartbeat > connectionTimeout) {
        logger.warn(`[SSE] 连接超时，关闭会话 ${id} 的 SSE 连接`);
        clearInterval(progressIntervalId);
        clearInterval(heartbeatIntervalId);
        res.write(`data: ${JSON.stringify({ type: 'timeout', message: '连接超时' })}\n\n`);
        res.end();
        return;
      }

      // 验证用户状态
      const currentUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, status: true }
      });

      if (!currentUser || currentUser.status !== 'ACTIVE') {
        logger.warn(`[SSE] 用户状态异常，关闭会话 ${id} 的 SSE 连接`);
        clearInterval(progressIntervalId);
        clearInterval(heartbeatIntervalId);
        res.write(`data: ${JSON.stringify({ type: 'auth_expired', message: '用户状态已变更，请重新登录' })}\n\n`);
        res.end();
        return;
      }

      // 发送心跳注释（SSE 标准）
      res.write(': heartbeat\n\n');
      lastHeartbeat = now;
    } catch (error: any) {
      logger.error(`[SSE] 心跳检测失败: ${error.message}`);
    }
  }, heartbeatInterval);

  // 客户端断开连接时清理
  req.on('close', () => {
    clearInterval(progressIntervalId);
    clearInterval(heartbeatIntervalId);
    logger.info(`[SSE] 客户端断开连接，会话 ${id}`);
  });
});

// ============================================================
// 工具定义
// ============================================================

/**
 * GET /api/agent/tools
 * 获取可用的 Agent 工具列表
 */
router.get('/tools', authenticate, async (req: Request, res: Response) => {
  const { AGENT_TOOLS } = require('../types/agent.types');
  res.json(AGENT_TOOLS);
});

export default router;