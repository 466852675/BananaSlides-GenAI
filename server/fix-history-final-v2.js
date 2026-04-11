/**
 * 修正历史库 - 移除无图片的项目
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHistory() {
  console.log('='.repeat(80));
  console.log('修正历史库');
  console.log('='.repeat(80));

  // 获取所有历史库项目
  const historyProjects = await prisma.project.findMany({
    where: { isDeleted: false, completedAt: { not: null } },
    select: {
      id: true,
      title: true,
      source: true,
      completedAt: true,
      Slide: {
        select: {
          id: true,
          previewUrl: true,
          variants: true
        }
      }
    }
  });

  console.log('当前历史库项目:', historyProjects.length);

  const toRemove = [];

  for (const p of historyProjects) {
    // 检查是否有图片
    const withImg = p.Slide.filter(s => {
      if (s.previewUrl && (s.previewUrl.startsWith('http') || s.previewUrl.startsWith('/uploads'))) {
        return true;
      }
      if (s.variants) {
        try {
          const v = JSON.parse(s.variants);
          if (Array.isArray(v) && v.some(x => {
            if (typeof x === 'string' && (x.startsWith('http') || x.startsWith('/uploads'))) return true;
            if (x && typeof x === 'object' && (x.imageUrl || x.previewUrl)) return true;
            return false;
          })) {
            return true;
          }
        } catch {}
      }
      return false;
    });

    console.log(p.title + ': ' + withImg.length + '/' + p.Slide.length + '张有图');

    if (withImg.length === 0) {
      toRemove.push(p);
    }
  }

  console.log('\n需要移出的项目:', toRemove.length);

  for (const p of toRemove) {
    await prisma.project.update({
      where: { id: p.id },
      data: {
        status: 'generating',
        completedAt: null
      }
    });

    // 幻灯片状态改为 idle
    await prisma.slide.updateMany({
      where: { projectId: p.id },
      data: { status: 'idle' }
    });

    console.log('❌ 已移出:', p.title);
  }

  // 验证最终结果
  const finalHistory = await prisma.project.findMany({
    where: { isDeleted: false, completedAt: { not: null } },
    select: {
      id: true,
      title: true,
      source: true,
      Slide: {
        select: { previewUrl: true, variants: true }
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('最终历史库');
  console.log('='.repeat(80));

  const ideHistory = finalHistory.filter(p => p.source === 'IDE');
  const agentHistory = finalHistory.filter(p => p.source === 'AGENT');

  console.log('IDE历史库:', ideHistory.length);
  console.log('Agent历史库:', agentHistory.length);

  console.log('\nIDE历史库项目:');
  ideHistory.forEach((p, i) => {
    const imgCount = p.Slide.filter(s => s.previewUrl || (s.variants && JSON.parse(s.variants || '[]').length > 0)).length;
    console.log('  [' + (i+1) + '] ' + p.title + ' (' + imgCount + '/' + p.Slide.length + '张)');
  });

  console.log('\nAgent历史库项目:');
  agentHistory.forEach((p, i) => {
    const imgCount = p.Slide.filter(s => s.previewUrl || (s.variants && JSON.parse(s.variants || '[]').length > 0)).length;
    console.log('  [' + (i+1) + '] ' + p.title + ' (' + imgCount + '/' + p.Slide.length + '张)');
  });
}

fixHistory().then(() => {
  console.log('\n完成');
  process.exit(0);
});