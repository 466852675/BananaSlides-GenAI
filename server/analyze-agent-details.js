/**
 * 详细分析Agent项目的幻灯片和消息内容
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedAnalysis() {
  console.log('='.repeat(80));
  console.log('Agent项目详细分析报告');
  console.log('='.repeat(80));

  // 查询所有Agent项目及其详细数据
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
      _count: {
        select: { Slide: true }
      },
      Slide: {
        select: {
          id: true,
          pageType: true,
          title: true,
          content: true,
          variantCount: true
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
          AgentMessage: {
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true
            },
            orderBy: { createdAt: 'asc' }
          },
          AgentTask: {
            select: {
              id: true,
              type: true,
              status: true,
              progress: true,
              result: true,
              error: true
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n📊 Agent项目总数: ${agentProjects.length}\n`);

  // 分析每个项目
  for (const project of agentProjects) {
    console.log('\n' + '='.repeat(80));
    console.log(`项目: ${project.title || '未命名'}`);
    console.log(`ID: ${project.id}`);
    console.log(`DisplayID: ${project.displayId || '无'}`);
    console.log(`项目状态: ${project.status}`);
    console.log(`创建时间: ${new Date(project.createdAt).toLocaleString('zh-CN')}`);
    console.log(`幻灯片数: ${project._count.Slide}`);
    console.log('-'.repeat(40));

    const session = project.AgentSession;

    if (session) {
      console.log(`\n📋 Session信息:`);
      console.log(`   状态: ${session.status}`);
      console.log(`   模式: ${session.mode}`);
      console.log(`   任务: ${session.completedTasks}/${session.totalTasks} 完成`);
      console.log(`   积分: ${session.totalPointsUsed}`);

      // 消息分析
      console.log(`\n💬 消息列表 (${session.AgentMessage.length}条):`);
      session.AgentMessage.forEach((msg, idx) => {
        const contentPreview = msg.content ?
          (msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content) :
          '(空内容)';
        console.log(`   [${idx + 1}] ${msg.role}: ${contentPreview}`);
      });

      // 任务分析
      console.log(`\n📝 任务列表 (${session.AgentTask.length}个):`);
      session.AgentTask.forEach((task, idx) => {
        console.log(`   [${idx + 1}] ${task.type} - ${task.status} (${task.progress}%)`);
        if (task.error) {
          console.log(`       错误: ${task.error}`);
        }
      });

      // 幻灯片分析
      if (project.Slide && project.Slide.length > 0) {
        console.log(`\n🎞️ 幻灯片内容:`);
        project.Slide.forEach((slide, idx) => {
          const hasContent = slide.content && slide.content.trim().length > 10;
          const variantCount = slide.variantCount || 0;
          console.log(`   [${idx + 1}] ${slide.pageType || '未定义'}: ${slide.title || '(无标题)'}`);
          console.log(`       有内容: ${hasContent ? '✅' : '❌'} | 变体数: ${variantCount}`);
        });
      } else {
        console.log(`\n🎞️ 幻灯片: 无`);
      }

      // 判断项目完整性
      const hasUserMessage = session.AgentMessage.some(m => m.role === 'user');
      const hasAssistantMessage = session.AgentMessage.some(m => m.role === 'assistant');
      const hasCompletedTask = session.AgentTask.some(t => t.status === 'COMPLETED');
      const hasSlides = project._count.Slide > 0;
      const hasSlideContent = project.Slide?.some(s => s.content && s.content.trim().length > 10);

      console.log(`\n🔍 完整性检查:`);
      console.log(`   用户消息: ${hasUserMessage ? '✅' : '❌'}`);
      console.log(`   AI回复: ${hasAssistantMessage ? '✅' : '❌'}`);
      console.log(`   已完成任务: ${hasCompletedTask ? '✅' : '❌'}`);
      console.log(`   有幻灯片: ${hasSlides ? '✅' : '❌'}`);
      console.log(`   幻灯片有内容: ${hasSlideContent ? '✅' : '❌'}`);

      const isComplete = hasUserMessage && hasAssistantMessage && hasSlides && hasSlideContent;
      console.log(`\n   📌 演示就绪: ${isComplete ? '✅ 可用于演示' : '⚠️ 需要补充数据'}`);

    } else {
      console.log(`\n⚠️ 无Session数据`);
    }
  }

  // 总结
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 总结');
  console.log('='.repeat(80));

  const summary = {
    total: agentProjects.length,
    readyForDemo: 0,
    needsData: 0,
    noSlides: 0,
    noContent: 0,
    noConversation: 0
  };

  for (const project of agentProjects) {
    const session = project.AgentSession;
    if (!session) {
      summary.needsData++;
      summary.noConversation++;
      continue;
    }

    const hasUserMessage = session.AgentMessage.some(m => m.role === 'user');
    const hasAssistantMessage = session.AgentMessage.some(m => m.role === 'assistant');
    const hasSlides = project._count.Slide > 0;
    const hasSlideContent = project.Slide?.some(s => s.content && s.content.trim().length > 10);

    if (hasUserMessage && hasAssistantMessage && hasSlides && hasSlideContent) {
      summary.readyForDemo++;
    } else {
      summary.needsData++;
      if (!hasSlides) summary.noSlides++;
      if (!hasSlideContent) summary.noContent++;
      if (!hasUserMessage || !hasAssistantMessage) summary.noConversation++;
    }
  }

  console.log(`\n总项目数: ${summary.total}`);
  console.log(`✅ 演示就绪: ${summary.readyForDemo}`);
  console.log(`⚠️ 需要补充数据: ${summary.needsData}`);
  console.log(`   - 无幻灯片: ${summary.noSlides}`);
  console.log(`   - 无幻灯片内容: ${summary.noContent}`);
  console.log(`   - 无完整对话: ${summary.noConversation}`);
}

detailedAnalysis()
  .then(() => {
    console.log('\n分析完成!');
    process.exit(0);
  })
  .catch(err => {
    console.error('分析失败:', err);
    process.exit(1);
  });