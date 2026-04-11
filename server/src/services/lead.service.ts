import { prisma } from '../db';
import { UserRole, UserStatus } from '../types/user.types';
import { hashPassword } from '../utils/password.util';
import { notifyAdminNewLead } from './admin-notification.service';

/**
 * LeadService - 销售线索 CRM 业务逻辑
 */

/**
 * 创建线索
 */
export async function createLead(data: any) {
    const { userId, name, phone, company, position, email, teamSize, industry, needs, source } = data;
    const newLead = await prisma.lead.create({
        data: {
            userId,
            name,
            phone,
            company,
            position,
            email,
            teamSize,
            industry,
            needs,
            source,
            status: 'PENDING',
            priority: 'MEDIUM'
        }
    });

    // 通知管理员
    notifyAdminNewLead({
        id: newLead.id,
        name: newLead.name,
        company: newLead.company,
        phone: newLead.phone,
        industry: newLead.industry,
        needs: newLead.needs
    }).catch(err => console.error('[LeadNotify] 管理员通知发送失败:', err));

    return newLead;
}

/**
 * 获取线索列表 (带分页和筛选)
 */
export async function listLeads(page: number, limit: number, search?: string, status?: string) {
    const where: any = {};
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { phone: { contains: search } },
            { company: { contains: search } },
            { email: { contains: search } }
        ];
    }
    if (status) {
        where.status = status;
    }

    const [items, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                User_Lead_assigneeIdToUser: {
                    select: { nickname: true, avatar: true }
                }
            }
        }),
        prisma.lead.count({ where })
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
 * 获取线索详情
 */
export async function getLeadById(id: string) {
    return await prisma.lead.findUnique({
        where: { id },
        include: {
            User_Lead_assigneeIdToUser: {
                select: { id: true, nickname: true, avatar: true }
            },
            LeadActivity: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

/**
 * 更新线索状态 (带自动日志)
 */
export async function updateLeadStatus(id: string, status: string, notes: string | null, operatorId: string) {
    const oldLead = await prisma.lead.findUnique({ where: { id } });

    const updatedLead = await prisma.lead.update({
        where: { id },
        data: { status, notes }
    });

    if (oldLead && oldLead.status !== status) {
        await logActivity({
            leadId: id,
            type: 'SYSTEM',
            content: `状态变更: ${oldLead.status} -> ${status}`,
            operatorId
        });
    }

    if (notes) {
        await logActivity({
            leadId: id,
            type: 'NOTE',
            content: notes,
            operatorId
        });
    }

    return updatedLead;
}

/**
 * 记录跟进动态
 */
export async function logActivity(data: {
    leadId: string;
    type: string;
    content: string;
    metadata?: any;
    operatorId: string;
}) {
    // 1. 创建记录
    const activity = await prisma.leadActivity.create({
        data: {
            leadId: data.leadId,
            type: data.type,
            content: data.content,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            operatorId: data.operatorId
        }
    });

    // 2. 自动化逻辑：首次填写跟进备注自动改为已跟进
    if (data.type !== 'SYSTEM' && data.operatorId !== 'system') {
        const lead = await prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { status: true }
        });

        if (lead?.status === 'PENDING') {
            await prisma.lead.update({
                where: { id: data.leadId },
                data: { status: 'CONTACTED' }
            });

            // 记录系统自动变更日志
            await prisma.leadActivity.create({
                data: {
                    leadId: data.leadId,
                    type: 'SYSTEM',
                    content: '线索状态自动变更为: 已跟进 (触发因素: 首次添加跟进记录)',
                    operatorId: 'system'
                }
            });
        }
    }

    return activity;
}

/**
 * 获取线索的跟进记录
 */
export async function getActivities(leadId: string) {
    return await prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' }
    });
}

/**
 * 指派负责人
 */
export async function assignLead(id: string, assigneeId: string | null, operatorId: string) {
    const lead = await prisma.lead.update({
        where: { id },
        data: { assigneeId },
        include: {
            User_Lead_assigneeIdToUser: {
                select: { nickname: true }
            }
        }
    });

    await logActivity({
        leadId: id,
        type: 'SYSTEM',
        content: assigneeId
            ? `指派负责人: ${lead.User_Lead_assigneeIdToUser?.nickname || '未知用户'}`
            : '取消指派负责人',
        operatorId
    });

    return lead;
}

/**
 * 删除线索
 */
export async function deleteLead(id: string) {
    return await prisma.lead.delete({
        where: { id }
    });
}

/**
 * 转换线索为用户
 */
export async function convertLeadToUser(leadId: string, email: string, passwordHash: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error('线索不存在');

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('该邮箱已注册');

    return await prisma.$transaction(async (tx) => {
        // 1. 创建用户
        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                nickname: lead.name,
                phone: lead.phone,
                role: UserRole.USER,
                status: UserStatus.ACTIVE,
                points: 30 // 默认注册奖励
            }
        });

        // 2. 更新线索状态
        await tx.lead.update({
            where: { id: leadId },
            data: {
                status: 'CONVERTED',
                userId: user.id
            }
        });

        // 3. 记录日志
        await tx.leadActivity.create({
            data: {
                leadId,
                type: 'SYSTEM',
                content: `线索已成功转换为正式用户: ${email}`,
                operatorId: 'system'
            }
        });

        return user;
    });
}
