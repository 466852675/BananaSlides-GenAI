// server/src/services/lead.service.ts
// 销售线索服务：处理企业咨询、需求收集

import { PrismaClient, Lead } from '@prisma/client';

const prisma = new PrismaClient();

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
