// scripts/migrate-historical-data.ts
// 数据库迁移脚本：将所有 userId = null 的历史数据分配给管理员账号

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateHistoricalData() {
    console.log('='.repeat(60));
    console.log('🔄 开始数据库迁移：历史数据归属管理员');
    console.log('='.repeat(60));

    try {
        // 1. 查找管理员账号（优先 SUPER_ADMIN，其次 ADMIN）
        const admin = await prisma.user.findFirst({
            where: {
                OR: [
                    { role: 'SUPER_ADMIN' },
                    { role: 'ADMIN' }
                ]
            },
            orderBy: {
                createdAt: 'asc' // 使用最早的管理员账号
            }
        });

        if (!admin) {
            throw new Error('❌ 未找到管理员账号！请先创建管理员账号。');
        }

        console.log(`\n✅ 找到管理员账号: ${admin.email || admin.username} (${admin.role})`);
        console.log(`   ID: ${admin.id}\n`);

        // 2. 统计需要迁移的数据
        const [projectCount, templateCount, favoriteCount] = await Promise.all([
            prisma.project.count({ where: { userId: null } }),
            prisma.styleTemplate.count({ where: { userId: null } }),
            prisma.favorite.count({ where: { userId: null } })
        ]);

        console.log('📊 待迁移数据统计:');
        console.log(`   - Project: ${projectCount} 条`);
        console.log(`   - StyleTemplate: ${templateCount} 条`);
        console.log(`   - Favorite: ${favoriteCount} 条`);
        console.log(`   总计: ${projectCount + templateCount + favoriteCount} 条\n`);

        if (projectCount + templateCount + favoriteCount === 0) {
            console.log('✨ 没有需要迁移的数据，退出。\n');
            return;
        }

        // 3. 执行迁移（使用事务确保原子性）
        const result = await prisma.$transaction(async (tx) => {
            const updates = {
                projects: 0,
                templates: 0,
                favorites: 0
            };

            // 更新 Project
            if (projectCount > 0) {
                const { count } = await tx.project.updateMany({
                    where: { userId: null },
                    data: { userId: admin.id }
                });
                updates.projects = count;
                console.log(`✅ 已更新 ${count} 条 Project 记录`);
            }

            // 更新 StyleTemplate
            if (templateCount > 0) {
                const { count } = await tx.styleTemplate.updateMany({
                    where: { userId: null },
                    data: { userId: admin.id }
                });
                updates.templates = count;
                console.log(`✅ 已更新 ${count} 条 StyleTemplate 记录`);
            }

            // 更新 Favorite
            if (favoriteCount > 0) {
                const { count } = await tx.favorite.updateMany({
                    where: { userId: null },
                    data: { userId: admin.id }
                });
                updates.favorites = count;
                console.log(`✅ 已更新 ${count} 条 Favorite 记录`);
            }

            return updates;
        });

        console.log('\n' + '='.repeat(60));
        console.log('🎉 迁移完成！');
        console.log('='.repeat(60));
        console.log(`   总计更新: ${result.projects + result.templates + result.favorites} 条记录`);
        console.log(`   归属于: ${admin.email || admin.username}\n`);

    } catch (error) {
        console.error('\n❌ 迁移失败:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// 执行迁移
migrateHistoricalData()
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });
