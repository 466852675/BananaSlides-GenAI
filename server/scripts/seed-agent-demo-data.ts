/**
 * 为Agent模式项目补充演示数据
 *
 * 运行方式: npx ts-node scripts/seed-agent-demo-data.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 内容生成模板
const contentTemplates = {
  cover: (title: string) => JSON.stringify({
    title: title,
    subtitle: "智能科技 · 改变生活",
    company: "创新科技有限公司",
    date: new Date().toLocaleDateString('zh-CN')
  }),

  directory: () => JSON.stringify({
    items: [
      { title: "产品概述", page: 2 },
      { title: "核心功能", page: 3 },
      { title: "技术优势", page: 5 },
      { title: "应用场景", page: 7 },
      { title: "合作案例", page: 8 }
    ]
  }),

  content: (title: string) => JSON.stringify({
    title: title,
    points: [
      "创新技术驱动产品升级，提升用户体验",
      "智能化解决方案，满足多样化需求",
      "高效稳定的技术架构，保障系统可靠性",
      "灵活的配置选项，适应不同业务场景",
      "完善的服务体系，全方位支持客户"
    ],
    summary: "通过持续创新和优化，为客户提供卓越的产品体验。"
  }),

  transition: (title: string) => JSON.stringify({
    chapter: title,
    subtitle: "深入了解产品核心价值"
  }),

  end: () => JSON.stringify({
    thanks: "感谢您的关注",
    contact: {
      phone: "400-888-8888",
      email: "contact@example.com",
      website: "www.example.com"
    },
    slogan: "携手共创美好未来"
  })
};

// 根据pageType生成内容
function generateSlideContent(pageType: string, title: string, projectTitle: string): string {
  switch (pageType) {
    case 'cover':
      return contentTemplates.cover(title || projectTitle);
    case 'directory':
      return contentTemplates.directory();
    case 'content':
      return contentTemplates.content(title || '内容详情');
    case 'transition':
      return contentTemplates.transition(title || '章节导航');
    case 'end':
      return contentTemplates.end();
    default:
      return contentTemplates.content(title || '内容详情');
  }
}

// 为项目创建幻灯片框架
async function createSlidesForProject(project: any) {
  const defaultPages = [
    { pageType: 'cover', title: project.title || '演示文稿', index: 0 },
    { pageType: 'directory', title: '目录', index: 1 },
    { pageType: 'content', title: '产品概述', index: 2 },
    { pageType: 'content', title: '核心功能', index: 3 },
    { pageType: 'content', title: '技术优势', index: 4 },
    { pageType: 'content', title: '应用场景', index: 5 },
    { pageType: 'content', title: '合作案例', index: 6 },
    { pageType: 'content', title: '用户反馈', index: 7 },
    { pageType: 'transition', title: '联系我们', index: 8 },
    { pageType: 'end', title: '感谢关注', index: 9 }
  ];

  for (const page of defaultPages) {
    await prisma.slide.create({
      data: {
        projectId: project.id,
        pageType: page.pageType,
        title: page.title,
        index: page.index,
        content: generateSlideContent(page.pageType, page.title, project.title),
        contentType: 'text',
        variantCount: 2,
        status: 'completed'
      }
    });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('开始补充Agent项目演示数据...');
  console.log('='.repeat(60));

  // 1. 获取所有Agent项目
  const projects = await prisma.project.findMany({
    where: {
      source: 'AGENT',
      isDeleted: false
    },
    include: {
      AgentSession: true,
      Slide: true
    }
  });

  console.log(`\n找到 ${projects.length} 个Agent项目\n`);

  let updatedCount = 0;
  let slidesCreated = 0;

  for (const project of projects) {
    console.log(`\n处理项目: ${project.title}`);
    console.log(`  ID: ${project.id}`);

    const session = project.AgentSession;
    if (!session) {
      console.log('  ⚠️ 无Session，跳过');
      continue;
    }

    // 2. 为无幻灯片的项目创建幻灯片
    if (project.Slide.length === 0) {
      console.log('  创建幻灯片框架...');
      await createSlidesForProject(project);
      slidesCreated += 10;
      console.log('  ✅ 已创建10页幻灯片');
    }

    // 3. 补充幻灯片内容
    const slides = await prisma.slide.findMany({
      where: { projectId: project.id }
    });

    let contentUpdated = 0;
    for (const slide of slides) {
      if (!slide.content || slide.content.trim().length < 10) {
        const content = generateSlideContent(slide.pageType || 'content', slide.title || '', project.title || '');
        await prisma.slide.update({
          where: { id: slide.id },
          data: { content, status: 'completed' }
        });
        contentUpdated++;
      }
    }
    if (contentUpdated > 0) {
      console.log(`  ✅ 更新了 ${contentUpdated} 页幻灯片内容`);
    }

    // 4. 完成所有AgentTask（不含IMAGE类型）
    const taskResult = await prisma.agentTask.updateMany({
      where: {
        sessionId: session.id,
        type: { notIn: ['IMAGE', 'BATCH_IMAGE'] }
      },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date()
      }
    });
    console.log(`  ✅ 完成 ${taskResult.count} 个任务`);

    // 5. 更新Session状态
    await prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedTasks: session.totalTasks
      }
    });
    console.log('  ✅ Session状态已更新为COMPLETED');

    // 6. 更新Project状态
    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
    console.log('  ✅ Project状态已更新为completed');

    updatedCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('数据补充完成！');
  console.log(`  - 更新项目数: ${updatedCount}`);
  console.log(`  - 创建幻灯片数: ${slidesCreated}`);
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });