
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from server root
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const PRESETS = [
    {
        name: '火山引擎 (Volcengine)',
        provider: 'Volcengine',
        description: '字节跳动豆包大模型，支持 text/image/vision 全能力。',
        isActive: process.env.AI_PROVIDER === 'Volcengine' ? 1 : 0,
        config: {
            baseUrl: process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
            apiKey: process.env.VOLCENGINE_API_KEY || '2b927725-d354-4573-8078-eec60fc1bc52',
            textModel: process.env.VOLCENGINE_MODEL_TEXT || 'ep-20260121163958-vk8db',
            imageModel: process.env.VOLCENGINE_MODEL_IMAGE || 'ep-20260122074430-7tgtg',
            visionModel: process.env.VOLCENGINE_MODEL_VISION || 'ep-20260121164254-bngbw'
        }
    },
    {
        name: 'CustomCombo (本地代理)',
        provider: 'CustomCombo',
        description: '自定义组合模式，适用于本地开发或 OneAPI 中转。',
        isActive: process.env.AI_PROVIDER === 'CustomCombo' ? 1 : 0,
        config: {
            apiKey: process.env.CUSTOM_COMBO_API_KEY || 'sk-107362d770ee4b2b97b7b77d1b448993',
            combo: {
                text: {
                    baseUrl: process.env.CUSTOM_COMBO_TEXT_BASE_URL || 'http://127.0.0.1:8045/v1',
                    apiKey: process.env.CUSTOM_COMBO_TEXT_API_KEY || 'sk-107362d770ee4b2b97b7b77d1b448993',
                    model: process.env.CUSTOM_COMBO_TEXT_MODEL || 'gemini-3-flash'
                },
                image: {
                    baseUrl: process.env.CUSTOM_COMBO_IMAGE_BASE_URL || 'http://127.0.0.1:8045/v1',
                    apiKey: process.env.CUSTOM_COMBO_IMAGE_API_KEY || 'sk-107362d770ee4b2b97b7b77d1b448993',
                    model: process.env.CUSTOM_COMBO_IMAGE_MODEL || 'gemini-3-pro-image'
                },
                vision: {
                    baseUrl: process.env.CUSTOM_COMBO_VISION_BASE_URL || 'http://127.0.0.1:8045/v1',
                    apiKey: process.env.CUSTOM_COMBO_VISION_API_KEY || 'sk-107362d770ee4b2b97b7b77d1b448993',
                    model: process.env.CUSTOM_COMBO_VISION_MODEL || 'gemini-3-flash'
                }
            }
        }
    },
    {
        name: 'ModelScope (魔搭社区)',
        provider: 'ModelScope',
        description: '汇聚国内开源大模型，支持 GLM/Qwen 等。',
        isActive: process.env.AI_PROVIDER === 'ModelScope' ? 1 : 0,
        config: {
            baseUrl: process.env.MODELSCOPE_BASE_URL || 'https://api-inference.modelscope.cn/v1',
            apiKey: process.env.MODELSCOPE_API_KEY || 'ms-28562bc5-d506-4a45-b855-6a155a0b8a97',
            textModel: process.env.MODELSCOPE_MODEL_TEXT || 'ZhipuAI/GLM-4.7',
            imageModel: process.env.MODELSCOPE_MODEL_IMAGE || 'Tongyi-MAI/Z-Image-Turbo',
            visionModel: process.env.MODELSCOPE_MODEL_VISION || 'Qwen/Qwen3-VL-30B-A3B-Instruct'
        }
    },
    {
        name: 'SiliconFlow (硅基流动)',
        provider: 'SiliconFlow',
        description: '高性能大模型推理服务，支持 DeepSeek/FLUX。',
        isActive: process.env.AI_PROVIDER === 'SiliconFlow' ? 1 : 0,
        config: {
            baseUrl: process.env.SILICON_BASE_URL || 'https://api.siliconflow.cn/v1',
            apiKey: process.env.SILICON_API_KEY || '',
            textModel: process.env.SILICON_MODEL_TEXT || 'deepseek-ai/DeepSeek-V3.2',
            imageModel: process.env.SILICON_MODEL_IMAGE || 'black-forest-labs/FLUX.1-schnell',
            visionModel: process.env.SILICON_MODEL_VISION || 'deepseek-ai/DeepSeek-V2.5'
        }
    },
    {
        name: 'Google Gemini',
        provider: 'Gemini',
        description: 'Google 最强多模态模型。',
        isActive: process.env.AI_PROVIDER === 'Gemini' ? 1 : 0,
        config: {
            baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com',
            apiKey: process.env.GEMINI_API_KEY || '',
            textModel: process.env.GEMINI_MODEL_TEXT || 'gemini-3-flash',
            imageModel: process.env.GEMINI_MODEL_IMAGE || 'gemini-3-pro-image',
            visionModel: process.env.GEMINI_MODEL_VISION || 'gemini-3-flash'
        }
    },
    {
        name: 'Zhipu AI (智谱清言)',
        provider: 'Zhipu',
        description: '清华系 GLM 大模型。',
        isActive: process.env.AI_PROVIDER === 'Zhipu' ? 1 : 0,
        config: {
            baseUrl: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
            apiKey: process.env.ZHIPU_API_KEY || '',
            textModel: process.env.ZHIPU_MODEL_TEXT || 'glm-4.7',
            imageModel: process.env.ZHIPU_MODEL_IMAGE || 'GLM-Image',
            visionModel: process.env.ZHIPU_MODEL_VISION || 'GLM-4.6V-Flash'
        }
    },
    {
        name: 'OpenAI',
        provider: 'OpenAI',
        description: 'GPT-4 Turbo & DALL-E 3。',
        isActive: process.env.AI_PROVIDER === 'OpenAI' ? 1 : 0,
        config: {
            baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
            apiKey: process.env.OPENAI_API_KEY || '',
            textModel: process.env.OPENAI_MODEL_TEXT || 'gpt-4-turbo',
            imageModel: process.env.OPENAI_MODEL_IMAGE || 'dall-e-3',
            visionModel: process.env.OPENAI_MODEL_VISION || 'gpt-4-vision-preview'
        }
    }
];

const GLOBAL_CONFIG = {
    docParser: {
        provider: 'MinerU',
        apiKey: 'eyJ0eXBlIjoiSldUIiwiYWxnIjoiSFM1MTIifQ.eyJqdGkiOiI1NTcwNDMzNiIsInJvbCI6IlJPTEVfUkVHSVNURVIiLCJpc3MiOiJPcGVuWExhYiIsImlhdCI6MTc2OTA0NDk0MSwiY2xpZW50SWQiOiJsa3pkeDU3bnZ5MjJqa3BxOXgydyIsInBob25lIjoiIiwib3BlbklkIjpudWxsLCJ1dWlkIjoiZjhiM2E0YjYtYmMxYi00ZTZmLWIzMGQtYTExOGVkMjA4NGUyIiwiZW1haWwiOiIiLCJleHAiOjE3NzAyNTQ1NDF9.1TORqI0dMdacXLlCwn_K2N4YsnitRZNCtRixTzZUcrnXnqAN9Q3TOtSqvM47_fLOL1pvqLrVlioCDwYZh1e7eA',
        baseUrl: 'https://mineru.net'
    },
    imageResolution: '2048x2048',
    textConcurrency: 1,
    imageConcurrency: 2,
    outputLanguage: 'zh'
};

async function main() {
    console.log('🌱 Start seeding AI rules (Raw SQL Mode)...');

    // 1. Deactivate all rules
    try {
        await prisma.$executeRawUnsafe(`UPDATE AiEngineRule SET isActive = 0`);
    } catch (e) {
        // Table might not exist or empty, ignore
    }

    const now = new Date().toISOString();

    for (const rule of PRESETS) {
        try {
            // Check existence
            const existing: any[] = await prisma.$queryRawUnsafe(
                `SELECT * FROM AiEngineRule WHERE name = '${rule.name}' LIMIT 1`
            );

            if (existing && existing.length > 0) {
                console.log(`Updating rule: ${rule.name}`);
                await prisma.$executeRawUnsafe(
                    `UPDATE AiEngineRule SET provider = ?, description = ?, config = ?, isActive = ?, updatedAt = ? WHERE id = ?`,
                    rule.provider,
                    rule.description,
                    JSON.stringify(rule.config),
                    rule.isActive,
                    now,
                    existing[0].id
                );
            } else {
                console.log(`Creating rule: ${rule.name}`);
                const newId = uuidv4();
                await prisma.$executeRawUnsafe(
                    `INSERT INTO AiEngineRule (id, name, provider, description, config, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    newId,
                    rule.name,
                    rule.provider,
                    rule.description,
                    JSON.stringify(rule.config),
                    rule.isActive,
                    now,
                    now
                );
            }
        } catch (err: any) {
            console.error(`Failed to process rule ${rule.name}:`, err.message);
        }
    }

    console.log('⚙️ Updating global settings...');
    try {
        // Fetch AppSettings
        const settings: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM AppSettings LIMIT 1`);
        let configObj: any = {};
        let settingsId = 'global';

        if (settings && settings.length > 0) {
            settingsId = settings[0].id;
            try {
                configObj = JSON.parse(settings[0].config);
            } catch (e) { }
        }

        // Merge Global Config into Root Settings (Align with SettingService & Types)
        configObj.docParser = GLOBAL_CONFIG.docParser;
        configObj.imageGeneration = {
            resolution: GLOBAL_CONFIG.imageResolution
        };
        configObj.performance = {
            textConcurrency: GLOBAL_CONFIG.textConcurrency,
            imageConcurrency: GLOBAL_CONFIG.imageConcurrency
        };
        configObj.language = GLOBAL_CONFIG.outputLanguage;

        // Legacy / Backward Compatibility
        configObj.ai = {
            ...(configObj.ai || {}),
            global: GLOBAL_CONFIG
        };

        const configStr = JSON.stringify(configObj);

        if (settings && settings.length > 0) {
            await prisma.$executeRawUnsafe(
                `UPDATE AppSettings SET config = ?, updatedAt = ? WHERE id = ?`,
                configStr,
                now,
                settingsId
            );
        } else {
            await prisma.$executeRawUnsafe(
                `INSERT INTO AppSettings (id, config, updatedAt) VALUES (?, ?, ?)`,
                'global',
                configStr,
                now
            );
        }
    } catch (err: any) {
        console.error('Failed to update global settings:', err.message);
    }

    console.log('✅ Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
