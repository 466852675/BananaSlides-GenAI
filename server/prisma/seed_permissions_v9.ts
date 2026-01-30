
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// V9.5 完整权限矩阵定义
const ALL_PERMISSIONS = [
    // --- 用户侧 (Creation / History / Template) ---
    { code: 'history.view', name: '浏览项目列表', module: 'HISTORY', description: '允许访问项目列表页及历史记录控制台，查看基本概览。' },
    { code: 'history.create', name: '创建新项目', module: 'HISTORY', description: '允许创建新的 PPT 项目，包括空白项目或基于模版创建。' },
    { code: 'history.delete', name: '删除项目', module: 'HISTORY', description: '允许将项目移入回收站或彻底删除。' },
    { code: 'history.snapshot', name: '版本快照/恢复', module: 'HISTORY', description: '允许创建项目版本快照，并支持回滚到历史版本或基于快照创建新项目。' },

    { code: 'creation.outline.input', name: '输入/上传大纲', module: 'CREATION', description: '允许在创作室输入文本主题或上传 Word/PDF/Markdown 文件作为大纲。' },
    { code: 'creation.outline.refine', name: 'AI 大纲润色', module: 'CREATION', description: '允许使用 AI 对大纲结构进行智能优化、扩充或改写。' },
    { code: 'creation.outline.generate', name: 'AI 生成大纲', module: 'CREATION', description: '允许根据简短主题自动生成完整的 PPT 结构大纲。' },
    { code: 'creation.slide.generate', name: 'AI 生成正文页', module: 'CREATION', description: '允许 AI 根据大纲内容生成具体的幻灯片页面内容。' },
    { code: 'creation.batch_generate', name: '批量生成 (工作台)', module: 'CREATION', description: '允许一键批量生成整个项目的所有页面，需消耗大量积分。' },
    { code: 'creation.page.add', name: '手动添加页面', module: 'CREATION', description: '允许在工作台手动添加空白页、过渡页或目录页。' },
    { code: 'creation.page.duplicate', name: '复制页面', module: 'CREATION', description: '允许复制现有的幻灯片页面及其布局内容。' },
    { code: 'creation.export', name: '导出 PPTX/PDF', module: 'CREATION', description: '允许将生成的演示文稿导出为本地 PPTX 可编辑文件或 PDF 文档。' },

    { code: 'template.view', name: '浏览模版市场', module: 'TEMPLATE', description: '允许访问模版中心，浏览官方及公开的模版资源。' },
    { code: 'template.use', name: '应用模版', module: 'TEMPLATE', description: '允许将模版样式应用到当前项目中。' },
    { code: 'template.favorite', name: '收藏/取消收藏', module: 'TEMPLATE', description: '允许收藏喜欢的模版通过“我的收藏”快速访问。' },
    { code: 'template.create', name: '保存自定义模版', module: 'TEMPLATE', description: '允许将当前项目的样式配置保存为私有模版以供复用。' },

    // --- 管理侧 (Admin Side) ---
    { code: 'admin.access', name: '访问管理后台', module: 'ADMIN', description: '核心权限：允许登录并进入 /admin 管理后台。' },
    { code: 'admin.dashboard.view', name: '仪表盘概览', module: 'DASHBOARD', description: '允许查看系统整体运营数据、图表及关键指标概览。' },
    { code: 'admin.users.view', name: '查看用户列表', module: 'USERS', description: '允许浏览所有注册用户及其基础信息（不含敏感隐私）。' },
    { code: 'admin.users.manage', name: '管理用户 (封禁等)', module: 'USERS', description: '允许编辑用户信息、重置密码、修改权益等级或封禁账号。' },
    { code: 'admin.orders.view', name: '查看订单流水', module: 'ORDERS', description: '允许查看所有支付订单详情、状态及金额记录。' },
    { code: 'admin.orders.refund', name: '执行退款', module: 'ORDERS', description: '敏感权限：允许对已支付订单发起退款流程。' },
    { code: 'admin.products.view', name: '查看商品列表', module: 'PRODUCTS', description: '允许查看当前上架的会员套餐及充值包信息。' },
    { code: 'admin.products.manage', name: '商品上下架', module: 'PRODUCTS', description: '允许创建新商品、修改价格、调整权益或下架旧商品。' },
    { code: 'admin.leads.view', name: '查看销售线索', module: 'LEADS', description: '允许查看企业版咨询表单提交的线索数据。' },
    { code: 'admin.points.view', name: '查看积分规则', module: 'POINTS', description: '允许查看系统当前的积扣费逻辑配置。' },
    { code: 'admin.points.manage', name: '修改积分策略', module: 'POINTS', description: '敏感权限：允许调整各项 AI 操作的积分消耗数值及规则。' },
    { code: 'admin.roles.view', name: '查看角色权限', module: 'ROLES', description: '允许查看系统角色定义及其权限分配矩阵。' },
    { code: 'admin.roles.manage', name: '修改权限分配', module: 'ROLES', description: '特权权限：允许修改各角色的功能访问权限（SuperAdmin专用）。' },
    { code: 'admin.ai.view', name: '查看模型状态', module: 'AI', description: '允许查看 AI 供应商配置、Key 池状态及模型路由策略。' },
    { code: 'admin.ai.manage', name: '切换模型/Key池', module: 'AI', description: '敏感权限：允许添加/删除 API Key，或切换默认 AI 模型。' },
    { code: 'admin.settings.view', name: '查看系统信息', module: 'SETTINGS', description: '允许查看站点元数据、运行环境及版本信息。' },
    { code: 'admin.settings.manage', name: '修改系统参数', module: 'SETTINGS', description: '敏感权限：允许修改站点名称、注册门禁及系统维护模式。' },
];

/**
 * 角色映射表 (Role Matrix)
 */
const ROLE_MATRIX: Record<UserRole, string[]> = {
    USER: ['history.view', 'template.view', 'template.use'],

    BASIC: [
        'history.view', 'template.view', 'template.use', // Inherit USER
        'history.create', 'history.delete',
        'creation.outline.input', 'creation.outline.refine',
        'creation.outline.generate', 'creation.slide.generate',
        'creation.page.add', 'creation.page.duplicate',
        'template.favorite'
    ],

    PROFESSIONAL: [
        // Inherit BASIC (Explicitly listed for clarity)
        'history.view', 'template.view', 'template.use',
        'history.create', 'history.delete',
        'creation.outline.input', 'creation.outline.refine',
        'creation.outline.generate', 'creation.slide.generate',
        'creation.page.add', 'creation.page.duplicate',
        'template.favorite',
        // Pro features
        'creation.export', 'creation.batch_generate'
    ],

    PREMIUM: [
        // Inherit PRO (Explicitly listed)
        'history.view', 'template.view', 'template.use',
        'history.create', 'history.delete',
        'creation.outline.input', 'creation.outline.refine',
        'creation.outline.generate', 'creation.slide.generate',
        'creation.page.add', 'creation.page.duplicate',
        'template.favorite', 'creation.export', 'creation.batch_generate',
        // Premium features
        'history.snapshot', 'template.create'
    ],

    ENTERPRISE: [
        // All User Side
        'history.view', 'template.view', 'template.use',
        'history.create', 'history.delete', 'history.snapshot',
        'creation.outline.input', 'creation.outline.refine', 'creation.outline.generate',
        'creation.slide.generate', 'creation.batch_generate', 'creation.page.add',
        'creation.page.duplicate', 'creation.export',
        'template.favorite', 'template.create'
    ],

    ADMIN: [
        // All User Side
        'history.view', 'template.view', 'template.use',
        'history.create', 'history.delete', 'history.snapshot',
        'creation.outline.input', 'creation.outline.refine', 'creation.outline.generate',
        'creation.slide.generate', 'creation.batch_generate', 'creation.page.add',
        'creation.page.duplicate', 'creation.export',
        'template.favorite', 'template.create',
        // Admin Business Features
        'admin.access', 'admin.dashboard.view',
        'admin.users.view', 'admin.users.manage',
        'admin.orders.view',
        'admin.products.view',
        'admin.leads.view',
        'admin.points.view',
        'admin.roles.view',
        'admin.settings.view',
        'admin.ai.view'
    ],

    SUPER_ADMIN: [
        // EVERYTHING
        ...ALL_PERMISSIONS.map(p => p.code)
    ]
};

async function main() {
    console.log('🚀 开始执行 V9.5 权限系统种子填充 (Safe Upsert Mode)...');

    // 1. 同步 Permissions (Upsert)
    console.log(`📋 正在同步 ${ALL_PERMISSIONS.length} 个权限定义...`);
    for (const perm of ALL_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { code: perm.code },
            update: {
                name: perm.name,
                module: perm.module,
                description: perm.description
            },
            create: {
                code: perm.code,
                name: perm.name,
                module: perm.module,
                description: perm.description
            }
        });
    }
    console.log('✅ 权限定义同步完成。');

    // 2. 同步 Roles (Upsert Relation)
    // 注意：Prisma 没有直接的 "bulk upsert relation"，我们需要先清理旧关联再重新建立，或者逐个检查。
    // 为了安全且确保一致性，也是为了修正之前可能存在的错误关联，
    // 我们选择：对于每个角色，先查询现有关联，计算 diff，然后增删。
    // 但为了简化逻辑且确保最终状态一致，"删除该角色所有旧权限 -> 写入新权限" 是标准做法。
    // 前提是不删除 Role 本身，只删除 RolePermission 记录。

    console.log('🔗 正在重建 UserRole -> Permission 映射关系...');

    for (const role of Object.keys(ROLE_MATRIX) as UserRole[]) {
        const targetCodes = ROLE_MATRIX[role];

        // 2.1 找到对应的 Permission IDs
        const permissions = await prisma.permission.findMany({
            where: { code: { in: targetCodes } },
            select: { id: true, code: true }
        });

        if (permissions.length !== targetCodes.length) {
            console.warn(`⚠️  警告: 角色 [${role}] 预期有 ${targetCodes.length} 个权限，实际库中只找到 ${permissions.length} 个。请检查拼写。`);
            const foundCodes = permissions.map(p => p.code);
            const missing = targetCodes.filter(c => !foundCodes.includes(c));
            console.warn(`   缺失: ${missing.join(', ')}`);
        }

        // 2.2 事务更新：删除该角色旧关联 -> 插入新关联
        // RolePermission 表通过 [role, permissionId] 唯一，但我们想重置该角色的所有权限
        await prisma.$transaction(async (tx) => {
            // 移除该角色当前的所有权限关联
            await tx.rolePermission.deleteMany({
                where: { role: role }
            });

            // 插入新的
            if (permissions.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissions.map(p => ({
                        role: role,
                        permissionId: p.id
                    }))
                });
            }
        });

        console.log(`   └─ 角色 [${role}] 已绑定 ${permissions.length} 个权限点。`);
    }

    console.log('🎉 权限系统 V9.5 更新完成！(所有用户数据保持完好)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
