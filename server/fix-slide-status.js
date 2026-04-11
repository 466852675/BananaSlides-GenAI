/**
 * 修正幻灯片状态
 * 无图片的幻灯片不应该有 success/completed 状态
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSlideStatus() {
  console.log('='.repeat(80));
  console.log('修正幻灯片状态');
  console.log('='.repeat(80));

  // 查询所有 success/completed 状态的幻灯片
  const slides = await prisma.slide.findMany({
    where: {
      OR: [
        { status: 'success' },
        { status: 'completed' }
      ]
    },
    select: {
      id: true,
      status: true,
      previewUrl: true,
      variants: true,
      projectId: true
    }
  });

  console.log('success/completed 状态幻灯片:', slides.length);

  // 找出无图片的幻灯片
  const noImageSlides = slides.filter(s => {
    if (s.previewUrl) return false;
    try {
      const variants = JSON.parse(s.variants || '[]');
      return !variants.some(v => {
        if (typeof v === 'string' && v.startsWith('http')) return true;
        if (v.imageUrl || v.previewUrl) return true;
        return false;
      });
    } catch {
      return true;
    }
  });

  console.log('无图片的幻灯片:', noImageSlides.length);

  // 批量更新
  if (noImageSlides.length > 0) {
    const ids = noImageSlides.map(s => s.id);
    const result = await prisma.slide.updateMany({
      where: { id: { in: ids } },
      data: { status: 'idle' }
    });
    console.log('已修正:', result.count, '个幻灯片状态改为 idle');
  }

  // 按项目分组查看影响
  const projectGroups = {};
  noImageSlides.forEach(s => {
    if (!projectGroups[s.projectId]) projectGroups[s.projectId] = 0;
    projectGroups[s.projectId]++;
  });

  console.log('\n受影响的项目数:', Object.keys(projectGroups).length);
}

fixSlideStatus()
  .then(() => {
    console.log('\n执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });