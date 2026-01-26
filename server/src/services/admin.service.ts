// server/src/services/admin.service.ts
// 管理员服务：用户管理、订单管理、积分规则管理

import { PrismaClient, UserRole, UserStatus, OrderStatus } from '@prisma/client';
import { hashPassword } from '../utils/password.util';

const prisma = new PrismaClient();

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
}

export interface Pagination {
    page: number;
    limit: number;
}

/**
 * 获取用户列表
 */
export async function listUsers(filters: UserListFilters, pagination: Pagination) {
    const { search, role, status, vipLevel, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
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
                }
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.user.count({ where }),
        prisma.project.count(), // 获取全站项目总数
    ]);

    // 转换为前端期望的格式
    const items = rawItems.map(item => {
        const { _count, ...rest } = item as any;
        // 超级管理员 (SUPER_ADMIN) 和 普通管理员 (ADMIN) 都显示全站总数
        // 注意：用户提到的“系统管理员”、“业务管理员”目前都对应 UserRole.ADMIN
        const isAdminType = item.role === UserRole.SUPER_ADMIN || item.role === UserRole.ADMIN;

        return {
            ...rest,
            projectCount: isAdminType ? allProjectCount : (_count?.projects || 0)
        };
    });

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
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
    operatorId: string
) {
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
            // 软删除：标记为禁用
            await prisma.user.updateMany({
                where: {
                    id: { in: userIds },
                    role: { not: UserRole.SUPER_ADMIN },
                },
                data: { status: UserStatus.DISABLED },
            });
            break;
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
        { id: 'SUPER_ADMIN', name: '超级管理员', description: '拥有所有权限' },
        { id: 'ADMIN', name: '管理员', description: '管理用户和内容' },
        { id: 'USER', name: '普通用户', description: '基本功能使用权' }
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

    return {
        totalUsers,
        todayUsers,
        activeUsers,
        disabledUsers,
        totalOrders,
        todayOrders,
        totalProjects,
        todayProjects,
    };
}
