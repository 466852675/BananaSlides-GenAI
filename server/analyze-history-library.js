/**
 * 分析历史库项目分布
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeHistoryLibrary() {
  console.log('='.repeat(80));
  console.log('历史库项目分析');
  console.log('='.repeat(80));

  // 历史库条件：completedAt 不为空
  const historyProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      completedAt: { not: null }
    },
    select: {
      id: true,
      title: true,
      displayId: true,
      status: true,
      source: true,
      completedAt: true,
      _count: { select: { Slide: true } },
      Slide: {
        select: {
          id: true,
          previewUrl: true,
          variants: true
        }
      }
    },
    orderBy: { completedAt: 'desc' }
  });

  console.log(`\n历史库总项目数: ${historyProjects.length}\n`);

  const ideProjects = [];
  const agentProjects = [];
  const noImageProjects = [];

  for (const project of historyProjects) {
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

    const projectInfo = {
      id: project.id,
      title: project.title,
      displayId: project.displayId,
      slideCount: project._count.Slide,
      hasImages,
      completedAt: new Date(project.completedAt).toLocaleString('zh-CN')
    };

    if (project.source === 'IDE') {
      ideProjects.push({ ...projectInfo, status: project.status });
    } else {
      agentProjects.push({ ...projectInfo, status: project.status });
    }

    if (!hasImages) {
      noImageProjects.push({ ...projectInfo, source: project.source });
    }
  }

  console.log('📊 IDE模式历史库项目:');
  console.log('-'.repeat(60));
  ideProjects.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title}`);
    console.log(`      幻灯片: ${p.slideCount} | 有图片: ${p.hasImages ? '✅' : '❌'}`);
  });

  console.log(`\n\n📊 Agent模式历史库项目:`);
  console.log('-'.repeat(60));
  agentProjects.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title}`);
    console.log(`      幻灯片: ${p.slideCount} | 有图片: ${p.hasImages ? '✅' : '❌'}`);
  });

  console.log(`\n\n⚠️ 无图片但仍在历史库中的项目:`);
  console.log('-'.repeat(60));
  noImageProjects.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title} (${p.source})`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('总结:');
  console.log(`  IDE模式历史库: ${ideProjects.length} 个`);
  console.log(`  Agent模式历史库: ${agentProjects.length} 个`);
  console.log(`  无图片应移除: ${noImageProjects.length} 个`);
  console.log('='.repeat(80));
}

analyzeHistoryLibrary()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('失败:', err);
    process.exit(1);
  });