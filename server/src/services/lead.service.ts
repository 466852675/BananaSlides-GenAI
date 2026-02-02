// server/src/services/lead.service.ts
// 销售线索服务：处理企业咨询、需求收集

import { Lead } from '@prisma/client';
import { prisma } from '../db';

export interface CreateLeadDto {
    userId?: string;
    name: string;
    phone: string;
    company?: string;
    position?: string;
    email?: string;
    teamSize?: string;
    industry?: string;
    needs?: string;
}

/**
 * 创建销售线索
 */
export async function createLead(data: CreateLeadDto) {
    return prisma.lead.create({
        data: {
            ...data,
            status: 'PENDING'
        }
    });
}

/**
 * 获取线索列表 (Admin)
 */
export async function listLeads(
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string
) {
    const whereClause: any = {};

    if (search) {
        whereClause.OR = [
            { name: { contains: search } },
            { company: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } }
        ];
    }

    if (status) {
        whereClause.status = status;
    }

    const [items, total] = await Promise.all([
        prisma.lead.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: { user: { select: { nickname: true, email: true } } } // 关联用户信息
        }),
        prisma.lead.count({ where: whereClause })
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * 更新线索状态与备注
 */
export async function updateLeadStatus(id: string, status: string, notes?: string) {
    return prisma.lead.update({
        where: { id },
        data: {
            status,
            notes: notes !== undefined ? notes : undefined,
            updatedAt: new Date()
        }
    });
}

/**
 * 删除线索
 */
export async function deleteLead(id: string) {
    return prisma.lead.delete({
        where: { id }
    });
}

/**
 * 获取线索详情
 */
export async function getLeadById(id: string) {
    return prisma.lead.findUnique({
        where: { id },
        include: { user: { select: { nickname: true, email: true } } }
    });
}

/**
 * 添加跟进备注
 */
export async function addLeadNote(id: string, note: string) {
    // 先获取当前线索
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
        throw new Error('线索不存在');
    }

    // 追加备注（保留原有备注）
    const existingNotes = lead.notes || '';
    const timestamp = new Date().toLocaleString('zh-CN');
    const newNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;

    return prisma.lead.update({
        where: { id },
        data: {
            notes: newNotes,
            updatedAt: new Date()
        }
    });
}

/**
 * 转换线索为用户
 */
export async function convertLeadToUser(id: string, email: string, password: string) {
    // 1. 获取线索
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
        throw new Error('线索不存在');
    }

    if (lead.status === 'CONVERTED') {
        throw new Error('该线索已转换为用户');
    }

    // 2. 检查邮箱是否已被使用
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('该邮箱已被注册');
    }

    // 3. 创建用户
    const { hashPassword } = await import('../utils/password.util');
    const user = await prisma.user.create({
        data: {
            email,
            passwordHash: await hashPassword(password),
            nickname: lead.name,
            phone: lead.phone,
            role: 'USER',
            status: 'ACTIVE',
            points: 30 // 默认赠送积分
        }
    });

    // 4. 更新线索状态
    await prisma.lead.update({
        where: { id },
        data: {
            status: 'CONVERTED',
            userId: user.id,
            notes: `${lead.notes || ''}\n\n[${new Date().toLocaleString('zh-CN')}] 已转换为用户: ${email}`,
            updatedAt: new Date()
        }
    });

    return { user, lead: await prisma.lead.findUnique({ where: { id } }) };
}
