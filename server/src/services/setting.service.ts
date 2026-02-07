import { prisma } from '../db';

// Helper to mask API keys (show only last 4 chars)
const maskApiKey = (key: string | undefined): string => {
    if (!key || key.length < 8) return key ? '••••••••' : '';
    return `••••••••${key.slice(-4)}`;
};

// Recursively mask all apiKey fields in an object
const maskKeysInObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    const result: any = Array.isArray(obj) ? [] : {};

    for (const key of Object.keys(obj)) {
        if (key.toLowerCase() === 'apikey' && typeof obj[key] === 'string') {
            result[key] = maskApiKey(obj[key]);
        } else if (typeof obj[key] === 'object') {
            result[key] = maskKeysInObject(obj[key]);
        } else {
            result[key] = obj[key];
        }
    }

    return result;
};

export class SettingService {
    // Get full settings (for internal backend use only)
    static async getSettings() {
        let settings = await (prisma as any).appSettings.findFirst({
            where: { id: 'global' }
        });

        if (!settings) {
            return null;
        }

        try {
            return JSON.parse(settings.config);
        } catch {
            return null;
        }
    }

    // Get masked settings (for frontend display)
    static async getMaskedSettings() {
        const fullSettings = await this.getSettings();
        if (!fullSettings) return null;
        return maskKeysInObject(fullSettings);
    }

    // Load settings from Environment Variables
    static loadFromEnv(): any {
        const env = process.env;
        const getEnv = (key: string) => env[key] || '';
        const getEnvNum = (key: string) => {
            const val = parseInt(env[key] || '');
            return isNaN(val) ? undefined : val;
        }

        // 1. Determine Provider
        const provider = getEnv('AI_PROVIDER') || 'Gemini';

        // 2. Define Prefix Map for Specific Configs
        const prefixes: Record<string, string> = {
            'Gemini': 'GEMINI',
            'OpenAI': 'OPENAI',
            'Zhipu': 'ZHIPU',
            'SiliconFlow': 'SILICON',
            'ModelScope': 'MODELSCOPE',
            'Volcengine': 'VOLCENGINE',
            'Custom': 'CUSTOM'
        };

        const prefix = prefixes[provider];

        // 3. Helper to get config with fallback: SPECIFIC_KEY -> AI_KEY -> Default
        const getConfig = (specificKeySuffix: string, fallbackKey: string, defaultValue: string) => {
            // 1. Try Provider Specific (e.g. OPENAI_BASE_URL)
            if (prefix) {
                const specific = getEnv(`${prefix}_${specificKeySuffix}`);
                if (specific) return specific;
            }
            // 2. Try Generic Fallback (e.g. AI_BASE_URL)
            const generic = getEnv(fallbackKey);
            if (generic) return generic;

            // 3. Return Default
            return defaultValue;
        };

        // 4. Default Presets (Backend-side definitions to match Frontend)
        const defaults: Record<string, any> = {
            'Gemini': {
                base: 'https://generativelanguage.googleapis.com',
                text: 'gemini-3-pro-preview', image: 'gemini-3-pro-image', vision: 'gemini-3-pro-preview'
            },
            'OpenAI': {
                base: 'https://api.openai.com/v1',
                text: 'gpt-4-turbo', image: 'dall-e-3', vision: 'gpt-4-vision-preview'
            },
            'Zhipu': {
                base: 'https://open.bigmodel.cn/api/paas/v4',
                text: 'glm-4', image: 'cogview-3', vision: 'glm-4v'
            },
            'SiliconFlow': {
                base: 'https://api.siliconflow.cn/v1',
                text: 'deepseek-ai/DeepSeek-V2.5', image: 'black-forest-labs/FLUX.1-schnell', vision: 'deepseek-ai/DeepSeek-V2.5'
            },
            'ModelScope': {
                base: 'https://api-inference.modelscope.cn/v1',
                text: 'qwen-max', image: 'wanx-v1', vision: 'qwen-vl-max'
            },
            'Volcengine': {
                base: 'https://ark.cn-beijing.volces.com/api/v3',
                text: 'doubao-pro-256k', image: 'doubao-image', vision: 'doubao-vision-pro'
            },
            'Custom': { base: '', text: '', image: '', vision: '' }
        };

        const preset = defaults[provider] || defaults['Gemini'];

        const defaultSettings = {
            ai: {
                provider: provider,
                // Look for [PREFIX]_BASE_URL -> AI_BASE_URL -> Preset Default
                baseUrl: getConfig('BASE_URL', 'AI_BASE_URL', preset.base),
                // Look for [PREFIX]_API_KEY -> AI_API_KEY -> ''
                apiKey: getConfig('API_KEY', 'AI_API_KEY', ''),
                models: {
                    text: getConfig('MODEL_TEXT', 'AI_MODEL_TEXT', preset.text),
                    image: getConfig('MODEL_IMAGE', 'AI_MODEL_IMAGE', preset.image),
                    vision: getConfig('MODEL_VISION', 'AI_MODEL_VISION', preset.vision)
                },
                customCombo: {
                    text: {
                        baseUrl: getEnv('COMBO_TEXT_BASE') || 'https://open.bigmodel.cn/api/coding/paas/v4',
                        apiKey: getEnv('COMBO_TEXT_KEY') || '',
                        model: getEnv('COMBO_TEXT_MODEL') || 'glm-4.7'
                    },
                    image: {
                        baseUrl: getEnv('COMBO_IMAGE_BASE') || 'http://127.0.0.1:8045/v1',
                        apiKey: getEnv('COMBO_IMAGE_KEY') || '',
                        model: getEnv('COMBO_IMAGE_MODEL') || 'gemini-3-pro-image'
                    },
                    vision: {
                        baseUrl: getEnv('COMBO_VISION_BASE') || 'http://127.0.0.1:8045/v1',
                        apiKey: getEnv('COMBO_VISION_KEY') || '',
                        model: getEnv('COMBO_VISION_MODEL') || 'gemini-3-flash'
                    }
                }
            },
            docParser: {
                provider: getEnv('DOC_PARSER_PROVIDER') === 'None' ? 'None' : 'MinerU',
                baseUrl: getEnv('DOC_PARSER_BASE') || 'https://mineru.net',
                apiKey: getEnv('DOC_PARSER_KEY') || ''
            },
            imageGeneration: {
                resolution: getEnv('IMG_RESOLUTION') || '2048x2048'
            },
            performance: {
                textConcurrency: getEnvNum('PERF_TEXT_CONCURRENCY') || 1,
                imageConcurrency: getEnvNum('PERF_IMAGE_CONCURRENCY') || 1
            },
            language: getEnv('OUTPUT_LANGUAGE') || 'zh'
        };

        return defaultSettings;
    }

    // Reset settings to Env values (force update DB)
    static async resetToEnv() {
        const envSettings = this.loadFromEnv();
        console.log('[SettingService] Resetting to Env configuration...');
        return await this.updateSettings(envSettings);
    }

    // Get Presets from Env for Frontend to display defaults when switching providers
    static getEnvPresets() {
        const env = process.env;
        const getEnv = (key: string) => env[key] || '';

        const prefixMap: Record<string, string> = {
            'Gemini': 'GEMINI',
            'OpenAI': 'OPENAI',
            'Zhipu': 'ZHIPU',
            'SiliconFlow': 'SILICON',
            'ModelScope': 'MODELSCOPE',
            'Volcengine': 'VOLCENGINE'
        };

        const defaults: Record<string, any> = {
            'Gemini': {
                base: 'https://generativelanguage.googleapis.com',
                text: 'gemini-3-pro-preview', image: 'gemini-3-pro-image', vision: 'gemini-3-pro-preview'
            },
            'OpenAI': {
                base: 'https://api.openai.com/v1',
                text: 'gpt-4-turbo', image: 'dall-e-3', vision: 'gpt-4-vision-preview'
            },
            'Zhipu': {
                base: 'https://open.bigmodel.cn/api/paas/v4',
                text: 'glm-4', image: 'cogview-3', vision: 'glm-4v'
            },
            'SiliconFlow': {
                base: 'https://api.siliconflow.cn/v1',
                text: 'deepseek-ai/DeepSeek-V2.5', image: 'black-forest-labs/FLUX.1-schnell', vision: 'deepseek-ai/DeepSeek-V2.5'
            },
            'ModelScope': {
                base: 'https://api-inference.modelscope.cn/v1',
                text: 'qwen-max', image: 'wanx-v1', vision: 'qwen-vl-max'
            },
            'Volcengine': {
                base: 'https://ark.cn-beijing.volces.com/api/v3',
                text: 'doubao-pro-256k', image: 'doubao-image', vision: 'doubao-vision-pro'
            }
        };

        const presets: Record<string, any> = {};

        for (const [provider, prefix] of Object.entries(prefixMap)) {
            const defaultPreset = defaults[provider];

            const baseUrl = getEnv(`${prefix}_BASE_URL`) || defaultPreset?.base || '';
            const text = getEnv(`${prefix}_MODEL_TEXT`) || defaultPreset?.text || '';
            const image = getEnv(`${prefix}_MODEL_IMAGE`) || defaultPreset?.image || '';
            const vision = getEnv(`${prefix}_MODEL_VISION`) || defaultPreset?.vision || '';

            presets[provider] = {
                baseUrl,
                models: { text, image, vision }
            };
        }
        return presets;
    }

    // Sync Env to Database on Startup (Non-destructive)
    static async syncEnvToDatabase() {
        const existingSettings = await this.getSettings();
        if (!existingSettings) {
            console.log('[SettingService] No settings found in database. Initializing with .env defaults...');
            const envSettings = this.loadFromEnv();
            await this.updateSettings(envSettings);
        } else {
            console.log('[SettingService] Settings already exist in database. Skipping .env overwrite to preserve user changes.');
        }
    }

    static async updateSettings(config: any) {
        // 1. Fetch current settings to retrieve original keys
        const currentSettings = await this.getSettings();

        // 2. Helper to recursively restore keys
        const restoreKeys = (incoming: any, original: any): any => {
            if (!incoming || typeof incoming !== 'object' || !original) return incoming;

            if (Array.isArray(incoming)) return incoming; // Assume arrays don't hold keys directly for now

            const result = { ...incoming };

            for (const key in result) {
                const val = result[key];
                const originalVal = original[key];

                if (typeof val === 'string' && val.startsWith('••••')) {
                    // If incoming is masked, restore original
                    // Limit restoration to likely key fields to avoid false positives (though low risk with ••••)
                    if (originalVal) {
                        result[key] = originalVal;
                    }
                } else if (typeof val === 'object' && val !== null) {
                    // Recurse
                    result[key] = restoreKeys(val, originalVal);
                }
            }
            return result;
        };

        // 3. Merge
        const finalConfig = restoreKeys(config, currentSettings);
        const configStr = JSON.stringify(finalConfig);

        return await (prisma as any).appSettings.upsert({
            where: { id: 'global' },
            create: {
                id: 'global',
                config: configStr
            },
            update: {
                config: configStr
            }
        });
    }
    // Hot Reload .env and Sync
    static async reloadEnv() {
        try {
            const envPath = require('path').resolve(process.cwd(), '.env');
            const fs = require('fs');
            const dotenv = require('dotenv');

            if (fs.existsSync(envPath)) {
                console.log('[SettingService] Reloading .env from:', envPath);
                const envConfig = dotenv.parse(fs.readFileSync(envPath));

                // Update process.env
                for (const k in envConfig) {
                    process.env[k] = envConfig[k];
                }

                // Sync to DB
                await this.syncEnvToDatabase();
            }
        } catch (error) {
            console.error('[SettingService] Failed to hot-reload .env:', error);
        }
    }
}
