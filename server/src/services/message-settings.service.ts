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
