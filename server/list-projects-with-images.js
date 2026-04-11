/**
 * 查找所有有图片的项目
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findProjectsWithImages() {
  console.log('='.repeat(80));
  console.log('查找所有有图片的项目');
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
          index: true,
          previewUrl: true,
          variants: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const results = [];

  for (const p of projects) {
    if (p.Slide.length === 0) continue;

    // 检查每张幻灯片
    let imgCount = 0;
    for (const s of p.Slide) {
      let hasImg = false;

      // 检查 previewUrl
      if (s.previewUrl && (s.previewUrl.startsWith('http') || s.previewUrl.startsWith('/uploads'))) {
        hasImg = true;
      }

      // 检查 variants
      if (!hasImg && s.variants) {
        try {
          const v = JSON.parse(s.variants);
          if (Array.isArray(v) && v.some(x => {
            if (typeof x === 'string' && (x.startsWith('http') || x.startsWith('/uploads'))) return true;
            if (x && typeof x === 'object' && (x.imageUrl || x.previewUrl)) return true;
            return false;
          })) {
            hasImg = true;
          }
        } catch {}
      }

      if (hasImg) imgCount++;
    }

    if (imgCount > 0) {
      results.push({
        id: p.id,
        title: p.title,
        source: p.source,
        status: p.status,
        completedAt: p.completedAt,
        totalSlides: p.Slide.length,
        imgCount,
        allHaveImages: imgCount === p.Slide.length
      });
    }
  }

  // 排序：完全有图的在前
  results.sort((a, b) => {
    if (a.allHaveImages !== b.allHaveImages) return b.allHaveImages ? 1 : -1;
    return b.imgCount - a.imgCount;
  });

  console.log('\n有图片的项目总数:', results.length);

  const ide = results.filter(p => p.source === 'IDE');
  const agent = results.filter(p => p.source === 'AGENT');

  console.log('IDE模式:', ide.length);
  console.log('Agent模式:', agent.length);

  console.log('\n' + '='.repeat(80));
  console.log('IDE模式有图片项目:');
  console.log('='.repeat(80));
  ide.forEach((p, i) => {
    const status = p.allHaveImages ? '✅全部' : '⚠️部分';
    const inHistory = p.completedAt ? ' [历史库]' : '';
    console.log('[' + (i+1) + '] ' + p.id.substring(0,8) + ' | ' + p.title.substring(0,35) + ' | ' + p.imgCount + '/' + p.totalSlides + '张 ' + status + inHistory);
  });

  console.log('\n' + '='.repeat(80));
  console.log('Agent模式有图片项目:');
  console.log('='.repeat(80));
  agent.forEach((p, i) => {
    const status = p.allHaveImages ? '✅全部' : '⚠️部分';
    const inHistory = p.completedAt ? ' [历史库]' : '';
    console.log('[' + (i+1) + '] ' + p.id.substring(0,8) + ' | ' + p.title.substring(0,35) + ' | ' + p.imgCount + '/' + p.totalSlides + '张 ' + status + inHistory);
  });

  // 统计应该进入历史库的
  const shouldInHistory = results.filter(p => p.allHaveImages);
  console.log('\n' + '='.repeat(80));
  console.log('应该进入历史库的项目（全部有图）:');
  console.log('='.repeat(80));
  console.log('IDE:', shouldInHistory.filter(p => p.source === 'IDE').length);
  console.log('Agent:', shouldInHistory.filter(p => p.source === 'AGENT').length);
}

findProjectsWithImages().then(() => process.exit(0));