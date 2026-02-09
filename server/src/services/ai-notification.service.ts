import { MessageType } from '@prisma/client';
import { createMessage } from './message.service';

interface ProjectContext {
    userId: string;
    projectId: string;
    title: string;
}

/**
 * 发送PPT生成完成通知
 */
export async function notifyPPTGenerated(ctx: ProjectContext) {
    await createMessage({
        userId: ctx.userId,
        type: MessageType.AI,
        title: 'PPT生成完成',
        content: `您的演示文稿《${ctx.title}》已生成完成，快去查看吧。`,
        summary: `生成完成：${ctx.title}`,
        bizType: 'project',
        bizId: ctx.projectId,
        actionUrl: `/workbench?project=${ctx.projectId}`,
        isImportant: false,
    });
}
