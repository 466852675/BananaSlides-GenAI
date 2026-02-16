# AI引擎配置

## 概述

AI引擎配置模块为管理员提供完整的AI模型参数管理能力，支持多提供商（Gemini、OpenAI、Zhipu、Volcengine等）的统一配置。系统支持配置热更新（无需重启服务），内置模型路由规则，可根据任务类型（文本、图片、视觉分析）自动选择最优模型。

## 支持的AI提供商

| 提供商 | 标识 | 文本模型 | 图片模型 | 视觉模型 | 地区 |
|--------|------|----------|----------|----------|------|
| Google Gemini | Gemini | gemini-3-pro-preview | gemini-3-pro-image | gemini-3-pro-preview | 全球 |
| OpenAI | OpenAI | gpt-4-turbo | dall-e-3 | gpt-4-vision-preview | 全球 |
| 智谱AI | Zhipu | glm-4 | cogview-3 | glm-4v | 中国 |
| 火山引擎 | Volcengine | doubao-pro-256k | doubao-image | doubao-vision-pro | 中国 |
| SiliconFlow | SiliconFlow | DeepSeek-V2.5 | FLUX.1-schnell | DeepSeek-V2.5 | 中国 |
| 魔搭社区 | ModelScope | qwen-max | wanx-v1 | qwen-vl-max | 中国 |
| 自定义组合 | Custom | 自定义 | 自定义 | 自定义 | - |

## 数据库模型

### AI引擎规则表

```prisma
// server/prisma/schema.prisma

model AiEngineRule {
  id          String   @id @default(uuid())
  name        String   // 规则名称
  provider    String   // 厂商: Gemini, Volcengine, OpenAI, CustomCombo
  
  // 核心配置 (JSON 字符串存储，包含 baseUrl, apiKey 等)
  config      String   
  
  isActive    Boolean  @default(false)
  description String?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
}
```

### 系统设置表

```prisma
model AppSettings {
  id        String   @id @default("global")
  config    String   // JSON格式存储完整配置
  updatedAt DateTime @updatedAt
}
```

## 配置结构

### 完整配置JSON结构

```typescript
interface AIEngineConfig {
  ai: {
    provider: string;           // 当前选择的提供商
    baseUrl: string;           // API基础地址
    apiKey: string;            // API密钥
    models: {
      text: string;            // 文本生成模型
      image: string;           // 图片生成模型
      vision: string;          // 视觉分析模型
    };
    customCombo: {             // 自定义组合配置
      text: ProviderConfig;
      image: ProviderConfig;
      vision: ProviderConfig;
    };
  };
  docParser: {                 // 文档解析配置
    provider: string;
    baseUrl: string;
    apiKey: string;
  };
  imageGeneration: {           // 图片生成配置
    resolution: string;        // 默认分辨率
  };
  performance: {               // 性能配置
    textConcurrency: number;   // 文本并发数
    imageConcurrency: number;  // 图片并发数
  };
  language: string;            // 输出语言
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
```

## 核心服务实现

### 设置服务

```typescript
// server/src/services/setting.service.ts

import { prisma } from '../db';

// API密钥脱敏（仅显示后4位）
const maskApiKey = (key: string | undefined): string => {
    if (!key || key.length < 8) return key ? '••••••••' : '';
    return `••••••••${key.slice(-4)}`;
};

// 递归脱敏对象中的所有apiKey字段
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
    // 获取完整配置（后端内部使用）
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

    // 获取脱敏配置（前端展示用）
    static async getMaskedSettings() {
        const fullSettings = await this.getSettings();
        if (!fullSettings) return null;
        return maskKeysInObject(fullSettings);
    }

    // 从环境变量加载默认配置
    static loadFromEnv(): AIEngineConfig {
        const env = process.env;
        const getEnv = (key: string) => env[key] || '';
        const getEnvNum = (key: string) => {
            const val = parseInt(env[key] || '');
            return isNaN(val) ? undefined : val;
        };

        // 确定当前提供商
        const provider = getEnv('AI_PROVIDER') || 'Gemini';

        // 各提供商配置前缀映射
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

        // 配置获取辅助函数
        const getConfig = (specificKeySuffix: string, fallbackKey: string, defaultValue: string) => {
            // 1. 先尝试提供商特定配置
            if (prefix) {
                const specific = getEnv(`${prefix}_${specificKeySuffix}`);
                if (specific) return specific;
            }
            // 2. 尝试通用配置
            const generic = getEnv(fallbackKey);
            if (generic) return generic;
            // 3. 返回默认值
            return defaultValue;
        };

        // 各提供商默认配置
        const defaults: Record<string, any> = {
            'Gemini': {
                base: 'https://generativelanguage.googleapis.com',
                text: 'gemini-3-pro-preview',
                image: 'gemini-3-pro-image',
                vision: 'gemini-3-pro-preview'
            },
            'OpenAI': {
                base: 'https://api.openai.com/v1',
                text: 'gpt-4-turbo',
                image: 'dall-e-3',
                vision: 'gpt-4-vision-preview'
            },
            'Zhipu': {
                base: 'https://open.bigmodel.cn/api/paas/v4',
                text: 'glm-4',
                image: 'cogview-3',
                vision: 'glm-4v'
            },
            'SiliconFlow': {
                base: 'https://api.siliconflow.cn/v1',
                text: 'deepseek-ai/DeepSeek-V2.5',
                image: 'black-forest-labs/FLUX.1-schnell',
                vision: 'deepseek-ai/DeepSeek-V2.5'
            },
            'ModelScope': {
                base: 'https://api-inference.modelscope.cn/v1',
                text: 'qwen-max',
                image: 'wanx-v1',
                vision: 'qwen-vl-max'
            },
            'Volcengine': {
                base: 'https://ark.cn-beijing.volces.com/api/v3',
                text: 'doubao-pro-256k',
                image: 'doubao-image',
                vision: 'doubao-vision-pro'
            },
            'Custom': { base: '', text: '', image: '', vision: '' }
        };

        const preset = defaults[provider] || defaults['Gemini'];

        return {
            ai: {
                provider: provider,
                baseUrl: getConfig('BASE_URL', 'AI_BASE_URL', preset.base),
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
    }

    // 重置为环境变量默认值
    static async resetToEnv() {
        const envSettings = this.loadFromEnv();
        console.log('[SettingService] Resetting to Env configuration...');
        return await this.updateSettings(envSettings);
    }

    // 获取环境预设（供前端显示默认值）
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
                text: 'gemini-3-pro-preview',
                image: 'gemini-3-pro-image',
                vision: 'gemini-3-pro-preview'
            },
            'OpenAI': {
                base: 'https://api.openai.com/v1',
                text: 'gpt-4-turbo',
                image: 'dall-e-3',
                vision: 'gpt-4-vision-preview'
            },
            'Zhipu': {
                base: 'https://open.bigmodel.cn/api/paas/v4',
                text: 'glm-4',
                image: 'cogview-3',
                vision: 'glm-4v'
            },
            'SiliconFlow': {
                base: 'https://api.siliconflow.cn/v1',
                text: 'deepseek-ai/DeepSeek-V2.5',
                image: 'black-forest-labs/FLUX.1-schnell',
                vision: 'deepseek-ai/DeepSeek-V2.5'
            },
            'ModelScope': {
                base: 'https://api-inference.modelscope.cn/v1',
                text: 'qwen-max',
                image: 'wanx-v1',
                vision: 'qwen-vl-max'
            },
            'Volcengine': {
                base: 'https://ark.cn-beijing.volces.com/api/v3',
                text: 'doubao-pro-256k',
                image: 'doubao-image',
                vision: 'doubao-vision-pro'
            }
        };

        const presets: Record<string, any> = {};

        for (const [provider, prefix] of Object.entries(prefixMap)) {
            const defaultPreset = defaults[provider];

            presets[provider] = {
                baseUrl: getEnv(`${prefix}_BASE_URL`) || defaultPreset?.base || '',
                models: {
                    text: getEnv(`${prefix}_MODEL_TEXT`) || defaultPreset?.text || '',
                    image: getEnv(`${prefix}_MODEL_IMAGE`) || defaultPreset?.image || '',
                    vision: getEnv(`${prefix}_MODEL_VISION`) || defaultPreset?.vision || ''
                }
            };
        }
        return presets;
    }

    // 更新配置（自动处理脱敏字段）
    static async updateSettings(config: any) {
        // 获取当前配置以恢复被脱敏的密钥
        const currentSettings = await this.getSettings();

        // 递归恢复脱敏的密钥
        const restoreKeys = (incoming: any, original: any): any => {
            if (!incoming || typeof incoming !== 'object' || !original) {
                return incoming;
            }

            if (Array.isArray(incoming)) return incoming;

            const result = { ...incoming };

            for (const key in result) {
                const val = result[key];
                const originalVal = original[key];

                // 如果值以••••开头，说明是被脱敏的密钥，恢复原值
                if (typeof val === 'string' && val.startsWith('••••')) {
                    if (originalVal) {
                        result[key] = originalVal;
                    }
                } else if (typeof val === 'object' && val !== null) {
                    result[key] = restoreKeys(val, originalVal);
                }
            }
            return result;
        };

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

    // 启动时同步环境变量到数据库
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
}
```

## 环境配置

### 环境变量配置 (.env)

```env
# ================================================
# AI 引擎配置
# ================================================

# 默认AI提供商 (Gemini, OpenAI, Zhipu, SiliconFlow, ModelScope, Volcengine, Custom)
AI_PROVIDER=Gemini

# 通用配置（作为各提供商的fallback）
AI_BASE_URL=https://generativelanguage.googleapis.com
AI_API_KEY=your-api-key-here
AI_MODEL_TEXT=gemini-3-pro-preview
AI_MODEL_IMAGE=gemini-3-pro-image
AI_MODEL_VISION=gemini-3-pro-preview

# Gemini特定配置（优先级高于通用配置）
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL_TEXT=gemini-3-pro-preview
GEMINI_MODEL_IMAGE=gemini-3-pro-image
GEMINI_MODEL_VISION=gemini-3-pro-preview

# OpenAI配置
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL_TEXT=gpt-4-turbo
OPENAI_MODEL_IMAGE=dall-e-3
OPENAI_MODEL_VISION=gpt-4-vision-preview

# 智谱AI配置
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_API_KEY=your-zhipu-key
ZHIPU_MODEL_TEXT=glm-4
ZHIPU_MODEL_IMAGE=cogview-3
ZHIPU_MODEL_VISION=glm-4v

# 火山引擎配置
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_API_KEY=your-volcengine-key
VOLCENGINE_MODEL_TEXT=doubao-pro-256k
VOLCENGINE_MODEL_IMAGE=doubao-image
VOLCENGINE_MODEL_VISION=doubao-vision-pro

# 自定义组合配置
COMBO_TEXT_BASE=https://open.bigmodel.cn/api/paas/v4
COMBO_TEXT_KEY=your-text-key
COMBO_TEXT_MODEL=glm-4.7

COMBO_IMAGE_BASE=http://127.0.0.1:8045/v1
COMBO_IMAGE_KEY=your-image-key
COMBO_IMAGE_MODEL=gemini-3-pro-image

COMBO_VISION_BASE=http://127.0.0.1:8045/v1
COMBO_VISION_KEY=your-vision-key
COMBO_VISION_MODEL=gemini-3-flash

# 文档解析配置
DOC_PARSER_PROVIDER=MinerU
DOC_PARSER_BASE=https://mineru.net
DOC_PARSER_KEY=your-mineru-key

# 图片生成配置
IMG_RESOLUTION=2048x2048

# 性能配置
PERF_TEXT_CONCURRENCY=2
PERF_IMAGE_CONCURRENCY=1

# 输出语言
OUTPUT_LANGUAGE=zh
```

## API 接口

### 获取配置

```
GET /api/settings
```

**说明**: 返回完整配置（后端服务使用，无认证）

**响应：**
```json
{
  "success": true,
  "data": {
    "ai": {
      "provider": "Gemini",
      "baseUrl": "https://generativelanguage.googleapis.com",
      "apiKey": "actual-api-key",
      "models": {
        "text": "gemini-3-pro-preview",
        "image": "gemini-3-pro-image",
        "vision": "gemini-3-pro-preview"
      },
      "customCombo": { ... }
    },
    "docParser": { ... },
    "performance": { ... }
  }
}
```

### 获取脱敏配置

```
GET /api/settings/masked
```

**说明**: 返回脱敏配置（前端展示用，API密钥显示为••••xxxx）

**响应：**
```json
{
  "success": true,
  "data": {
    "ai": {
      "provider": "Gemini",
      "baseUrl": "https://generativelanguage.googleapis.com",
      "apiKey": "••••••••key",
      "models": { ... }
    }
  },
  "envPresets": {
    "Gemini": { "baseUrl": "...", "models": { ... } },
    "OpenAI": { "baseUrl": "...", "models": { ... } }
  }
}
```

### 更新配置

```
POST /api/settings
Content-Type: application/json
```

**请求体：**
```json
{
  "config": {
    "ai": {
      "provider": "Gemini",
      "baseUrl": "https://generativelanguage.googleapis.com",
      "apiKey": "new-api-key",
      "models": {
        "text": "gemini-3-pro-preview",
        "image": "gemini-3-pro-image",
        "vision": "gemini-3-flash"
      }
    }
  }
}
```

**响应：**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### 重置配置

```
POST /api/settings/reset
```

**说明**: 重置为环境变量默认值

**响应：**
```json
{
  "success": true,
  "message": "Settings reset to environment defaults"
}
```

## 前端组件

### AI引擎配置面板

```tsx
// AIEngineConfig.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Cpu, Save, RotateCcw, Eye, EyeOff } from 'lucide-react';

const PROVIDERS = [
  { value: 'Gemini', label: 'Google Gemini', flag: '🇺🇸' },
  { value: 'OpenAI', label: 'OpenAI', flag: '🇺🇸' },
  { value: 'Zhipu', label: '智谱AI', flag: '🇨🇳' },
  { value: 'Volcengine', label: '火山引擎', flag: '🇨🇳' },
  { value: 'SiliconFlow', label: 'SiliconFlow', flag: '🇨🇳' },
  { value: 'ModelScope', label: '魔搭社区', flag: '🇨🇳' },
  { value: 'Custom', label: '自定义组合', flag: '🛠️' }
];

export const AIEngineConfig: React.FC = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchMaskedSettings
  });

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success('配置已更新');
    },
    onError: () => {
      toast.error('更新失败');
    }
  });

  const resetMutation = useMutation({
    mutationFn: resetSettings,
    onSuccess: () => {
      toast.success('已重置为默认值');
    }
  });

  if (isLoading) return <div>加载中...</div>;

  const config = formData.ai || settings?.data?.ai;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Cpu className="w-6 h-6" />
          AI引擎配置
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={() => updateMutation.mutate({ config: formData })}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      {/* 提供商选择 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <label className="block text-sm font-medium mb-2">AI提供商</label>
        <select
          value={config?.provider}
          onChange={(e) => setFormData({
            ...formData,
            ai: { ...config, provider: e.target.value }
          })}
          className="w-full px-3 py-2 border rounded-lg"
        >
          {PROVIDERS.map(p => (
            <option key={p.value} value={p.value}>
              {p.flag} {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* API配置 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-semibold">API配置</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">Base URL</label>
          <input
            type="text"
            value={config?.baseUrl}
            onChange={(e) => setFormData({
              ...formData,
              ai: { ...config, baseUrl: e.target.value }
            })}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="https://api.example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config?.apiKey}
              onChange={(e) => setFormData({
                ...formData,
                ai: { ...config, apiKey: e.target.value }
              })}
              className="w-full px-3 py-2 pr-10 border rounded-lg"
              placeholder="输入API密钥"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            出于安全考虑，仅显示密钥后4位。如需修改，请直接输入新密钥。
          </p>
        </div>
      </div>

      {/* 模型配置 */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="font-semibold">模型配置</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">文本模型</label>
            <input
              type="text"
              value={config?.models?.text}
              onChange={(e) => setFormData({
                ...formData,
                ai: {
                  ...config,
                  models: { ...config.models, text: e.target.value }
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">图片模型</label>
            <input
              type="text"
              value={config?.models?.image}
              onChange={(e) => setFormData({
                ...formData,
                ai: {
                  ...config,
                  models: { ...config.models, image: e.target.value }
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">视觉模型</label>
            <input
              type="text"
              value={config?.models?.vision}
              onChange={(e) => setFormData({
                ...formData,
                ai: {
                  ...config,
                  models: { ...config.models, vision: e.target.value }
                }
              })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 扩展阅读

- [多模型路由](../02_AI生成能力/多模型路由.md) - 路由算法详解
- [图片生成技术细节](../02_AI生成能力/图片生成技术细节.md) - 图片生成实现
- [系统设置与配置](../15_系统设置/系统设置与配置.md) - 完整系统配置
- [设置服务实现](../../../server/src/services/setting.service.ts) - 后端代码

---

*最后更新: 2026-02-16*  
*文档版本: v2.0 (基于实际代码扩充)*
