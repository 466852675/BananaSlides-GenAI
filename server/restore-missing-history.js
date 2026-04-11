/**
 * 恢复历史库 - 把所有完全有图片的项目加入历史库
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function restoreHistory() {
  console.log('='.repeat(80));
  console.log('恢复历史库');
  console.log('='.repeat(80));

  // 这些项目全部有图片，应该进入历史库
  const fullyCompleteIds = [
    '800469a7-cbb7-4ad7-8ddb-a13cb934f635',  // 2026年电费风险防控及服务质量提升项目汇报
    'c88d5ace-51d0-4a0c-98e2-a88ec2dc57d3',  // 颠覆性无限白板神器
    '38060448-9b2e-4f50-a403-4031521c6a7d',  // 关于2025年国内外AI编程工具产品分析报告
  ];

  for (const id of fullyCompleteIds) {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, completedAt: true }
    });

    if (project) {
      // 更新项目状态
      await prisma.project.update({
        where: { id },
        data: {
          status: 'completed',
          completedAt: project.completedAt || new Date()
        }
      });

      // 更新幻灯片状态为 success
      await prisma.slide.updateMany({
        where: { projectId: id },
        data: { status: 'success' }
      });

      console.log('✅ 已加入历史库:', project.title);
    } else {
      console.log('⚠️ 项目不存在:', id);
    }
  }

  // 验证最终结果
  const history = await prisma.project.findMany({
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
  console.log('历史库最终状态');
  console.log('='.repeat(80));

  const ideHistory = history.filter(p => p.source === 'IDE');
  const agentHistory = history.filter(p => p.source === 'AGENT');

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

restoreHistory().then(() => {
  console.log('\n完成');
  process.exit(0);
});