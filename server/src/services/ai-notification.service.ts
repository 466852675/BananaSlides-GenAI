import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';
import { renderTemplate } from './message-template.service';

interface ProjectContext {
    userId: string;
    projectId: string;
    title: string;
}

/**
 * 发送PPT生成完成通知
 */
export async function notifyPPTGenerated(ctx: ProjectContext) {
    try {
        try {
            const template = await renderTemplate({
                code: 'PPT_GENERATED',
                variables: {
                    title: ctx.title,
                },
            });

            await createMessage({
                userId: ctx.userId,
                type: MessageType.AI,
                title: template.title,
                content: template.content,
                summary: `生成完成：${ctx.title}`,
                bizType: 'project',
                bizId: ctx.projectId,
                actionUrl: `/app?projectId=${ctx.projectId}`,
                isImportant: false,
            });
        } catch {
            await createMessage({
                userId: ctx.userId,
                type: MessageType.AI,
                title: 'PPT生成完成',
                content: `您的演示文稿《${ctx.title}》已生成完成，快去查看吧。`,
                summary: `生成完成：${ctx.title}`,
                bizType: 'project',
                bizId: ctx.projectId,
                actionUrl: `/app?projectId=${ctx.projectId}`,
                isImportant: false,
            });
        }
    } catch (error) {
        console.error('[AINotification] 发送PPT生成完成通知失败:', error);
    }
}
