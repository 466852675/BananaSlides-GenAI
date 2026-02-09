// server/src/services/admin.service.ts
// 管理员服务：用户管理、订单管理、积分规则管理

import { UserRole, UserStatus, OrderStatus } from '@prisma/client';
import { hashPassword } from '../utils/password.util';
import { prisma } from '../db';

// ============================================================
// 用户管理
// ============================================================

export interface UserListFilters {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    vipLevel?: number;
    sortBy?: 'createdAt' | 'points' | 'lastLoginAt';
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
    amountType?: 'points' | 'spent';
    minAmount?: number;
    maxAmount?: number;
}

export interface Pagination {
    page: number;
    limit: number;
}

/**
 * 创建新用户
 */
export async function createUser(data: any, adminId: string) {
    const { email, password, nickname, role, vipLevel, points } = data;

    // 检查邮箱是否已存在
    if (email) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('该邮箱已被注册');
        }
    }

    // Hash 密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
        data: {
            email,
            username: email.split('@')[0], // 默认用户名
            passwordHash: hashedPassword, // Fix: password -> passwordHash
            nickname: nickname || '新用户',
            role: role || UserRole.USER,
            vipLevel: vipLevel || 0,
            points: points || 0,
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });

    return user;
}

/**
 * 获取用户列表
 */
export async function listUsers(filters: UserListFilters, pagination: Pagination) {
    const {
        search, role, status, vipLevel,
        sortBy = 'createdAt', sortOrder = 'desc',
        startDate, endDate,
        amountType, minAmount, maxAmount
    } = filters;
    const { page, limit } = pagination;

    // 构建查询条件
    const where: any = {};

    if (search) {
        where.OR = [
            { email: { contains: search } },
            { nickname: { contains: search } },
            { phone: { contains: search } },
            { username: { contains: search } },
        ];
    }

    if (role) {
        where.role = role;
    }

    if (status) {
        where.status = status;
    }

    if (vipLevel !== undefined) {
        where.vipLevel = vipLevel;
    }

    // 积分筛选 (数据库层过滤)
    if (amountType === 'points') {
        if (minAmount !== undefined || maxAmount !== undefined) {
            where.points = {};
            if (minAmount !== undefined) where.points.gte = minAmount;
            if (maxAmount !== undefined) where.points.lte = maxAmount;
        }
    }

    // 注册时间范围筛选
    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
            where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            where.createdAt.lte = end;
        }
    }

    // 分页查询与统计
    const [rawItems, total, allProjectCount] = await Promise.all([
        prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                phone: true,
                username: true,
                nickname: true,
                avatar: true,
                role: true,
                status: true,
                points: true,
                pointsUsed: true,
                vipLevel: true,
                lastLoginAt: true,
                createdAt: true,
                _count: {
                    select: { projects: true }
                },
                orders: {
                    where: { status: 'PAID' },
                    select: { finalPrice: true }
                }
            },
            orderBy: { [sortBy]: sortOrder },
            // 如果是 spent 筛选，我们需要全量数据来过滤，暂不进行数据库层分页
            ...(amountType === 'spent' ? {} : {
                skip: (page - 1) * limit,
                take: limit,
            })
        }),
        prisma.user.count({ where }),
        prisma.project.count(), // 获取全站项目总数
    ]);

    // 转换为前端期望的格式并处理 spent 筛选
    let items = rawItems.map(item => {
        const { _count, ...rest } = item as any;
        const isAdminType = item.role === UserRole.SUPER_ADMIN || item.role === UserRole.ADMIN;
        const totalSpent = (rest.orders || []).reduce((sum: number, order: any) => sum + (order.finalPrice || 0), 0);

        return {
            ...rest,
            projectCount: isAdminType ? allProjectCount : (_count?.projects || 0),
            totalSpent
        };
    });

    // 累计消费筛选 (内存层过滤)
    if (amountType === 'spent') {
        if (minAmount !== undefined || maxAmount !== undefined) {
            items = items.filter(user => {
                const val = user.totalSpent || 0;
                if (minAmount !== undefined && val < minAmount) return false;
                if (maxAmount !== undefined && val > maxAmount) return false;
                return true;
            });
        }
    }

    // 重新计算分页信息 (如果进行了内存过滤)
    let finalTotal = total;
    if (amountType === 'spent') {
        finalTotal = items.length;
        // 手动执行分页裁剪
        const startIndex = (page - 1) * limit;
        items = items.slice(startIndex, startIndex + limit);
    }

    return {
        items,
        pagination: {
            page,
            limit,
            total: finalTotal,
            totalPages: Math.ceil(finalTotal / limit),
        },
    };
}

/**
 * 获取用户详情
 */
export async function getUserById(id: string) {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            phone: true,
            username: true,
            nickname: true,
            avatar: true,
            bio: true,
            role: true,
            status: true,
            points: true,
            pointsUsed: true,
            vipLevel: true,
            vipExpiresAt: true,
            lastLoginAt: true,
            lastLoginIp: true,
            loginFailCount: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!user) {
        return null;
    }

    // 获取统计信息
    const [projectCount, orderCount, transactionCount] = await Promise.all([
        prisma.project.count({ where: { userId: id } }),
        prisma.order.count({ where: { userId: id } }),
        prisma.transaction.count({ where: { userId: id } }),
    ]);

    return {
        ...user,
        statistics: {
            projectCount,
            orderCount,
            transactionCount,
        },
    };
}

/**
 * 更新用户信息
 */
export async function updateUser(
    id: string,
    data: {
        nickname?: string;
        role?: UserRole;
        status?: UserStatus;
        points?: number;
        vipLevel?: number;
    },
    operatorId: string
) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new Error('用户不存在');
    }

    const updateData: any = {};

    if (data.nickname !== undefined) {
        updateData.nickname = data.nickname;
    }

    if (data.role !== undefined) {
        // 不能修改超级管理员的角色
        if (user.role === UserRole.SUPER_ADMIN) {
            throw new Error('无法修改超级管理员角色');
        }
        updateData.role = data.role;
    }

    if (data.status !== undefined) {
        updateData.status = data.status;
    }

    if (data.vipLevel !== undefined) {
        updateData.vipLevel = data.vipLevel;
        // 如果管理员只修改了 VIP 等级，且当前角色是普通商业角色 (非 ADMIN/SUPER_ADMIN)，则自动对齐角色名
        const nonAdminRoles: UserRole[] = [UserRole.USER, UserRole.BASIC, UserRole.PROFESSIONAL, UserRole.PREMIUM, UserRole.ENTERPRISE];
        if (data.role === undefined && (nonAdminRoles as any[]).includes(user.role)) {
            const roleMap: Record<number, UserRole> = {
                0: UserRole.USER,
                1: UserRole.BASIC,
                2: UserRole.PROFESSIONAL,
                3: UserRole.PREMIUM,
                4: UserRole.ENTERPRISE
            };
            if (roleMap[data.vipLevel]) {
                updateData.role = roleMap[data.vipLevel];
            }
        }
    }

    // 如果调整积分，创建交易记录
    if (data.points !== undefined && data.points !== user.points) {
        const diff = data.points - user.points;
        updateData.points = data.points;

        await prisma.transaction.create({
            data: {
                userId: id,
                type: 'adjust',
                amount: diff,
                balance: data.points,
                operatorId,
                description: diff > 0 ? '管理员增加积分' : '管理员扣减积分',
            },
        });
    }

    const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            email: true,
            nickname: true,
            role: true,
            status: true,
            points: true,
        },
    });

    return updated;
}

/**
 * 重置用户密码
 */
export async function resetUserPassword(id: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
        where: { id },
        data: {
            passwordHash,
            loginFailCount: 0,
            lockedUntil: null,
        },
    });
}

/**
 * 删除单个用户
 */
export async function deleteUserById(id: string) {
    // 检查是否为超级管理员，保护超管不被删除
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new Error('用户不存在');
    }
    if (user.role === UserRole.SUPER_ADMIN) {
        throw new Error('无法删除超级管理员账号');
    }

    return await prisma.user.delete({
        where: { id }
    });
}

/**
 * 批量操作用户
 */
export async function batchUserAction(
    action: 'disable' | 'enable' | 'delete',
    userIds: string[],
    operatorId: string,
    reason?: string // [V9.0] 增加操作理由
) {
    // 记录审计日志 (简单 console，实际应写入 AuditLog 表)
    if (reason) {
        console.log(`[Audit] Operator ${operatorId} performed ${action} on users [${userIds.join(', ')}]. Reason: ${reason}`);
    }

    switch (action) {
        case 'disable':
            await prisma.user.updateMany({
                where: {
                    id: { in: userIds },
                    role: { not: UserRole.SUPER_ADMIN }, // 不能禁用超管
                },
                data: { status: UserStatus.DISABLED },
            });
            break;

        case 'enable':
            await prisma.user.updateMany({
                where: { id: { in: userIds } },
                data: { status: UserStatus.ACTIVE },
            });
            break;

        case 'delete':
            // [V9.0] 硬删除：直接从数据库移除 (用户要求)
            // 先删除相关联的数据 (如果 Prisma schema 没有配置级联删除，这里需要手动处理)
            // 简单起见，假设都有级联删除配置 onDelete: Cascade
            const count = await prisma.user.deleteMany({
                where: {
                    id: { in: userIds },
                    role: { not: UserRole.SUPER_ADMIN }, // 不能删除超管
                }
            });
            return { affected: count.count };
    }

    return { affected: userIds.length };
}



// ============================================================
// 角色权限管理
// ============================================================

/**
 * 获取角色列表
 */
export async function listRoles() {
    // 硬编码角色列表，因为 Role 是 enum
    const roles = [
        { id: 'SUPER_ADMIN', name: '系统管理员', description: '拥有系统所有权限及其最高管理权' },
        { id: 'ADMIN', name: '业务管理员', description: '负责日常业务运营与用户管理' },
        { id: 'ENTERPRISE', name: '企业用户 (Lv4)', description: '享有企业级权益与高级功能' },
        { id: 'PREMIUM', name: '尊享用户 (Lv3)', description: '高级订阅用户，解锁顶配 AI 能力' },
        { id: 'PROFESSIONAL', name: '专业用户 (Lv2)', description: '解锁高级排版与高清输出能力' },
        { id: 'BASIC', name: '基础用户 (Lv1)', description: '解锁基础 AI 生成与文档导出' },
        { id: 'USER', name: '免费用户 (Lv0)', description: '基础功能限额使用权' }
    ];
    return roles;
}

/**
 * 获取权限列表
 */
export async function listPermissions() {
    return await prisma.permission.findMany();
}

/**
 * 获取角色的权限
 */
export async function getRolePermissions(role: UserRole) {
    // [V9.0] 超级管理员特权：自动拥有系统中所有定义的权限
    if (role === UserRole.SUPER_ADMIN) {
        const allPermissions = await prisma.permission.findMany();
        // 包装成 RolePermission 结构返回，保持接口兼容性
        return allPermissions.map(p => ({
            role: UserRole.SUPER_ADMIN,
            permissionId: p.id,
            permission: p
        }));
    }

    return await prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true }
    });
}

/**
 * 更新角色的权限
 */
export async function updateRolePermissions(role: UserRole, permissionIds: string[]) {
    // 1. 删除旧权限
    await prisma.rolePermission.deleteMany({
        where: { role }
    });

    // 2. 添加新权限
    if (permissionIds.length > 0) {
        const data = permissionIds.map(permissionId => ({
            role,
            permissionId
        }));

        await prisma.rolePermission.createMany({
            data
        });
    }

    return await getRolePermissions(role);
}


// ============================================================
// 系统统计
// ============================================================

/**
 * 获取系统统计数据
 */
export async function getSystemStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        totalUsers,
        todayUsers,
        activeUsers,
        disabledUsers,
        totalOrders,
        todayOrders,
        totalProjects,
        todayProjects,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: today } } }),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.DISABLED } }),
        prisma.order.count(),
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.project.count(),
        prisma.project.count({ where: { createdAt: { gte: today } } }),
    ]);

    // 计算订单金额
    const orderStats = await prisma.order.aggregate({
        where: { status: OrderStatus.PAID },
        _sum: { finalPrice: true },
    });

    const todayOrderStats = await prisma.order.aggregate({
        where: {
            status: OrderStatus.PAID,
            paidAt: { gte: today },
        },
        _sum: { finalPrice: true },
    });

    // 计算积分消耗
    const pointsStats = await prisma.transaction.aggregate({
        where: { type: 'consume' },
        _sum: { amount: true },
    });

    const todayPointsStats = await prisma.transaction.aggregate({
        where: {
            type: 'consume',
            createdAt: { gte: today },
        },
        _sum: { amount: true },
    });

    // 计算 VIP 分布
    const vipDistributionResult = await getVipDistribution();

    return {
        totalUsers,
        todayUsers,
        activeUsers,
        disabledUsers,
        totalOrders,
        todayOrders,
        totalProjects,
        todayProjects,
        vipDistribution: vipDistributionResult,
    };
}



/**
 * [V8.5] 获取 VIP 用户分布统计
 */
export async function getVipDistribution() {
    const distribution = await prisma.user.groupBy({
        by: ['vipLevel'],
        _count: {
            id: true
        }
    });

    // 映射等级名称
    const levelNames: Record<number, string> = {
        0: '免费用户',
        1: '基础版',
        2: '专业版',
        3: '尊享版',
        4: '企业版'
    };

    return distribution.map(d => ({
        level: d.vipLevel,
        name: levelNames[d.vipLevel] || `等级 ${d.vipLevel}`,
        count: d._count.id
    })).sort((a, b) => b.level - a.level);
}

/**
 * [V9.5] 获取用户状态统计数据
 */
export async function getUserStats() {
    const [total, active, disabled, pending] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.DISABLED } }),
        prisma.user.count({ where: { status: UserStatus.PENDING } }),
    ]);

    return {
        total,
        active,
        disabled,
        pending
    };
}

// ============================================================
// 模型引擎规则管理
// ============================================================

/**
 * 获取所有引擎规则
 */
export async function listEngineRules() {
    return await prisma.aiEngineRule.findMany({
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * 创建引擎规则
 */
export async function createEngineRule(data: {
    name: string;
    provider: string;
    config: string;
    description?: string;
}) {
    // 如果是首个规则，默认开启
    const count = await prisma.aiEngineRule.count();

    return await prisma.aiEngineRule.create({
        data: {
            ...data,
            isActive: count === 0
        }
    });
}

/**
 * 更新引擎规则
 */
export async function updateEngineRule(id: string, data: any) {
    return await prisma.aiEngineRule.update({
        where: { id },
        data
    });
}

/**
 * 激活引擎规则 (互斥逻辑)
 */
export async function activateEngineRule(id: string) {
    return await prisma.$transaction(async (tx) => {
        // 1. 全部取消激活
        await tx.aiEngineRule.updateMany({
            data: { isActive: false }
        });

        // 2. 激活目标
        return await tx.aiEngineRule.update({
            where: { id },
            data: { isActive: true }
        });
    });
}

/**
 * 删除引擎规则
 */
export async function deleteEngineRule(id: string) {
    const rule = await prisma.aiEngineRule.findUnique({ where: { id } });
    if (rule?.isActive) {
        throw new Error('无法删除当前正在启用的规则，请先切换到其他规则');
    }

    return await prisma.aiEngineRule.delete({
        where: { id }
    });
}

