/**
 * 完整修正历史库数据
 * 1. 有图片的幻灯片 → status = success
 * 2. 全部有图片的项目 → status = completed, completedAt = now
 * 3. 其他项目 → 清除 completedAt，status = generating
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fullFix() {
  console.log('='.repeat(80));
  console.log('完整修正历史库数据');
  console.log('='.repeat(80));

  // 获取所有项目
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

  const trulyCompleted = [];  // 全部幻灯片都有图片
  const partiallyComplete = [];  // 部分有图片
  const noImages = [];  // 完全没图片

  for (const project of projects) {
    const totalSlides = project.Slide.length;

    // 检查每个幻灯片是否有图片
    const slidesWithImages = project.Slide.filter(s => {
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => typeof v === 'string' && v.startsWith('http'));
      } catch {
        return false;
      }
    });

    if (totalSlides > 0 && slidesWithImages.length === totalSlides) {
      trulyCompleted.push({ ...project, slidesWithImages: slidesWithImages.length });
    } else if (slidesWithImages.length > 0) {
      partiallyComplete.push({ ...project, slidesWithImages: slidesWithImages.length });
    } else if (totalSlides > 0) {
      noImages.push({ ...project, slidesWithImages: 0 });
    }
  }

  console.log('\\n分类结果:');
  console.log('真正完成(全部有图):', trulyCompleted.length);
  console.log('部分有图片:', partiallyComplete.length);
  console.log('无图片:', noImages.length);

  // 1. 真正完成的项目：设置 status = completed, completedAt
  console.log('\\n' + '='.repeat(80));
  console.log('处理真正完成的项目');
  console.log('='.repeat(80));

  for (const project of trulyCompleted) {
    // 更新项目状态
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        completedAt: project.completedAt || new Date()
      }
    });

    // 确保所有幻灯片状态是 success
    for (const slide of project.Slide) {
      if (slide.status !== 'success' && slide.status !== 'completed') {
        await prisma.slide.update({
          where: { id: slide.id },
          data: { status: 'success' }
        });
      }
    }

    console.log('✅ ' + project.title + ' (' + project.source + ')');
  }

  // 2. 部分有图片的项目：保持 generating 状态
  console.log('\\n' + '='.repeat(80));
  console.log('处理部分有图片的项目');
  console.log('='.repeat(80));

  for (const project of partiallyComplete) {
    // 有图片的幻灯片设为 success
    for (const slide of project.Slide) {
      const hasImage = slide.previewUrl || (() => {
        try {
          const variants = JSON.parse(slide.variants || '[]');
          return variants.some(v => typeof v === 'string' && v.startsWith('http'));
        } catch {
          return false;
        }
      })();

      if (hasImage && slide.status !== 'success' && slide.status !== 'completed') {
        await prisma.slide.update({
          where: { id: slide.id },
          data: { status: 'success' }
        });
      } else if (!hasImage && (slide.status === 'success' || slide.status === 'completed')) {
        await prisma.slide.update({
          where: { id: slide.id },
          data: { status: 'idle' }
        });
      }
    }

    // 项目保持 generating，清除 completedAt
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'generating',
        completedAt: null
      }
    });

    console.log('⚠️ ' + project.title + ' (' + project.slidesWithImages + '/' + project.Slide.length + ' 有图)');
  }

  // 3. 无图片的项目：清除 completedAt
  console.log('\\n' + '='.repeat(80));
  console.log('处理无图片的项目');
  console.log('='.repeat(80));

  for (const project of noImages) {
    // 清除幻灯片 success/completed 状态
    for (const slide of project.Slide) {
      if (slide.status === 'success' || slide.status === 'completed') {
        await prisma.slide.update({
          where: { id: slide.id },
          data: { status: 'idle' }
        });
      }
    }

    // 清除 completedAt
    if (project.completedAt) {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'generating',
          completedAt: null
        }
      });
      console.log('❌ ' + project.title + ' (已清除 completedAt)');
    }
  }

  // 验证最终结果
  console.log('\\n' + '='.repeat(80));
  console.log('验证最终结果');
  console.log('='.repeat(80));

  const finalProjects = await prisma.project.findMany({
    where: { isDeleted: false, completedAt: { not: null } },
    select: {
      id: true,
      title: true,
      source: true,
      Slide: {
        select: {
          previewUrl: true,
          variants: true,
          status: true
        }
      }
    }
  });

  console.log('历史库项目数:', finalProjects.length);

  // 验证每个项目
  const valid = [];
  const invalid = [];

  for (const p of finalProjects) {
    const allHaveImages = p.Slide.every(s => {
      if (s.previewUrl) return true;
      try {
        const variants = JSON.parse(s.variants || '[]');
        return variants.some(v => typeof v === 'string' && v.startsWith('http'));
      } catch {
        return false;
      }
    });

    if (allHaveImages && p.Slide.length > 0) {
      valid.push(p);
    } else {
      invalid.push(p);
    }
  }

  console.log('有效(全部有图):', valid.length);
  console.log('无效:', invalid.length);

  // 按 source 统计
  const ideHistory = valid.filter(p => p.source === 'IDE').length;
  const agentHistory = valid.filter(p => p.source === 'AGENT').length;

  console.log('\\n最终历史库统计:');
  console.log('IDE模式:', ideHistory);
  console.log('Agent模式:', agentHistory);
}

fullFix()
  .then(() => {
    console.log('\\n执行完成');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });