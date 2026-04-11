import { MessageType, MessageTypeType } from '../types/user.types';
import { prisma } from '../db';

export interface RenderTemplateDTO {
    code: string;
    variables: Record<string, string | number>;
}

export interface CreateTemplateDTO {
    code: string;
    name: string;
    type: MessageTypeType;
    title: string;
    content: string;
    bizType: string;
}

export async function getTemplateByCode(code: string) {
    const template = await prisma.messageTemplate.findUnique({
        where: { code },
    });

    return template;
}

export async function renderTemplate(dto: RenderTemplateDTO) {
    const { code, variables } = dto;

    const template = await getTemplateByCode(code);
    if (!template) {
        throw new Error(`模板不存在: ${code}`);
    }

    if (!template.isActive) {
        throw new Error(`模板已禁用: ${code}`);
    }

    let title = template.title;
    let content = template.content;

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        title = title.replace(placeholder, String(value));
        content = content.replace(placeholder, String(value));
    }

    return {
        type: template.type,
        title,
        content,
        bizType: template.bizType,
    };
}

export async function createTemplate(dto: CreateTemplateDTO) {
    const existing = await prisma.messageTemplate.findUnique({
        where: { code: dto.code },
    });

    if (existing) {
        throw new Error(`模板编码已存在: ${dto.code}`);
    }

    const template = await prisma.messageTemplate.create({
        data: {
            code: dto.code,
            name: dto.name,
            type: dto.type,
            title: dto.title,
            content: dto.content,
            bizType: dto.bizType,
            isActive: true,
        },
    });

    return template;
}

export async function updateTemplate(
    code: string,
    data: Partial<{
        name: string;
        title: string;
        content: string;
        isActive: boolean;
    }>
) {
    const template = await prisma.messageTemplate.update({
        where: { code },
        data,
    });

    return template;
}

export async function deleteTemplate(code: string) {
    await prisma.messageTemplate.delete({
        where: { code },
    });

    return true;
}

export async function listTemplates(params?: {
    bizType?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}) {
    const { bizType, isActive, page = 1, limit = 20 } = params || {};

    const where: any = {};
    if (bizType) where.bizType = bizType;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
        prisma.messageTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.messageTemplate.count({ where }),
    ]);

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
