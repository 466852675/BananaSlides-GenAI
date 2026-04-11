/**
 * 分析Agent项目数据完整性
 * 用于识别没有对话过程的Agent项目
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAgentProjects() {
  console.log('='.repeat(60));
  console.log('Agent项目数据完整性分析报告');
  console.log('生成时间:', new Date().toLocaleString('zh-CN'));
  console.log('='.repeat(60));

  // 1. 查询所有Agent模式的项目
  const agentProjects = await prisma.project.findMany({
    where: {
      source: 'AGENT',
      isDeleted: false
    },
    select: {
      id: true,
      title: true,
      displayId: true,
      status: true,
      createdAt: true,
      completedAt: true,
      _count: {
        select: { Slide: true }
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
          completedAt: true,
          _count: {
            select: {
              AgentMessage: true,
              AgentTask: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 Agent项目总数: ${agentProjects.length}`);

  // 2. 分类统计
  const stats = {
    total: agentProjects.length,
    withSession: 0,
    withoutSession: 0,
    withMessages: 0,
    withoutMessages: 0,
    withTasks: 0,
    withoutTasks: 0,
    completed: 0,
    incomplete: 0
  };

  const projectsWithoutConversation = [];
  const projectsWithConversation = [];

  for (const project of agentProjects) {
    const session = project.AgentSession;

    if (session) {
      stats.withSession++;

      const messageCount = session._count.AgentMessage;
      const taskCount = session._count.AgentTask;

      if (messageCount >= 2) stats.withMessages++;
      else stats.withoutMessages++;

      if (taskCount > 0) stats.withTasks++;
      else stats.withoutTasks++;

      if (session.status === 'COMPLETED') stats.completed++;
      else stats.incomplete++;

      // 判断是否有对话过程
      const hasConversation = messageCount >= 2 || (taskCount > 0 && session.completedTasks > 0);

      const projectInfo = {
        id: project.id,
        title: project.title,
        displayId: project.displayId,
        projectStatus: project.status,
        slideCount: project._count.Slide,
        sessionStatus: session.status,
        mode: session.mode,
        messageCount,
        taskCount,
        totalTasks: session.totalTasks,
        completedTasks: session.completedTasks,
        failedTasks: session.failedTasks,
        totalPointsUsed: session.totalPointsUsed,
        createdAt: project.createdAt,
        completedAt: session.completedAt
      };

      if (hasConversation) {
        projectsWithConversation.push(projectInfo);
      } else {
        projectsWithoutConversation.push(projectInfo);
      }
    } else {
      stats.withoutSession++;
      projectsWithoutConversation.push({
        id: project.id,
        title: project.title,
        displayId: project.displayId,
        projectStatus: project.status,
        slideCount: project._count.Slide,
        sessionStatus: 'NO_SESSION',
        messageCount: 0,
        taskCount: 0,
        createdAt: project.createdAt
      });
    }
  }

  // 3. 输出统计
  console.log('\n📈 统计数据:');
  console.log(`  ├─ 有Session: ${stats.withSession}`);
  console.log(`  ├─ 无Session: ${stats.withoutSession}`);
  console.log(`  ├─ 有消息(≥2条): ${stats.withMessages}`);
  console.log(`  ├─ 无消息(<2条): ${stats.withoutMessages}`);
  console.log(`  ├─ 有任务: ${stats.withTasks}`);
  console.log(`  ├─ 无任务: ${stats.withoutTasks}`);
  console.log(`  ├─ 已完成: ${stats.completed}`);
  console.log(`  └─ 未完成: ${stats.incomplete}`);

  // 4. 列出没有对话过程的项目
  console.log('\n❌ 没有对话过程的项目 (需要模拟数据):');
  console.log('-'.repeat(60));

  if (projectsWithoutConversation.length === 0) {
    console.log('  ✅ 所有Agent项目都有完整的对话数据!');
  } else {
    projectsWithoutConversation.forEach((p, idx) => {
      console.log(`\n  [${idx + 1}] ${p.title || '未命名项目'}`);
      console.log(`      ID: ${p.id}`);
      console.log(`      DisplayID: ${p.displayId || '无'}`);
      console.log(`      项目状态: ${p.projectStatus}`);
      console.log(`      幻灯片数: ${p.slideCount}`);
      console.log(`      Session状态: ${p.sessionStatus}`);
      console.log(`      消息数: ${p.messageCount}`);
      console.log(`      任务数: ${p.taskCount}`);
      if (p.totalTasks !== undefined) {
        console.log(`      任务完成: ${p.completedTasks}/${p.totalTasks}`);
      }
      console.log(`      创建时间: ${new Date(p.createdAt).toLocaleString('zh-CN')}`);
    });
  }

  // 5. 列出有对话过程的项目（作为参考）
  console.log('\n\n✅ 有完整对话过程的项目 (可参考):');
  console.log('-'.repeat(60));

  projectsWithConversation.slice(0, 5).forEach((p, idx) => {
    console.log(`\n  [${idx + 1}] ${p.title || '未命名项目'}`);
    console.log(`      ID: ${p.id}`);
    console.log(`      消息数: ${p.messageCount}`);
    console.log(`      任务完成: ${p.completedTasks}/${p.totalTasks}`);
    console.log(`      积分消耗: ${p.totalPointsUsed}`);
    console.log(`      Session状态: ${p.sessionStatus}`);
  });

  // 6. 生成数据模拟建议
  console.log('\n\n📝 数据模拟建议:');
  console.log('-'.repeat(60));

  if (projectsWithoutConversation.length > 0) {
    console.log('\n为以下项目需要生成模拟数据:');
    projectsWithoutConversation.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.title || p.id}`);
      console.log(`     - 需要: AgentSession + AgentMessage(≥2) + AgentTask`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('分析完成!');

  return {
    stats,
    projectsWithoutConversation,
    projectsWithConversation
  };
}

// 执行分析
analyzeAgentProjects()
  .then(result => {
    process.exit(0);
  })
  .catch(err => {
    console.error('分析失败:', err);
    process.exit(1);
  });