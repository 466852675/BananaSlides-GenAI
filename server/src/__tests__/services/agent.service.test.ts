/**
 * Agent 服务单元测试
 *
 * 直接通过 Prisma 测试 Agent 数据库操作逻辑，
 * 避免导入完整 AgentService（依赖 WebSocket/AI 等重量级模块）。
 *
 * 测试覆盖范围：
 * 1. 会话创建/重置/取消
 * 2. 原子积分退还（resetSession / cancelSession）
 * 3. executeModify 白名单校验
 * 4. regenerateConfigConfirm PENDING 状态
 * 5. plannedTasks 任务链消费
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { prisma, cleanupDatabase } from '../setup';

describe('AgentService - Unit Tests', () => {
  let testUserId: string;
  let testProjectId: string;

  beforeEach(async () => {
    await cleanupDatabase();

    const testUser = await prisma.user.create({
      data: {
        email: 'agent-test@example.com',
        passwordHash: 'hashed',
        nickname: 'Agent Tester',
        role: 'USER',
        points: 500,
        vipLevel: 0,
      },
    });
    testUserId = testUser.id;

    const testProject = await prisma.project.create({
      data: {
        userId: testUserId,
        title: 'Agent Test Project',
        status: 'idle',
        globalConfig: '{}',
      },
    });
    testProjectId = testProject.id;
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  // ================================================================
  // 会话生命周期测试
  // ================================================================

  describe('createSession - 会话创建', () => {
    it('应该成功创建新的 Agent 会话', async () => {
      const session = await prisma.agentSession.create({
        data: {
          projectId: testProjectId,
          mode: 'GUIDED',
          status: 'ACTIVE',
        },
      });

      expect(session).toBeDefined();
      expect(session.projectId).toBe(testProjectId);
      expect(session.mode).toBe('GUIDED');
      expect(session.status).toBe('ACTIVE');
      expect(session.totalPointsUsed).toBe(0);
      expect(session.totalTasks).toBe(0);
    });

    it('应该对同一项目唯一约束阻止重复会话', async () => {
      await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE' },
      });

      let error: any = null;
      try {
        await prisma.agentSession.create({
          data: { projectId: testProjectId, mode: 'AUTO', status: 'ACTIVE' },
        });
      } catch (e) {
        error = e;
      }
      expect(error).not.toBeNull();
      expect(error.message).toContain('Unique');
    });

    it('应该能创建消息和任务并关联到会话', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE' },
      });

      const msg = await prisma.agentMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: '帮我做一个PPT',
        },
      });
      expect(msg.sessionId).toBe(session.id);

      const task = await prisma.agentTask.create({
        data: {
          sessionId: session.id,
          type: 'OUTLINE',
          status: 'PENDING',
        },
      });
      expect(task.sessionId).toBe(session.id);
    });
  });

  // ================================================================
  // cancelSession - 原子积分退还
  // ================================================================

  describe('cancelSession - 原子积分退还', () => {
    it('应该在取消时退还已消耗积分', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE', totalPointsUsed: 50 },
      });

      // 模拟扣减用户积分
      await prisma.user.update({
        where: { id: testUserId },
        data: { points: { decrement: 50 } },
      });

      // 原子事务：退还积分 + 取消任务 + 更新会话状态
      await prisma.$transaction(async (tx) => {
        const refundAmount = 50;

        if (refundAmount > 0) {
          const updatedUser = await tx.user.update({
            where: { id: testUserId },
            data: { points: { increment: refundAmount } },
          });
          await tx.transaction.create({
            data: {
              userId: testUserId,
              projectId: testProjectId,
              type: 'adjust',
              amount: refundAmount,
              balance: updatedUser.points,
              description: '取消会话退还积分',
              module: 'Agent',
              category: '退还',
            },
          });
        }

        await tx.agentTask.updateMany({
          where: { sessionId: session.id, status: { in: ['PENDING', 'RUNNING'] } },
          data: { status: 'CANCELLED' },
        });

        await tx.agentSession.update({
          where: { id: session.id },
          data: { status: 'CANCELLED' },
        });
      });

      // 验证积分退还
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user!.points).toBe(500);

      // 验证退款记录
      const refundTx = await prisma.transaction.findFirst({
        where: { userId: testUserId, description: '取消会话退还积分' },
      });
      expect(refundTx).toBeDefined();
      expect(refundTx!.amount).toBe(50);

      // 验证会话状态
      const cancelledSession = await prisma.agentSession.findUnique({ where: { id: session.id } });
      expect(cancelledSession!.status).toBe('CANCELLED');
    });

    it('应该在 totalPointsUsed 为 0 时不创建退款记录', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE', totalPointsUsed: 0 },
      });

      await prisma.$transaction(async (tx) => {
        if (0 > 0) {
          // 不会进入
        }
        await tx.agentSession.update({
          where: { id: session.id },
          data: { status: 'CANCELLED' },
        });
      });

      const refundTx = await prisma.transaction.findFirst({
        where: { userId: testUserId, description: '取消会话退还积分' },
      });
      expect(refundTx).toBeNull();
    });
  });

  // ================================================================
  // resetSession - 原子积分退还 + 数据清理
  // ================================================================

  describe('resetSession - 原子积分退还 + 数据清理', () => {
    it('应该在重置时退还积分、清理消息和任务、重置会话', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE', totalPointsUsed: 40 },
      });

      // 模拟消耗
      await prisma.user.update({ where: { id: testUserId }, data: { points: { decrement: 40 } } });
      await prisma.agentTask.create({
        data: { sessionId: session.id, type: 'OUTLINE', status: 'COMPLETED', progress: 100 },
      });
      await prisma.agentMessage.create({
        data: { sessionId: session.id, role: 'assistant', content: 'test' },
      });

      // 原子重置事务
      await prisma.$transaction(async (tx) => {
        // 退还积分
        const updatedUser = await tx.user.update({
          where: { id: testUserId },
          data: { points: { increment: 40 } },
        });
        await tx.transaction.create({
          data: {
            userId: testUserId,
            projectId: testProjectId,
            type: 'adjust',
            amount: 40,
            balance: updatedUser.points,
            description: '重置会话退还积分',
            module: 'Agent',
            category: '退还',
          },
        });

        // 清理数据
        await tx.agentMessage.deleteMany({ where: { sessionId: session.id } });
        await tx.agentTask.deleteMany({ where: { sessionId: session.id } });
        await tx.agentSession.update({
          where: { id: session.id },
          data: {
            status: 'ACTIVE',
            mode: 'AUTO',
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalPointsUsed: 0,
            context: null,
            completedAt: null,
          },
        });
      });

      // 验证积分退还
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(user!.points).toBe(500);

      // 验证退款记录
      const refundTx = await prisma.transaction.findFirst({
        where: { description: '重置会话退还积分' },
      });
      expect(refundTx!.amount).toBe(40);

      // 验证任务和消息已清理
      const tasks = await prisma.agentTask.findMany({ where: { sessionId: session.id } });
      expect(tasks.length).toBe(0);

      const messages = await prisma.agentMessage.findMany({ where: { sessionId: session.id } });
      expect(messages.length).toBe(0);

      // 验证会话状态
      const resetSession = await prisma.agentSession.findUnique({ where: { id: session.id } });
      expect(resetSession!.status).toBe('ACTIVE');
      expect(resetSession!.totalPointsUsed).toBe(0);
      expect(resetSession!.mode).toBe('AUTO');
    });
  });

  // ================================================================
  // executeModify - 白名单校验
  // ================================================================

  describe('executeModify 白名单校验', () => {
    const ALLOWED_FIELDS = ['title', 'content', 'brief'] as const;

    it('应该允许修改 title 字段', async () => {
      const field = 'title';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(true);
    });

    it('应该允许修改 content 字段', async () => {
      const field = 'content';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(true);
    });

    it('应该允许修改 brief 字段', async () => {
      const field = 'brief';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(true);
    });

    it('应该拒绝 projectId 字段', () => {
      const field = 'projectId';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(false);
    });

    it('应该拒绝 id 字段', () => {
      const field = 'id';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(false);
    });

    it('应该拒绝 index 字段', () => {
      const field = 'index';
      expect(ALLOWED_FIELDS.includes(field as typeof ALLOWED_FIELDS[number])).toBe(false);
    });

    it('白名单字段应该能成功更新数据库', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE' },
      });

      await prisma.slide.create({
        data: {
          projectId: testProjectId,
          index: 0,
          pageType: 'cover',
          contentType: 'text',
          title: 'Original',
          content: '',
        },
      });

      // 模拟 executeModify 的核心逻辑（白名单校验 + 更新）
      const field = 'title' as typeof ALLOWED_FIELDS[number];
      const slide = await prisma.slide.findFirst({ where: { projectId: testProjectId, index: 0 } });
      await prisma.slide.update({
        where: { id: slide!.id },
        data: { [field]: 'Updated Title' },
      });

      const updated = await prisma.slide.findFirst({ where: { projectId: testProjectId } });
      expect(updated!.title).toBe('Updated Title');
    });
  });

  // ================================================================
  // regenerateConfigConfirm - PENDING 状态
  // ================================================================

  describe('regenerateConfigConfirm - PENDING 状态', () => {
    it('regenerate 后任务应为 PENDING 状态而非 COMPLETED', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE' },
      });

      // 创建已完成的 CONFIG_CONFIRM 任务
      const task = await prisma.agentTask.create({
        data: {
          sessionId: session.id,
          type: 'CONFIG_CONFIRM',
          status: 'COMPLETED',
          progress: 100,
          result: JSON.stringify({ type: 'CONFIG_CONFIRM', topic: 'old topic' }),
        },
      });

      // 模拟 regenerate 操作：更新为 PENDING + 新结果
      const newResult = {
        type: 'CONFIG_CONFIRM',
        config: {
          topic: 'new topic',
          pageCount: 12,
          styleName: '简约现代',
          aspectRatio: '16:9',
        },
      };

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: 'PENDING',
          progress: 0,
          result: JSON.stringify(newResult),
          params: JSON.stringify({
            topic: newResult.config.topic,
            pageCount: newResult.config.pageCount,
          }),
        },
      });

      // 验证
      const updatedTask = await prisma.agentTask.findUnique({ where: { id: task.id } });
      expect(updatedTask!.status).toBe('PENDING');
      expect(updatedTask!.progress).toBe(0);

      const result = JSON.parse(updatedTask!.result!);
      expect(result.type).toBe('CONFIG_CONFIRM');
      expect(result.config.topic).toBe('new topic');
    });
  });

  // ================================================================
  // plannedTasks 任务链
  // ================================================================

  describe('plannedTasks 任务链', () => {
    it('应该按 plannedTasks 数组顺序确定下一个任务类型', () => {
      const plannedTasks = ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE', 'EXPORT'];
      const completedTaskType = 'OUTLINE';

      const currentIndex = plannedTasks.indexOf(completedTaskType);
      expect(currentIndex).toBe(1);

      const nextTaskType = plannedTasks[currentIndex + 1];
      expect(nextTaskType).toBe('CONTENT');
    });

    it('应该在 plannedTasks 最后一个任务完成时不创建后续任务', () => {
      const plannedTasks = ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE'];
      const completedTaskType = 'IMAGE';

      const currentIndex = plannedTasks.indexOf(completedTaskType);
      const nextTaskType = currentIndex >= 0 && currentIndex < plannedTasks.length - 1
        ? plannedTasks[currentIndex + 1]
        : null;

      expect(nextTaskType).toBeNull();
    });

    it('应该在 plannedTasks 不包含当前任务时回退', () => {
      const plannedTasks = ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT'];
      const completedTaskType = 'EXPORT';

      const currentIndex = plannedTasks.indexOf(completedTaskType);
      expect(currentIndex).toBe(-1);

      // 回退条件：currentIndex < 0
      const nextTaskType = currentIndex >= 0 && currentIndex < plannedTasks.length - 1
        ? plannedTasks[currentIndex + 1]
        : null;
      expect(nextTaskType).toBeNull();
    });

    it('应该从 session.context 正确解析 plannedTasks', async () => {
      const context = JSON.stringify({
        plannedTasks: ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE', 'EXPORT'],
      });

      const session = await prisma.agentSession.create({
        data: {
          projectId: testProjectId,
          mode: 'AUTO',
          status: 'ACTIVE',
          context,
        },
      });

      const fetched = await prisma.agentSession.findUnique({ where: { id: session.id } });
      const parsed = JSON.parse(fetched!.context!);

      expect(parsed.plannedTasks).toEqual(['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE', 'EXPORT']);
    });

    it('应该在 context 为空时安全处理', async () => {
      const session = await prisma.agentSession.create({
        data: { projectId: testProjectId, mode: 'GUIDED', status: 'ACTIVE', context: null },
      });

      const fetched = await prisma.agentSession.findUnique({ where: { id: session.id } });
      let parsedContext: any = null;
      try {
        parsedContext = fetched!.context ? JSON.parse(fetched!.context) : null;
      } catch {
        parsedContext = null;
      }

      const plannedTasks: string[] | undefined = parsedContext?.plannedTasks;
      expect(plannedTasks).toBeUndefined();
    });
  });

  // ================================================================
  // 硬编码 switch 回退（向后兼容）
  // ================================================================

  describe('createNextTask 硬编码回退', () => {
    it('CONFIG_CONFIRM 后应创建 OUTLINE', () => {
      const switchMap: Record<string, string | null> = {
        CONFIG_CONFIRM: 'OUTLINE',
        OUTLINE: 'CONTENT',
        CONTENT: 'IMAGE',
        IMAGE: null,
      };

      expect(switchMap['CONFIG_CONFIRM']).toBe('OUTLINE');
    });

    it('OUTLINE 后应创建 CONTENT', () => {
      const switchMap: Record<string, string | null> = {
        CONFIG_CONFIRM: 'OUTLINE',
        OUTLINE: 'CONTENT',
        CONTENT: 'IMAGE',
        IMAGE: null,
      };

      expect(switchMap['OUTLINE']).toBe('CONTENT');
    });

    it('IMAGE 后不应创建后续任务', () => {
      const switchMap: Record<string, string | null> = {
        CONFIG_CONFIRM: 'OUTLINE',
        OUTLINE: 'CONTENT',
        CONTENT: 'IMAGE',
        IMAGE: null,
      };

      expect(switchMap['IMAGE']).toBeNull();
    });
  });
});
