import { MessageType } from '@prisma/client';
import { prisma } from '../db';

export interface UpdateMessageSettingsDTO {
    emailEnabled?: boolean;
    browserEnabled?: boolean;
    preferences?: Record<string, { email: boolean; browser: boolean }>;
}

/**
 * 获取用户消息设置 (不存在则创建默认值)
 */
export async function getMessageSettings(userId: string) {
    let settings = await prisma.userMessageSettings.findUnique({
        where: { userId },
    });

    if (!settings) {
        settings = await prisma.userMessageSettings.create({
            data: {
                userId,
                // Default settings are defined in schema: true, true, "{}"
            },
        });
    }

    return {
        ...settings,
        preferences: JSON.parse(settings.preferences),
    };
}

/**
 * 更新用户消息设置
 */
export async function updateMessageSettings(userId: string, data: UpdateMessageSettingsDTO) {
    const currentState = await getMessageSettings(userId);

    // Merge preferences JSON
    const mergedPreferences = {
        ...currentState.preferences,
        ...(data.preferences || {}),
    };

    const settings = await prisma.userMessageSettings.update({
        where: { userId },
        data: {
            emailEnabled: data.emailEnabled,
            browserEnabled: data.browserEnabled,
            preferences: JSON.stringify(mergedPreferences),
        },
    });

    return {
        ...settings,
        preferences: JSON.parse(settings.preferences),
    };
}

/**
 * 检查是否应该发送消息到指定渠道
 * @param userId 用户ID
 * @param type 消息类型
 * @param channel 渠道：'browser' | 'email'
 * @returns 是否应该发送
 */
export async function shouldSendMessage(
    userId: string,
    type: MessageType,
    channel: 'browser' | 'email'
): Promise<boolean> {
    try {
        const settings = await getMessageSettings(userId);

        // 检查全局开关
        if (channel === 'email' && !settings.emailEnabled) {
            return false;
        }
        if (channel === 'browser' && !settings.browserEnabled) {
            return false;
        }

        // 检查类型细分设置
        const typeKey = type as string;
        const prefs = settings.preferences?.[typeKey] || { email: true, browser: true };

        // 默认为true（如果未设置）
        return prefs[channel] !== false;
    } catch (error) {
        console.error('[MessageSettings] 检查发送权限失败:', error);
        // 出错时默认允许发送，避免消息丢失
        return true;
    }
}

export default {
    getMessageSettings,
    updateMessageSettings,
    shouldSendMessage,
};
