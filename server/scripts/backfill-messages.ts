/**
 * 补全已完成项目的对话历史
 * 根据任务记录生成缺失的对话消息
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 开始补全对话历史 ===\n');

  // 1. 查找所有已完成的会话
  const completedSessions = await prisma.agentSession.findMany({
    where: {
      status: 'COMPLETED'
    },
    select: {
      id: true,
      projectId: true,
      createdAt: true,
      completedAt: true
    }
  });

  console.log(`找到 ${completedSessions.length} 个已完成的会话\n`);

  for (const session of completedSessions) {
    console.log(`处理会话: ${session.id}`);

    // 2. 获取该会话的所有任务
    const tasks = await prisma.agentTask.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' }
    });

    // 3. 获取现有的消息数量
    const existingMessages = await prisma.agentMessage.count({
      where: { sessionId: session.id }
    });

    console.log(`  现有消息数: ${existingMessages}, 任务数: ${tasks.length}`);

    // 4. 为每个已完成的任务创建对话消息（如果不存在）
    for (const task of tasks) {
      if (task.status !== 'COMPLETED') continue;

      // 检查是否已有该任务类型的完成消息
      const existingMsg = await prisma.agentMessage.findFirst({
        where: {
          sessionId: session.id,
          role: 'assistant',
          metadata: { contains: `"taskType":"${task.type}"` }
        }
      });

      if (existingMsg) {
        console.log(`  跳过 ${task.type}: 已有完成消息`);
        continue;
      }

      // 解析任务结果
      let result: any = {};
      if (task.result) {
        try {
          result = JSON.parse(task.result);
        } catch (e) {
          console.log(`  无法解析任务结果: ${task.type}`);
        }
      }

      // 生成消息内容
      let content = '';
      const pointsUsed = task.pointsCost || 0;

      switch (task.type) {
        case 'CONFIG_CONFIRM':
          content = `✅ 配置已确认！主题：${result.topic || '演示文稿'}，共 ${result.config?.pageCount || 10} 页，${result.config?.styleName || '商务'}风格。正在为您生成大纲...`;
          break;
        case 'OUTLINE':
          const slideCount = result.slides?.length || 0;
          content = `✅ 大纲生成完成！已为您规划 ${slideCount} 页内容结构。请查看大纲详情，确认后我将生成详细内容。`;
          break;
        case 'CONTENT':
          const contentSlides = result.slides?.length || result.slidesProcessed || 0;
          content = `✅ 内容生成完成！已为 ${contentSlides} 页幻灯片生成详细内容。请查看并确认，确认后我将为您生成配图。`;
          break;
        case 'IMAGE':
          const imageCount = result.images?.length || result.imagesGenerated || 0;
          content = `✅ 配图生成完成！已生成 ${imageCount} 张精美配图。演示文稿制作完成！消耗积分：${pointsUsed} 分。`;
          break;
        default:
          content = `✅ ${task.type} 任务已完成。`;
      }

      // 创建消息
      if (content) {
        await prisma.agentMessage.create({
          data: {
            sessionId: session.id,
            role: 'assistant',
            content,
            metadata: JSON.stringify({ taskType: task.type, pointsUsed }),
            createdAt: task.completedAt || task.updatedAt
          }
        });
        console.log(`  ✓ 已添加 ${task.type} 完成消息`);
      }
    }

    console.log('');
  }

  console.log('=== 补全完成 ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());