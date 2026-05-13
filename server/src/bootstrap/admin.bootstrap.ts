// server/src/bootstrap/admin.bootstrap.ts
// 管理员初始化脚本：启动时自动创建默认管理员

import { UserRole, UserStatus } from '../types/user.types';
import { hashPassword } from '../utils/password.util';
import { prisma } from '../db';
import { SettingService } from '../services/setting.service';

/**
 * 默认管理员配置
 */
const DEFAULT_ADMIN = {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@local',
    username: process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin12345678',
    nickname: '系统管理员',
};

/**
 * 是否接管所有无主数据
 */
const TAKE_OVER_MODE = process.env.BOOTSTRAP_ADMIN_TAKE_OVER === '1';

/**
 * 启动时初始化管理员账号
 */
export async function bootstrapAdmin(): Promise<void> {
    console.log('[Bootstrap] 检查管理员账号...');

    try {
        // 1. 检查是否已存在管理员
        const existingAdmin = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: DEFAULT_ADMIN.email },
                    { username: DEFAULT_ADMIN.username },
                ],
            },
        });

        if (existingAdmin) {
            console.log(`[Bootstrap] 管理员账号已存在: ${existingAdmin.username || existingAdmin.email}`);

            // 如果需要接管无主数据
            if (TAKE_OVER_MODE) {
                await takeOverOrphanData(existingAdmin.id);
            }
            return;
        }

        // 2. 创建管理员账号
        const passwordHash = await hashPassword(DEFAULT_ADMIN.password);

        const admin = await prisma.user.create({
            data: {
                email: DEFAULT_ADMIN.email,
                username: DEFAULT_ADMIN.username,
                passwordHash,
                nickname: DEFAULT_ADMIN.nickname,
                role: UserRole.SUPER_ADMIN,
                status: UserStatus.ACTIVE,
                points: 999999, // 管理员无限积分
            },
        });

        console.log(`[Bootstrap] ✅ 默认管理员账号已创建`);
        console.log(`[Bootstrap]    用户名: ${admin.username}`);
        console.log(`[Bootstrap]    邮箱: ${admin.email}`);
        console.log(`[Bootstrap]    角色: ${admin.role}`);

        // 3. 如果需要接管无主数据
        if (TAKE_OVER_MODE) {
            await takeOverOrphanData(admin.id);
        }

    } catch (error) {
        console.error('[Bootstrap] 管理员初始化失败:', error);
        throw error;
    }
}

/**
 * 接管所有无主数据（Project、StyleTemplate、Favorite）
 */
async function takeOverOrphanData(adminId: string): Promise<void> {
    console.log('[Bootstrap] 正在接管无主数据...');

    // 接管无主项目
    const projectResult = await prisma.project.updateMany({
        where: { userId: null },
        data: { userId: adminId },
    });

    // 接管无主模板
    const templateResult = await prisma.styleTemplate.updateMany({
        where: { userId: null },
        data: { userId: adminId },
    });

    // 接管无主收藏
    const favoriteResult = await prisma.favorite.updateMany({
        where: { userId: null },
        data: { userId: adminId },
    });

    console.log(`[Bootstrap] ✅ 无主数据接管完成`);
    console.log(`[Bootstrap]    项目: ${projectResult.count} 个`);
    console.log(`[Bootstrap]    模板: ${templateResult.count} 个`);
    console.log(`[Bootstrap]    收藏: ${favoriteResult.count} 个`);
}

/**
 * 初始化默认积分规则
 */
export async function bootstrapPointsRules(): Promise<void> {
    console.log('[Bootstrap] 检查积分规则...');

    const defaultRules = [
        { code: 'outline_generation', name: 'AI大纲生成', costPoints: 5, description: '使用AI生成PPT大纲' },
        { code: 'slide_content', name: '单页正文扩充', costPoints: 2, description: 'AI扩充单页内容' },
        { code: 'slide_image', name: '单页图片生成', costPoints: 10, description: 'AI生成单页背景图' },
        { code: 'doc_parse', name: '文档解析', costPoints: 3, description: 'PDF/Word文档解析' },
        { code: 'vision_analysis', name: '视觉分析', costPoints: 3, description: '参考图风格提取' },
    ];

    for (const rule of defaultRules) {
        await prisma.pointsRule.upsert({
            where: { code: rule.code },
            update: {}, // 已存在则不更新
            create: {
                code: rule.code,
                name: rule.name,
                costPoints: rule.costPoints,
                description: rule.description,
                isActive: true,
                sortOrder: defaultRules.indexOf(rule),
            },
        });
    }

    console.log(`[Bootstrap] ✅ 积分规则初始化完成 (${defaultRules.length} 条)`);
}

/**
 * 初始化默认权限
 */
export async function bootstrapPermissions(): Promise<void> {
    console.log('[Bootstrap] 检查权限配置...');

    const defaultPermissions = [
        { code: 'admin.access', name: '访问管理后台', module: 'ADMIN' },
        { code: 'admin.users.read', name: '查看用户列表', module: 'USERS' },
        { code: 'admin.users.write', name: '编辑用户', module: 'USERS' },
        { code: 'admin.users.delete', name: '删除用户', module: 'USERS' },
        { code: 'admin.orders.read', name: '查看订单', module: 'ORDERS' },
        { code: 'admin.orders.write', name: '编辑订单', module: 'ORDERS' },
        { code: 'admin.orders.refund', name: '订单退款', module: 'ORDERS' },
        { code: 'admin.points.read', name: '查看积分规则', module: 'POINTS' },
        { code: 'admin.points.write', name: '编辑积分规则', module: 'POINTS' },
        { code: 'admin.roles.read', name: '查看角色权限', module: 'ROLES' },
        { code: 'admin.roles.write', name: '编辑角色权限', module: 'ROLES' },
        { code: 'admin.system.read', name: '查看系统设置', module: 'SETTINGS' },
        { code: 'admin.system.write', name: '编辑系统设置', module: 'SETTINGS' },
    ];

    for (const perm of defaultPermissions) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {},
            create: {
                code: perm.code,
                name: perm.name,
                module: perm.module,
                sortOrder: defaultPermissions.indexOf(perm),
            },
        });
    }

    console.log(`[Bootstrap] ✅ 权限配置初始化完成 (${defaultPermissions.length} 条)`);
}

/**
 * 初始化商业化配置
 */
async function bootstrapCommercialConfig(): Promise<void> {
    try {
        const config = await SettingService.getCommercialConfig();
        if (config.auditLog.length === 0) {
            const enabled = process.env.COMMERCIAL_ENABLED === 'true';
            const settings = await SettingService.getSettings();
            if (!settings?.commercial) {
                console.log(`[Bootstrap] 初始化商业化配置: COMMERCIAL_ENABLED=${enabled}`);
                await SettingService.updateCommercialConfig(
                    enabled,
                    [],
                    { id: 'SYSTEM', name: '系统初始化' }
                );
            }
        }
    } catch (error) {
        console.error('[Bootstrap] 初始化商业化配置失败:', error);
    }
}

/**
 * 执行所有初始化任务
 */
export async function runBootstrap(): Promise<void> {
    console.log('[Bootstrap] ========== 开始系统初始化 ==========');

    await bootstrapAdmin();
    await bootstrapPointsRules();
    await bootstrapPermissions();

    // 初始化商业化配置（如果尚未初始化）
    await bootstrapCommercialConfig();

    console.log('[Bootstrap] ========== 系统初始化完成 ==========');
}
