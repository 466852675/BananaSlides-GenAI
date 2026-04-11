/**
 * 修正历史库 - 无图片的项目不能进入历史库
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixHistoryLibrary() {
  console.log('='.repeat(80));
  console.log('修正历史库数据');
  console.log('='.repeat(80));

  // 查询历史库中的所有项目（completedAt不为空）
  const historyProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      completedAt: { not: null }
    },
    select: {
      id: true,
      title: true,
      displayId: true,
      source: true,
      status: true,
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

  console.log(`\n历史库当前项目数: ${historyProjects.length}\n`);

  const toRemove = [];
  const toKeep = [];

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

    if (!hasImages) {
      toRemove.push({
        id: project.id,
        title: project.title,
        source: project.source,
        status: project.status
      });
    } else {
      toKeep.push({
        id: project.id,
        title: project.title,
        source: project.source
      });
    }
  }

  console.log('📋 无图片需要移出历史库的项目:');
  console.log('-'.repeat(60));
  toRemove.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title} (${p.source})`);
    console.log(`      ID: ${p.id}`);
    console.log(`      当前状态: ${p.status}`);
  });

  console.log('\n\n✅ 有图片应保留在历史库的项目:');
  console.log('-'.repeat(60));
  toKeep.forEach((p, idx) => {
    console.log(`  [${idx + 1}] ${p.title} (${p.source})`);
  });

  // 执行移出操作
  if (toRemove.length > 0) {
    console.log('\n\n' + '='.repeat(80));
    console.log('开始移出无图片项目...');
    console.log('='.repeat(80));

    for (const project of toRemove) {
      console.log(`\n处理: ${project.title}`);

      // 清除completedAt，将状态改为generating
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'generating',
          completedAt: null
        }
      });

      console.log(`  ✅ 已从历史库移出 (status → generating, completedAt → null)`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('修正完成！');
  console.log(`  移出项目数: ${toRemove.length}`);
  console.log(`  保留项目数: ${toKeep.length}`);
  console.log('='.repeat(80));

  // 验证修正后的结果
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

  console.log('\n\n修正后历史库验证:');
  console.log('-'.repeat(60));

  const ideCount = afterFix.filter(p => p.source === 'IDE').length;
  const agentCount = afterFix.filter(p => p.source === 'AGENT').length;

  console.log(`IDE模式历史库: ${ideCount} 个`);
  console.log(`Agent模式历史库: ${agentCount} 个`);
  console.log(`总计: ${afterFix.length} 个`);
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