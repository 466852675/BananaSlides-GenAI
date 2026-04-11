/**
 * 为有图片的项目补充 completedAt，使其进入历史库
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addCompletedAtForImageProjects() {
  console.log('='.repeat(80));
  console.log('为有图片的项目补充 completedAt');
  console.log('='.repeat(80));

  // 查询所有有图片但没有 completedAt 的项目
  const allProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      completedAt: null
    },
    select: {
      id: true,
      title: true,
      source: true,
      status: true,
      Slide: {
        select: {
          id: true,
          previewUrl: true,
          variants: true
        }
      }
    }
  });

  const projectsWithImages = [];

  for (const project of allProjects) {
    const hasImages = project.Slide.some(s => {
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => v.imageUrl || v.previewUrl);
      } catch {
        return false;
      }
    });

    if (hasImages) {
      projectsWithImages.push({
        id: project.id,
        title: project.title,
        source: project.source,
        status: project.status,
        slideCount: project.Slide.length
      });
    }
  }

  console.log(`\n找到 ${projectsWithImages.length} 个有图片但未进入历史库的项目:\n`);

  projectsWithImages.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title} (${p.source})`);
    console.log(`      ID: ${p.id}`);
    console.log(`      幻灯片: ${p.slideCount} 页`);
  });

  // 为这些项目设置 completedAt
  if (projectsWithImages.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('开始补充 completedAt...');
    console.log('='.repeat(80));

    for (const project of projectsWithImages) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'completed',
          completedAt: new Date()
        }
      });
      console.log(`\n✅ ${project.title} → 已设置 completedAt`);
    }
  }

  // 验证最终结果
  const finalHistory = await prisma.project.findMany({
    where: {
      isDeleted: false,
      completedAt: { not: null }
    },
    select: {
      id: true,
      title: true,
      source: true,
      Slide: {
        select: {
          previewUrl: true,
          variants: true
        }
      }
    }
  });

  console.log('\n\n' + '='.repeat(80));
  console.log('最终历史库状态');
  console.log('='.repeat(80));

  const ideHistory = finalHistory.filter(p => p.source === 'IDE');
  const agentHistory = finalHistory.filter(p => p.source === 'AGENT');

  // 验证所有历史库项目都有图片
  let allHaveImages = true;
  for (const project of finalHistory) {
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
      allHaveImages = false;
      console.log(`⚠️ 警告: ${project.title} 无图片但仍在历史库`);
    }
  }

  console.log(`\nIDE模式历史库: ${ideHistory.length} 个`);
  console.log(`Agent模式历史库: ${agentHistory.length} 个`);
  console.log(`总计: ${finalHistory.length} 个`);
  console.log(`所有项目都有图片: ${allHaveImages ? '✅' : '⚠️'}`);
}

addCompletedAtForImageProjects()
  .then(() => {
    console.log('\n执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });