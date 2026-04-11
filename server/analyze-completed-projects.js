/**
 * 分析真正完成的项目（含图片生成）
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeCompletedProjects() {
  console.log('='.repeat(80));
  console.log('分析真正完成的项目（含图片生成）');
  console.log('='.repeat(80));

  // 查询所有项目
  const allProjects = await prisma.project.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      title: true,
      displayId: true,
      status: true,
      source: true,
      completedAt: true,
      _count: {
        select: { Slide: true }
      },
      Slide: {
        select: {
          id: true,
          pageType: true,
          previewUrl: true,
          variants: true
        }
      },
      AgentSession: {
        select: {
          id: true,
          status: true,
          AgentTask: {
            where: { type: { in: ['IMAGE', 'BATCH_IMAGE'] } },
            select: {
              id: true,
              type: true,
              status: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n总项目数: ${allProjects.length}\n`);

  const trulyCompleted = [];
  const incomplete = [];

  for (const project of allProjects) {
    // 检查是否有图片
    const hasImages = project.Slide.some(s => {
      // 检查previewUrl或variants中是否有图片
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => v.imageUrl || v.previewUrl);
      } catch {
        return false;
      }
    });

    // 检查Agent项目的图片任务是否完成
    const agentSession = project.AgentSession;
    let imageTasksCompleted = true;
    let hasImageTasks = false;

    if (agentSession) {
      const imageTasks = agentSession.AgentTask.filter(
        t => t.type === 'IMAGE' || t.type === 'BATCH_IMAGE'
      );
      hasImageTasks = imageTasks.length > 0;
      if (hasImageTasks) {
        imageTasksCompleted = imageTasks.every(t => t.status === 'COMPLETED');
      }
    }

    // 判断是否真正完成
    const isTrulyCompleted = hasImages &&
      (!agentSession || imageTasksCompleted) &&
      project._count.Slide > 0;

    if (isTrulyCompleted) {
      trulyCompleted.push({
        id: project.id,
        title: project.title,
        displayId: project.displayId,
        source: project.source,
        slideCount: project._count.Slide,
        hasImages: true,
        completedAt: project.completedAt
      });
    } else {
      incomplete.push({
        id: project.id,
        title: project.title,
        displayId: project.displayId,
        source: project.source,
        slideCount: project._count.Slide,
        hasImages,
        status: project.status,
        hasImageTasks,
        imageTasksCompleted,
        completedAt: project.completedAt
      });
    }
  }

  console.log('✅ 真正完成的项目（有图片）:');
  console.log('-'.repeat(60));
  trulyCompleted.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title}`);
    console.log(`      ID: ${p.id}`);
    console.log(`      来源: ${p.source}`);
    console.log(`      幻灯片: ${p.slideCount} 页`);
    console.log(`      完成时间: ${p.completedAt ? new Date(p.completedAt).toLocaleString('zh-CN') : '无'}`);
  });

  console.log(`\n\n⚠️ 未完成或缺少图片的项目:`);
  console.log('-'.repeat(60));
  incomplete.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title}`);
    console.log(`      ID: ${p.id}`);
    console.log(`      来源: ${p.source}`);
    console.log(`      幻灯片: ${p.slideCount} 页`);
    console.log(`      有图片: ${p.hasImages ? '是' : '否'}`);
    console.log(`      当前状态: ${p.status}`);
    if (p.source === 'AGENT') {
      console.log(`      图片任务: ${p.hasImageTasks ? (p.imageTasksCompleted ? '已完成' : '未完成') : '无'}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log(`总结:`);
  console.log(`  真正完成（应进历史库）: ${trulyCompleted.length}`);
  console.log(`  未完成/缺图片: ${incomplete.length}`);
  console.log('='.repeat(80));

  return { trulyCompleted, incomplete };
}

analyzeCompletedProjects()
  .then(({ trulyCompleted, incomplete }) => {
    process.exit(0);
  })
  .catch(err => {
    console.error('分析失败:', err);
    process.exit(1);
  });