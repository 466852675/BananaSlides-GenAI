/**
 * 修正历史库数据
 * 1. 清除无图片项目的 completedAt
 * 2. 确保幻灯片状态正确
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHistoryLibrary() {
  console.log('='.repeat(80));
  console.log('修正历史库数据');
  console.log('='.repeat(80));

  // 获取所有非删除项目
  const projects = await prisma.project.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      title: true,
      source: true,
      status: true,
      completedAt: true,
      Slide: {
        select: {
          id: true,
          status: true,
          previewUrl: true,
          variants: true
        }
      }
    }
  });

  const toRemove = [];  // 需要移出历史库
  const toKeep = [];    // 保留在历史库

  for (const project of projects) {
    const hasImages = project.Slide.some(s => {
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => {
          if (typeof v === 'string' && v.startsWith('http')) return true;
          if (v.imageUrl || v.previewUrl) return true;
          return false;
        });
      } catch {
        return false;
      }
    });

    if (project.completedAt) {
      if (hasImages) {
        toKeep.push(project);
      } else {
        toRemove.push(project);
      }
    }
  }

  console.log('\n需要移出历史库的项目:', toRemove.length);
  toRemove.forEach((p, i) => {
    console.log(`  [${i+1}] ${p.title} (${p.source})`);
  });

  console.log('\n保留在历史库的项目:', toKeep.length);
  toKeep.forEach((p, i) => {
    console.log(`  [${i+1}] ${p.title} (${p.source})`);
  });

  // 执行修正
  for (const project of toRemove) {
    // 清除 completedAt，将状态改为 generating
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'generating',
        completedAt: null
      }
    });

    // 将所有 success/completed 状态的幻灯片改为 idle
    for (const slide of project.Slide) {
      if (slide.status === 'success' || slide.status === 'completed') {
        await prisma.slide.update({
          where: { id: slide.id },
          data: { status: 'idle' }
        });
      }
    }

    console.log(`\n✅ 已修正: ${project.title}`);
  }

  // 验证结果
  const afterFix = await prisma.project.findMany({
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

  // 验证所有历史库项目都有图片
  const invalid = afterFix.filter(p => !p.Slide.some(s => {
    if (s.previewUrl) return true;
    try {
      const variants = JSON.parse(s.variants || '[]');
      return variants.some(v => typeof v === 'string' && v.startsWith('http'));
    } catch {
      return false;
    }
  }));

  console.log('\n' + '='.repeat(80));
  console.log('修正完成');
  console.log('='.repeat(80));
  console.log('历史库项目数:', afterFix.length);
  console.log('IDE模式:', afterFix.filter(p => p.source === 'IDE').length);
  console.log('Agent模式:', afterFix.filter(p => p.source === 'AGENT').length);
  console.log('无效项目:', invalid.length);
}

fixHistoryLibrary()
  .then(() => {
    console.log('\n执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });