/**
 * 为 Agent 模式项目补充高度仿真的对话过程数据
 *
 * 运行方式: cd server && npx ts-node scripts/seed-agent-conversations.ts
 *
 * 包含：用户发送 → AI 配置确认 → 大纲生成确认 → 内容生成确认
 * 不含：图片生成
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ============================================================
// 项目差异化配置
// ============================================================

interface ProjectConfig {
  title: string;
  topic: string;
  pageCount: number;
  styleName: string;
  style: string;
  aspectRatio: string;
  colorPalette: string[];
  colorPaletteName: string;
  requirements: string;
  userMessage: string;
  coverTitle: string;
  coverSubtitle: string;
  coverCompany: string;
  directoryItems: { title: string; page: number }[];
  contentTopics: string[];
  endSlogan: string;
  endContact: { phone: string; email: string; website: string };
}

const PROJECT_CONFIGS: ProjectConfig[] = [
  {
    title: '智能手表健康监测与运动追踪',
    topic: '智能手表健康监测与运动追踪',
    pageCount: 10,
    styleName: '科技',
    style: '科技',
    aspectRatio: '16:9',
    colorPalette: ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
    colorPaletteName: '科技蓝',
    requirements: '',
    userMessage: '帮我创建一份关于智能手表健康监测与运动追踪功能的PPT，重点突出产品在健康管理方面的创新',
    coverTitle: '智能手表健康监测与运动追踪',
    coverSubtitle: '科技守护健康 · 运动触手可及',
    coverCompany: '智联穿戴科技有限公司',
    directoryItems: [
      { title: '产品概述', page: 2 },
      { title: '健康监测技术', page: 3 },
      { title: '运动追踪功能', page: 5 },
      { title: '数据智能分析', page: 7 },
      { title: '用户体验', page: 8 },
    ],
    contentTopics: ['产品概述', '核心健康监测技术', '心率与血氧监测', '运动追踪功能', '睡眠质量分析', '数据智能分析', '用户体验与反馈', '未来发展规划'],
    endSlogan: '让科技成为你的健康伙伴',
    endContact: { phone: '400-668-8899', email: 'health@zhilian.com', website: 'www.zhilian-wear.com' },
  },
  {
    title: '智能家居产品介绍',
    topic: '智能家居产品介绍',
    pageCount: 12,
    styleName: '商务',
    style: '商务',
    aspectRatio: '16:9',
    colorPalette: ['#1e3a5f', '#4a90d9', '#ffffff', '#2c3e50'],
    colorPaletteName: '商务灰蓝',
    requirements: '面向渠道合作伙伴的产品推介',
    userMessage: '我需要做一个智能家居产品介绍的PPT，12页左右，用于渠道合作伙伴推介会',
    coverTitle: '智能家居产品介绍',
    coverSubtitle: '智慧生活 · 从家开始',
    coverCompany: '云居智能科技',
    directoryItems: [
      { title: '公司简介', page: 2 },
      { title: '产品矩阵', page: 3 },
      { title: '核心产品', page: 5 },
      { title: '技术优势', page: 7 },
      { title: '合作模式', page: 9 },
      { title: '成功案例', page: 10 },
    ],
    contentTopics: ['公司简介', '产品矩阵概览', '智能安防系统', '智能照明方案', '智能环境控制', '技术架构优势', '渠道合作模式', '成功案例分享', '合作伙伴权益', '市场前景'],
    endSlogan: '携手共建智慧生态',
    endContact: { phone: '400-999-6688', email: 'partner@yunju.com', website: 'www.yunju-smart.com' },
  },
  {
    title: 'AI智能手表新品演示',
    topic: 'AI智能手表新品演示',
    pageCount: 10,
    styleName: '科技',
    style: '科技',
    aspectRatio: '16:9',
    colorPalette: ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
    colorPaletteName: '科技蓝',
    requirements: '新品发布会演示',
    userMessage: '准备一场AI智能手表新品发布会的演示文稿，要突出AI功能和差异化卖点',
    coverTitle: 'AI智能手表新品发布',
    coverSubtitle: 'AI赋能 · 重新定义腕上智能',
    coverCompany: '未来穿戴科技',
    directoryItems: [
      { title: '市场洞察', page: 2 },
      { title: '产品亮点', page: 3 },
      { title: 'AI核心能力', page: 5 },
      { title: '产品规格', page: 7 },
      { title: '价格策略', page: 8 },
    ],
    contentTopics: ['市场洞察与趋势', '产品核心亮点', 'AI语音助手', 'AI健康管理', '产品技术规格', '价格与发售策略', '竞争优势对比', '未来产品路线'],
    endSlogan: '让AI懂你，从腕开始',
    endContact: { phone: '400-888-1234', email: 'info@futurewear.com', website: 'www.futurewear.ai' },
  },
  {
    title: '智能手表新品演示文稿',
    topic: '智能手表新品演示文稿',
    pageCount: 10,
    styleName: '商务',
    style: '商务',
    aspectRatio: '16:9',
    colorPalette: ['#1e3a5f', '#4a90d9', '#ffffff', '#2c3e50'],
    colorPaletteName: '商务灰蓝',
    requirements: '',
    userMessage: '帮我做一份智能手表新品演示文稿，10页，用于内部产品评审会',
    coverTitle: '智能手表新品演示',
    coverSubtitle: '精准 · 智能 · 领先',
    coverCompany: '星辰科技有限公司',
    directoryItems: [
      { title: '产品定位', page: 2 },
      { title: '设计理念', page: 3 },
      { title: '功能详解', page: 5 },
      { title: '竞品分析', page: 7 },
      { title: '上市计划', page: 8 },
    ],
    contentTopics: ['产品定位与目标用户', '设计理念与工艺', '运动健康功能', '智能互联体验', '竞品分析对比', '上市推广计划', '渠道布局策略', '预期销售目标'],
    endSlogan: '引领腕上科技新纪元',
    endContact: { phone: '400-777-5566', email: 'product@starchentech.com', website: 'www.starchentech.com' },
  },
  {
    title: '公司新产品演示文稿',
    topic: '公司新产品演示',
    pageCount: 10,
    styleName: '商务',
    style: '商务',
    aspectRatio: '16:9',
    colorPalette: ['#1e3a5f', '#4a90d9', '#ffffff', '#2c3e50'],
    colorPaletteName: '商务灰蓝',
    requirements: '',
    userMessage: '生成一份关于我们公司新产品的演示文稿，要体现产品的核心竞争力',
    coverTitle: '公司新产品发布',
    coverSubtitle: '创新驱动 · 价值创造',
    coverCompany: '创新科技有限公司',
    directoryItems: [
      { title: '公司概况', page: 2 },
      { title: '新品亮点', page: 3 },
      { title: '技术突破', page: 5 },
      { title: '市场分析', page: 7 },
      { title: '合作邀请', page: 8 },
    ],
    contentTopics: ['公司概况与愿景', '新品核心亮点', '技术创新突破', '产品功能展示', '市场分析与机遇', '商业模式', '合作伙伴计划', '未来发展规划'],
    endSlogan: '共创美好商业未来',
    endContact: { phone: '400-123-4567', email: 'biz@innovation.com', website: 'www.innovation-tech.com' },
  },
  {
    title: '智能手表新品演示文稿',
    topic: '智能手表新品演示文稿',
    pageCount: 8,
    styleName: '科技',
    style: '科技',
    aspectRatio: '16:9',
    colorPalette: ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
    colorPaletteName: '科技蓝',
    requirements: '简洁为主',
    userMessage: '帮我生成一个智能手表新品的PPT，8页就好，简洁一点',
    coverTitle: '智能手表新品发布',
    coverSubtitle: '科技 · 精致 · 不凡',
    coverCompany: '锐动科技',
    directoryItems: [
      { title: '产品概览', page: 2 },
      { title: '核心功能', page: 3 },
      { title: '技术参数', page: 5 },
      { title: '市场策略', page: 6 },
    ],
    contentTopics: ['产品概览', '核心功能展示', '技术创新点', '技术参数对比', '市场策略', '发售信息'],
    endSlogan: '科技让生活更精彩',
    endContact: { phone: '400-555-1234', email: 'info@ruidong.com', website: 'www.ruidong-tech.com' },
  },
  {
    title: '智能手表新品演示文稿',
    topic: '智能手表新品演示文稿',
    pageCount: 10,
    styleName: '简约',
    style: '简约',
    aspectRatio: '16:9',
    colorPalette: ['#000000', '#ffffff', '#666666', '#f5f5f5'],
    colorPaletteName: '极简黑白',
    requirements: '',
    userMessage: '创建一个智能手表新品PPT，简约风格，10页',
    coverTitle: '智能手表新品发布',
    coverSubtitle: '少即是多',
    coverCompany: '璞真科技',
    directoryItems: [
      { title: '产品理念', page: 2 },
      { title: '设计语言', page: 3 },
      { title: '功能体验', page: 5 },
      { title: '用户评价', page: 7 },
      { title: '购买信息', page: 8 },
    ],
    contentTopics: ['产品设计理念', '极简设计语言', '核心健康功能', '智能互联体验', '用户真实评价', '价格与渠道', '售后服务承诺', '品牌故事'],
    endSlogan: '以简驭繁，回归本质',
    endContact: { phone: '400-222-8899', email: 'hello@puzhen.com', website: 'www.puzhen.design' },
  },
  {
    title: '技术分享 (React 19新特性)',
    topic: 'React 19新特性技术分享',
    pageCount: 15,
    styleName: '科技',
    style: '科技',
    aspectRatio: '16:9',
    colorPalette: ['#2563eb', '#60a5fa', '#ffffff', '#1f2937'],
    colorPaletteName: '科技蓝',
    requirements: '面向前端开发团队的技术分享',
    userMessage: '帮我做一个React 19新特性的技术分享PPT，15页左右，要详细一些，面向前端开发团队',
    coverTitle: 'React 19 新特性深度解析',
    coverSubtitle: '拥抱下一代前端开发范式',
    coverCompany: '前端技术委员会',
    directoryItems: [
      { title: 'React 19 概览', page: 2 },
      { title: 'Server Components', page: 3 },
      { title: 'Actions', page: 5 },
      { title: '新 Hooks', page: 7 },
      { title: '性能优化', page: 9 },
      { title: '迁移指南', page: 11 },
      { title: '最佳实践', page: 13 },
    ],
    contentTopics: ['React 19 版本概览', 'Server Components 详解', 'Server Actions 实战', 'use() Hook 新用法', 'useFormStatus 与 useOptimistic', '性能优化策略', '并发渲染改进', '类型系统增强', '迁移指南与注意事项', '最佳实践总结', '生态工具适配', '性能基准测试', '未来路线图'],
    endSlogan: '持续学习，拥抱变化',
    endContact: { phone: '技术沙龙群', email: 'frontend@company.com', website: 'react.dev' },
  },
  {
    title: '技术分享 (React 19新特性)',
    topic: 'React 19新特性技术分享',
    pageCount: 12,
    styleName: '简约',
    style: '简约',
    aspectRatio: '16:9',
    colorPalette: ['#000000', '#ffffff', '#666666', '#f5f5f5'],
    colorPaletteName: '极简黑白',
    requirements: '团队内部简版分享',
    userMessage: '做一个React 19技术分享的PPT，12页，简约风格，内部团队分享用',
    coverTitle: 'React 19 新特性速览',
    coverSubtitle: '前端团队内部分享',
    coverCompany: '研发中心',
    directoryItems: [
      { title: '版本概览', page: 2 },
      { title: '核心变更', page: 3 },
      { title: '新API', page: 5 },
      { title: '迁移要点', page: 8 },
      { title: 'Q&A', page: 10 },
    ],
    contentTopics: ['React 19 版本概览', 'Server Components', 'Server Actions', 'use() Hook', '新Hooks一览', 'Breaking Changes', '迁移要点', '性能提升数据', '社区资源推荐', 'Q&A环节'],
    endSlogan: 'Keep Learning',
    endContact: { phone: '前端技术群', email: 'fe-team@company.com', website: 'github.com/react' },
  },
  {
    title: '部门年度总结汇报PPT',
    topic: '部门年度总结汇报',
    pageCount: 15,
    styleName: '商务',
    style: '商务',
    aspectRatio: '16:9',
    colorPalette: ['#1e3a5f', '#4a90d9', '#ffffff', '#2c3e50'],
    colorPaletteName: '商务灰蓝',
    requirements: '面向高层管理者的年度汇报',
    userMessage: '帮我制作部门年度总结汇报PPT，15页，要数据详实，面向公司高层汇报',
    coverTitle: '2025年度工作总结汇报',
    coverSubtitle: '产品研发部 · 砥砺前行',
    coverCompany: '产品研发部',
    directoryItems: [
      { title: '年度概览', page: 2 },
      { title: '核心成果', page: 3 },
      { title: '项目交付', page: 5 },
      { title: '团队建设', page: 7 },
      { title: '技术创新', page: 9 },
      { title: '财务数据', page: 11 },
      { title: '明年规划', page: 13 },
    ],
    contentTopics: ['年度工作概览', '核心成果展示', '重点项目交付', '产品迭代成果', '团队成长与建设', '技术创新与突破', '专利与论文', '财务数据概览', '客户满意度', '问题与挑战', '2026年战略规划', '资源配置需求', '风险管控计划'],
    endSlogan: '凝心聚力，再创辉煌',
    endContact: { phone: '内线 8088', email: 'rd-dept@company.com', website: 'wiki.company.com/rd' },
  },
  {
    title: '部门月度复盘总结PPT',
    topic: '部门月度复盘总结',
    pageCount: 10,
    styleName: '简约',
    style: '简约',
    aspectRatio: '16:9',
    colorPalette: ['#000000', '#ffffff', '#666666', '#f5f5f5'],
    colorPaletteName: '极简黑白',
    requirements: '',
    userMessage: '创建一个部门月度复盘总结PPT，10页，简约风格',
    coverTitle: '4月月度复盘总结',
    coverSubtitle: '运营部 · 持续优化',
    coverCompany: '运营部',
    directoryItems: [
      { title: '本月概况', page: 2 },
      { title: 'KPI完成', page: 3 },
      { title: '重点项目', page: 5 },
      { title: '问题分析', page: 7 },
      { title: '下月计划', page: 8 },
    ],
    contentTopics: ['本月工作概况', 'KPI完成情况', '用户增长分析', '核心项目进展', '问题与改进', '团队效能数据', '下月工作计划', '资源需求'],
    endSlogan: '复盘即成长',
    endContact: { phone: '内线 6060', email: 'ops@company.com', website: 'wiki.company.com/ops' },
  },
];

// ============================================================
// 内容生成器
// ============================================================

function generateSlideContent(
  pageType: string,
  title: string,
  config: ProjectConfig,
  slideIndex: number
): string {
  switch (pageType) {
    case 'cover':
      return JSON.stringify({
        title: config.coverTitle,
        subtitle: config.coverSubtitle,
        company: config.coverCompany,
        date: new Date().toLocaleDateString('zh-CN'),
      });
    case 'directory':
      return JSON.stringify({ items: config.directoryItems });
    case 'content': {
      const topic = config.contentTopics[slideIndex - 2] || title;
      return JSON.stringify({
        title: topic,
        points: [
          `${topic}的核心要点之一：深入理解业务需求，制定精准执行策略`,
          `${topic}的关键要素：数据驱动决策，确保每个环节都有量化指标`,
          `在${topic}领域，持续创新是保持竞争力的根本保障`,
          `通过团队协作和流程优化，${topic}的整体效率提升了35%`,
          `${topic}的长期发展需要建立可持续的运营体系和反馈机制`,
        ],
        summary: `综合来看，${topic}是推动整体目标达成的关键环节，需要持续投入和优化。`,
      });
    }
    case 'transition':
      return JSON.stringify({
        chapter: title,
        subtitle: '深入了解核心价值与实践经验',
      });
    case 'end':
      return JSON.stringify({
        thanks: '感谢您的关注与支持',
        contact: config.endContact,
        slogan: config.endSlogan,
      });
    default:
      return JSON.stringify({
        title,
        points: ['要点一', '要点二', '要点三'],
        summary: `关于${title}的总结`,
      });
  }
}

function generateSlideBrief(pageType: string, title: string, config: ProjectConfig): string {
  switch (pageType) {
    case 'cover':
      return `${config.coverTitle} - ${config.coverSubtitle}`;
    case 'directory':
      return `目录：${config.directoryItems.map(i => i.title).join('、')}`;
    case 'content':
      return `${title}的核心分析与关键发现`;
    case 'transition':
      return `章节过渡：${title}`;
    case 'end':
      return `感谢页 - ${config.endSlogan}`;
    default:
      return title;
  }
}

// 生成大纲的 slides 数组
function generateOutlineSlides(config: ProjectConfig) {
  const slides: Array<{ id: string; index: number; title: string; content: string; pageType: string }> = [];

  // 封面
  slides.push({
    id: `slide-0`,
    index: 0,
    title: config.coverTitle,
    content: generateSlideBrief('cover', config.coverTitle, config),
    pageType: 'cover',
  });

  // 目录
  slides.push({
    id: `slide-1`,
    index: 1,
    title: '目录',
    content: generateSlideBrief('directory', '目录', config),
    pageType: 'directory',
  });

  // 内容页
  const contentCount = config.pageCount - 3; // 减去封面、目录、结尾
  for (let i = 0; i < contentCount; i++) {
    const topic = config.contentTopics[i] || `主题${i + 1}`;
    slides.push({
      id: `slide-${i + 2}`,
      index: i + 2,
      title: topic,
      content: generateSlideBrief('content', topic, config),
      pageType: 'content',
    });
  }

  // 结尾
  slides.push({
    id: `slide-${config.pageCount - 1}`,
    index: config.pageCount - 1,
    title: '感谢关注',
    content: generateSlideBrief('end', '感谢关注', config),
    pageType: 'end',
  });

  return slides;
}

// ============================================================
// 消息生成器
// ============================================================

function generateUserMessage(config: ProjectConfig): string {
  return config.userMessage;
}

function generateConfigConfirmMessage(config: ProjectConfig): string {
  const pageStructure = {
    cover: 1,
    directory: 1,
    transition: 0,
    content: config.pageCount - 3,
    end: 1,
  };

  return `好的，我来为您创建《${config.topic}》演示文稿。\n\n根据您的需求分析，我推荐以下配置：\n\n📊 **页数**: ${config.pageCount}页\n🎨 **风格**: ${config.styleName}\n📐 **比例**: ${config.aspectRatio}\n🎯 **配色**: ${config.colorPaletteName}\n\n**页面结构分配：**\n- 封面：1页\n- 目录：1页\n- 正文内容：${pageStructure.content}页\n- 结尾页：1页\n\n${config.requirements ? `**特殊要求**: ${config.requirements}\n\n` : ''}请确认以上配置，我将开始为您生成大纲。`;
}

function generateConfigConfirmedMessage(config: ProjectConfig): string {
  return `✅ 配置已确认！\n\n主题：${config.topic}\n页数：${config.pageCount}页\n风格：${config.styleName}\n\n正在为您生成大纲结构，请稍候...`;
}

function generateOutlineCompleteMessage(config: ProjectConfig): string {
  const outlineSlides = generateOutlineSlides(config);
  const contentSlides = outlineSlides.filter(s => s.pageType === 'content');

  return `✅ 大纲生成完成！\n\n共 ${config.pageCount} 页，结构如下：\n\n${outlineSlides.map(s => {
    const typeLabel = s.pageType === 'cover' ? '封面' :
                     s.pageType === 'directory' ? '目录' :
                     s.pageType === 'end' ? '结尾' : '正文';
    return `${s.index + 1}. [${typeLabel}] ${s.title}`;
  }).join('\n')}\n\n大纲覆盖了${contentSlides.length}个核心主题，从不同角度展示${config.topic}的关键内容。\n\n请查看大纲详情并确认，确认后我将生成每页的详细内容。`;
}

function generateOutlineConfirmedMessage(config: ProjectConfig): string {
  return `✅ 大纲已确认！\n\n正在为 ${config.pageCount} 页幻灯片生成详细内容...\n\n预计需要 1-2 分钟，请稍候。`;
}

function generateContentCompleteMessage(config: ProjectConfig): string {
  return `✅ 内容生成完成！\n\n所有 ${config.pageCount} 页幻灯片的详细内容已生成完毕。每页包含了完整的要点、分析和总结。\n\n您现在可以：\n- 📖 逐页查看生成的内容\n- ✏️ 对特定页面进行修改\n- 🖼️ 继续生成配图（需要额外积分）\n- 📤 直接导出为 PDF/PPTX\n\n如需调整任何页面的内容，请告诉我具体修改需求。`;
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Agent 模式对话数据模拟脚本');
  console.log('='.repeat(60));

  // 1. 获取所有 Agent 项目
  const projects = await prisma.project.findMany({
    where: { source: 'AGENT', isDeleted: false },
    include: { AgentSession: true, Slide: { orderBy: { index: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n找到 ${projects.length} 个 Agent 项目\n`);

  if (projects.length === 0) {
    console.log('没有 Agent 项目，退出。');
    return;
  }

  // 确保有足够的配置
  if (projects.length > PROJECT_CONFIGS.length) {
    console.log(`⚠️ 项目数(${projects.length})超过预置配置数(${PROJECT_CONFIGS.length})，将循环使用配置\n`);
  }

  let totalMessagesCreated = 0;
  let totalTasksCreated = 0;
  let totalSlidesUpdated = 0;
  let totalProjectsUpdated = 0;

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const config = PROJECT_CONFIGS[i % PROJECT_CONFIGS.length];
    const session = project.AgentSession;

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`[${i + 1}/${projects.length}] ${project.title}`);
    console.log(`  Project ID: ${project.id}`);
    console.log(`  Session: ${session ? session.id : 'NONE'}`);

    if (!session) {
      console.log('  ⚠️ 无 Session，跳过');
      continue;
    }

    // ── Step 1: 清理旧数据 ──
    console.log('  清理旧消息和任务...');

    // 删除已有消息（软删除改为物理删除以保持数据干净）
    const deletedMsgs = await prisma.agentMessage.deleteMany({
      where: { sessionId: session.id },
    });

    // 删除已有任务
    const deletedTasks = await prisma.agentTask.deleteMany({
      where: { sessionId: session.id },
    });

    // 删除已有幻灯片
    const deletedSlides = await prisma.slide.deleteMany({
      where: { projectId: project.id },
    });

    console.log(`    删除: ${deletedMsgs.count} 消息, ${deletedTasks.count} 任务, ${deletedSlides.count} 幻灯片`);

    // ── Step 2: 创建任务 ──
    console.log('  创建任务...');

    const now = new Date();
    const taskBaseTime = new Date(now.getTime() - 60 * 60 * 1000); // 1小时前开始
    const taskInterval = 5 * 60 * 1000; // 每个任务间隔5分钟

    // CONFIG_CONFIRM 任务
    const configTask = await prisma.agentTask.create({
      data: {
        sessionId: session.id,
        type: 'CONFIG_CONFIRM',
        status: 'COMPLETED',
        priority: 110,
        progress: 100,
        pointsCost: 0,
        params: JSON.stringify({
          topic: config.topic,
          pageCount: config.pageCount,
          styleName: config.styleName,
          aspectRatio: config.aspectRatio,
          requirements: config.requirements,
        }),
        result: JSON.stringify({
          type: 'CONFIG_CONFIRM',
          topic: config.topic,
          config: {
            topic: config.topic,
            pageCount: config.pageCount,
            styleName: config.styleName,
            aspectRatio: config.aspectRatio,
            colorPalette: config.colorPalette,
            colorPaletteName: config.colorPaletteName,
            requirements: config.requirements,
            pagesPerGeneration: 1,
            pageStructure: {
              cover: 1,
              directory: 1,
              transition: 0,
              content: config.pageCount - 3,
              end: 1,
            },
            configSource: 'ai_recommended',
            hasCompleteConfig: true,
          },
          pointsUsed: 0,
          configSource: 'ai_recommended',
        }),
        startedAt: taskBaseTime,
        completedAt: new Date(taskBaseTime.getTime() + taskInterval),
      },
    });

    // OUTLINE 任务
    const outlineTask = await prisma.agentTask.create({
      data: {
        sessionId: session.id,
        type: 'OUTLINE',
        status: 'COMPLETED',
        priority: 100,
        progress: 100,
        pointsCost: 5,
        params: JSON.stringify({
          topic: config.topic,
          pageCount: config.pageCount,
          styleName: config.styleName,
          aspectRatio: config.aspectRatio,
          requirements: config.requirements,
        }),
        result: JSON.stringify({
          title: config.topic,
          slides: generateOutlineSlides(config),
          slideCount: config.pageCount,
          pointsUsed: 5,
        }),
        startedAt: new Date(taskBaseTime.getTime() + taskInterval * 2),
        completedAt: new Date(taskBaseTime.getTime() + taskInterval * 3),
      },
    });

    // CONTENT 任务
    const outlineSlides = generateOutlineSlides(config);
    const contentTask = await prisma.agentTask.create({
      data: {
        sessionId: session.id,
        type: 'CONTENT',
        status: 'COMPLETED',
        priority: 80,
        progress: 100,
        pointsCost: config.pageCount,
        params: JSON.stringify({ slideCount: config.pageCount }),
        result: JSON.stringify({
          slidesProcessed: config.pageCount,
          slides: outlineSlides.map(s => ({
            id: s.id,
            index: s.index,
            title: s.title,
            content: s.content.substring(0, 200),
          })),
          pointsUsed: config.pageCount,
        }),
        startedAt: new Date(taskBaseTime.getTime() + taskInterval * 4),
        completedAt: new Date(taskBaseTime.getTime() + taskInterval * 5),
      },
    });

    totalTasksCreated += 3;
    console.log(`    ✅ 创建 3 个任务: CONFIG_CONFIRM, OUTLINE, CONTENT`);

    // ── Step 3: 创建消息 ──
    console.log('  创建对话消息...');

    const messageTime = taskBaseTime;
    const msgInterval = 2 * 60 * 1000; // 消息间隔2分钟

    // Message 1: 用户请求
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: generateUserMessage(config),
        createdAt: messageTime,
      },
    });

    // Message 2: AI 配置确认
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: generateConfigConfirmMessage(config),
        metadata: JSON.stringify({ taskId: configTask.id }),
        createdAt: new Date(messageTime.getTime() + msgInterval),
      },
    });

    // Message 3: 配置已确认
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: generateConfigConfirmedMessage(config),
        metadata: JSON.stringify({ taskId: configTask.id, taskType: 'CONFIG_CONFIRM', pointsUsed: 0 }),
        createdAt: new Date(messageTime.getTime() + msgInterval * 2),
      },
    });

    // Message 4: 大纲生成完成
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: generateOutlineCompleteMessage(config),
        metadata: JSON.stringify({ taskId: outlineTask.id, taskType: 'OUTLINE', pointsUsed: 5 }),
        createdAt: new Date(messageTime.getTime() + msgInterval * 3),
      },
    });

    // Message 5: 大纲已确认
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: generateOutlineConfirmedMessage(config),
        metadata: JSON.stringify({ taskId: outlineTask.id }),
        createdAt: new Date(messageTime.getTime() + msgInterval * 4),
      },
    });

    // Message 6: 内容生成完成
    await prisma.agentMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: generateContentCompleteMessage(config),
        metadata: JSON.stringify({ taskId: contentTask.id, taskType: 'CONTENT', pointsUsed: config.pageCount }),
        createdAt: new Date(messageTime.getTime() + msgInterval * 5),
      },
    });

    totalMessagesCreated += 6;
    console.log(`    ✅ 创建 6 条消息: user(1) + assistant(5)`);

    // ── Step 4: 创建幻灯片 ──
    console.log('  创建幻灯片...');

    for (const outlineSlide of outlineSlides) {
      const content = generateSlideContent(
        outlineSlide.pageType,
        outlineSlide.title,
        config,
        outlineSlide.index
      );

      await prisma.slide.create({
        data: {
          projectId: project.id,
          index: outlineSlide.index,
          pageType: outlineSlide.pageType,
          contentType: 'text',
          title: outlineSlide.title,
          content,
          brief: outlineSlide.content,
          variantCount: 2,
          status: 'completed',
        },
      });
    }

    totalSlidesUpdated += outlineSlides.length;
    console.log(`    ✅ 创建 ${outlineSlides.length} 页幻灯片`);

    // ── Step 5: 更新 Session ──
    await prisma.agentSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalTasks: 3,
        completedTasks: 3,
        failedTasks: 0,
        totalPointsUsed: 5 + config.pageCount,
        context: JSON.stringify({
          topic: config.topic,
          pageCount: config.pageCount,
          style: config.style,
          styleName: config.styleName,
          aspectRatio: config.aspectRatio,
          colorPalette: config.colorPalette,
          colorPaletteName: config.colorPaletteName,
          requirements: config.requirements,
          currentStep: '配图',
          confirmedOutline: true,
          confirmedContent: true,
          confirmedConfig: true,
          plannedTasks: ['CONFIG_CONFIRM', 'OUTLINE', 'CONTENT', 'IMAGE'],
        }),
      },
    });
    console.log('  ✅ Session 更新为 COMPLETED');

    // ── Step 6: 更新 Project ──
    await prisma.project.update({
      where: { id: project.id },
      data: {
        title: config.title !== project.title && config.title !== '智能手表新品演示文稿'
          ? config.title
          : project.title,
        status: 'completed',
        completedAt: new Date(),
        globalConfig: JSON.stringify({
          targetPageCount: config.pageCount,
          styleName: config.styleName,
          aspectRatio: config.aspectRatio,
          colorPalette: config.colorPalette,
          colorPaletteName: config.colorPaletteName,
        }),
      },
    });
    console.log('  ✅ Project 更新为 completed');

    totalProjectsUpdated++;
  }

  // ── 最终报告 ──
  console.log('\n' + '='.repeat(60));
  console.log('数据模拟完成！');
  console.log(`  项目更新数: ${totalProjectsUpdated}`);
  console.log(`  创建消息数: ${totalMessagesCreated}`);
  console.log(`  创建任务数: ${totalTasksCreated}`);
  console.log(`  创建幻灯片数: ${totalSlidesUpdated}`);
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
