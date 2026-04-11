/**
 * 修正Agent项目状态 - 无图片的项目不能标记为completed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAgentProjectStatus() {
  console.log('='.repeat(60));
  console.log('修正Agent项目状态（无图片=未完成）');
  console.log('='.repeat(60));

  // 获取所有Agent项目
  const agentProjects = await prisma.project.findMany({
    where: { source: 'AGENT', isDeleted: false },
    include: {
      Slide: { select: { id: true, previewUrl: true, variants: true } },
      AgentSession: true
    }
  });

  console.log(`\n找到 ${agentProjects.length} 个Agent项目\n`);

  let fixedCount = 0;

  for (const project of agentProjects) {
    // 检查是否有图片
    const hasImages = project.Slide.some(s => {
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => v.imageUrl || v.previewUrl);
      } catch {
        return false;
      }
    });

    if (!hasImages) {
      // 无图片：将状态改为generating，清除completedAt
      console.log(`修正: ${project.title}`);
      console.log(`  - 项目状态: ${project.status} → generating`);
      console.log(`  - completedAt: ${project.completedAt ? '有' : '无'} → 清除`);

      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'generating',
          completedAt: null
        }
      });

      // 更新Session状态
      if (project.AgentSession) {
        await prisma.agentSession.update({
          where: { id: project.AgentSession.id },
          data: {
            status: 'ACTIVE',
            completedAt: null
          }
        });
        console.log(`  - Session状态: COMPLETED → ACTIVE`);
      }

      fixedCount++;
      console.log('');
    } else {
      console.log(`✅ 跳过（有图片）: ${project.title}\n`);
    }
  }

  console.log('='.repeat(60));
  console.log(`修正完成！共修正 ${fixedCount} 个项目`);
  console.log('='.repeat(60));
}

fixAgentProjectStatus()
  .then(() => {
    console.log('\n执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });