/**
 * 恢复历史库数据
 * 为 IDE 模式 11 个项目和 Agent 模式 11 个项目补充模拟图片
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 模拟图片URL（使用 picsum.photos 作为占位图）
const MOCK_IMAGES = [
  'https://picsum.photos/seed/ppt1/1920/1080',
  'https://picsum.photos/seed/ppt2/1920/1080',
  'https://picsum.photos/seed/ppt3/1920/1080',
  'https://picsum.photos/seed/ppt4/1920/1080',
  'https://picsum.photos/seed/ppt5/1920/1080',
  'https://picsum.photos/seed/ppt6/1920/1080',
  'https://picsum.photos/seed/ppt7/1920/1080',
  'https://picsum.photos/seed/ppt8/1920/1080',
  'https://picsum.photos/seed/ppt9/1920/1080',
  'https://picsum.photos/seed/ppt10/1920/1080',
  'https://picsum.photos/seed/ppt11/1920/1080',
  'https://picsum.photos/seed/ppt12/1920/1080',
];

async function restoreHistoryLibrary() {
  console.log('='.repeat(80));
  console.log('恢复历史库数据');
  console.log('='.repeat(80));

  // 获取 IDE 模式项目（选择最近的11个有幻灯片的）
  const ideProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      source: 'IDE'
    },
    select: {
      id: true,
      title: true,
      Slide: { select: { id: true, index: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 11
  });

  // 获取 Agent 模式项目（最近的11个，如果没有就创建一个）
  let agentProjects = await prisma.project.findMany({
    where: {
      isDeleted: false,
      source: 'AGENT'
    },
    select: {
      id: true,
      title: true,
      Slide: { select: { id: true, index: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 11
  });

  console.log('\\n找到 IDE 项目:', ideProjects.length);
  console.log('找到 Agent 项目:', agentProjects.length);

  // 如果 Agent 项目不足11个，需要创建
  const needCreate = 11 - agentProjects.length;
  if (needCreate > 0) {
    console.log('\\n需要创建', needCreate, '个 Agent 项目...');

    const agentTitles = [
      'AI赋能企业数字化转型实践',
      '智慧城市建设解决方案汇报',
      '新产品发布会演示文稿',
      '年度工作总结与展望',
      '数据驱动业务增长策略',
      '云计算技术架构分享',
      '用户体验设计最佳实践',
      '敏捷开发团队管理经验',
      '大数据分析平台介绍',
      '物联网应用场景探索',
      '人工智能技术发展趋势'
    ];

    for (let i = 0; i < needCreate; i++) {
      const title = agentTitles[i] || `Agent演示项目${i + 1}`;
      const project = await prisma.project.create({
        data: {
          title,
          source: 'AGENT',
          status: 'completed',
          completedAt: new Date(),
          userId: 'default-user', // 需要替换为实际用户ID
          globalConfig: '{}',
          Slide: {
            create: Array.from({ length: 10 }, (_, idx => ({
              index: idx,
              pageType: idx === 0 ? 'cover' : idx === 9 ? 'end' : 'content',
              contentType: 'text',
              title: `第${idx + 1}页`,
              content: `这是${title}的第${idx + 1}页内容`,
              status: 'success',
              variants: JSON.stringify([MOCK_IMAGES[idx % MOCK_IMAGES.length]]),
              variantCount: 1
            }))
          }
        },
        select: {
          id: true,
          title: true,
          Slide: { select: { id: true, index: true } }
        }
      });
      agentProjects.push(project);
      console.log('  创建:', title);
    }
  }

  // 为现有 IDE 项目补充图片
  console.log('\\n' + '='.repeat(80));
  console.log('处理 IDE 项目');
  console.log('='.repeat(80));

  for (const project of ideProjects) {
    console.log('\\n处理:', project.title);

    for (const slide of project.Slide) {
      const mockImage = MOCK_IMAGES[slide.index % MOCK_IMAGES.length];
      await prisma.slide.update({
        where: { id: slide.id },
        data: {
          status: 'success',
          variants: JSON.stringify([mockImage]),
          previewUrl: mockImage
        }
      });
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });

    console.log('  ✅ 已设置', project.Slide.length, '张图片');
  }

  // 为现有 Agent 项目补充图片
  console.log('\\n' + '='.repeat(80));
  console.log('处理 Agent 项目');
  console.log('='.repeat(80));

  for (const project of agentProjects) {
    console.log('\\n处理:', project.title);

    // 如果项目已有幻灯片，更新它们
    if (project.Slide.length > 0) {
      for (const slide of project.Slide) {
        const mockImage = MOCK_IMAGES[slide.index % MOCK_IMAGES.length];
        await prisma.slide.update({
          where: { id: slide.id },
          data: {
            status: 'success',
            variants: JSON.stringify([mockImage]),
            previewUrl: mockImage
          }
        });
      }
      console.log('  ✅ 已更新', project.Slide.length, '张图片');
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }

  // 验证最终结果
  console.log('\\n' + '='.repeat(80));
  console.log('验证结果');
  console.log('='.repeat(80));

  const finalIde = await prisma.project.findMany({
    where: { isDeleted: false, source: 'IDE', completedAt: { not: null } },
    select: { id: true, title: true }
  });

  const finalAgent = await prisma.project.findMany({
    where: { isDeleted: false, source: 'AGENT', completedAt: { not: null } },
    select: { id: true, title: true }
  });

  console.log('\\nIDE 历史库:', finalIde.length);
  finalIde.forEach((p, i) => console.log('  [' + (i+1) + '] ' + p.title));

  console.log('\\nAgent 历史库:', finalAgent.length);
  finalAgent.forEach((p, i) => console.log('  [' + (i+1) + '] ' + p.title));
}

restoreHistoryLibrary()
  .then(() => {
    console.log('\\n恢复完成！');
    process.exit(0);
  })
  .catch(err => {
    console.error('执行失败:', err);
    process.exit(1);
  });