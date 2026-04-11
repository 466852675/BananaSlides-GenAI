/**
 * 从旧数据库恢复历史库数据 - 使用原生SQL
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// 当前数据库
const currentPrisma = new PrismaClient();

// 旧数据库（从 git 历史提取）
const oldDbPath = path.resolve('../temp_old_db.db');
console.log('旧数据库路径:', oldDbPath);

const oldPrisma = new PrismaClient({
  datasources: { db: { url: 'file:' + oldDbPath } }
});

async function restoreFromOldDb() {
  console.log('='.repeat(80));
  console.log('从旧数据库恢复历史库');
  console.log('='.repeat(80));

  try {
    // 用原生SQL查询旧数据库已完成的项目（旧表没有 isDeleted 和 source 字段）
    const oldProjects = await oldPrisma.$queryRaw`
      SELECT id, title, status, completedAt
      FROM Project
      WHERE completedAt IS NOT NULL
    `;

    console.log('旧数据库已完成项目:', oldProjects.length);

    // 查询旧数据库的幻灯片
    const oldSlides = await oldPrisma.$queryRaw`
      SELECT id, projectId, status, previewUrl, variants
      FROM Slide
    `;

    console.log('旧数据库幻灯片:', oldSlides.length);

    // 恢复到当前数据库
    console.log('\n' + '='.repeat(80));
    console.log('开始恢复到当前数据库');
    console.log('='.repeat(80));

    let restoredIde = 0;
    let restoredAgent = 0;

    for (const oldProject of oldProjects) {
      // 检查当前数据库是否存在该项目
      const existing = await currentPrisma.project.findUnique({
        where: { id: oldProject.id }
      });

      if (existing) {
        // 更新项目
        await currentPrisma.project.update({
          where: { id: oldProject.id },
          data: {
            status: 'completed',
            completedAt: oldProject.completedAt
          }
        });

        // 获取该项目的幻灯片
        const projectSlides = oldSlides.filter(s => s.projectId === oldProject.id);

        // 更新幻灯片
        for (const slide of projectSlides) {
          try {
            await currentPrisma.slide.updateMany({
              where: { id: slide.id },
              data: {
                status: 'success',
                previewUrl: slide.previewUrl,
                variants: slide.variants
              }
            });
          } catch (e) {
            // 幻灯片可能不存在
          }
        }

        if (existing.source === 'IDE') restoredIde++;
        else if (existing.source === 'AGENT') restoredAgent++;

        console.log('✅ 已恢复:', oldProject.title, '(' + existing.source + ')');
      } else {
        console.log('⚠️ 项目不存在:', oldProject.title);
      }
    }

    // 验证恢复结果
    const finalIde = await currentPrisma.project.findMany({
      where: { isDeleted: false, source: 'IDE', completedAt: { not: null } }
    });
    const finalAgent = await currentPrisma.project.findMany({
      where: { isDeleted: false, source: 'AGENT', completedAt: { not: null } }
    });

    console.log('\n恢复后统计:');
    console.log('IDE历史库:', finalIde.length);
    console.log('Agent历史库:', finalAgent.length);

    console.log('\nIDE历史库项目:');
    finalIde.forEach((p, i) => console.log('  [' + (i+1) + '] ' + p.title));

    console.log('\nAgent历史库项目:');
    finalAgent.forEach((p, i) => console.log('  [' + (i+1) + '] ' + p.title));

  } catch (e) {
    console.error('错误:', e);
  } finally {
    await oldPrisma.$disconnect();
    await currentPrisma.$disconnect();
  }
}

restoreFromOldDb();