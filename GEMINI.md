# Gemini 与多模型集成引擎 (GEMINI.md)

BananaSlides-GenAI 核心引擎不仅深度集成了 Google Gemini，还提供了一个高度灵活的“多提供商适配层”，支持主流 AI 大模型及自定义组合配置。

## 1. 核心 AI 能力架构

系统将 AI 任务分为三个独立维度，支持按需分配不同的模型服务：

| 任务维度              | 适用场景                                 | 默认/推荐模型                    |
| :-------------------- | :--------------------------------------- | :------------------------------- |
| **文本生成 (Text)**   | 大纲策划、需求润色、详细文案扩充         | `gemini-3-pro-preview`           |
| **图像生成 (Image)**  | PPT 页面视觉渲染、风格化输出             | `gemini-3-pro-image` (16:9 原生) |
| **视觉识别 (Vision)** | 识别用户上传的 PDF/图片并转化为 PPT 需求 | `gemini-3-pro-preview`           |

## 2. 深度 Gemini 集成特性

- **原生 SDK 通信**：直接使用 `@google/genai`，支持 `responseSchema` 强制 JSON 格式化，大纲生成零错误率。
- **16:9 原生图像生成**：针对 `gemini-3-pro-image` 优化的宽高比适配算法，确保 PPT 页面比例完美。
- **样式参考 (Style Ref)**：支持将用户上传的图片作为视觉参考（Style Reference），通过 Gemini 视觉模型提取并迁移艺术风格。

## 3. 多提供商支持 (Multi-Provider)

除了原生 Gemini，系统还预设了以下提供商的适配器：

- **OpenAI**: 兼容 GPT-4 Turbo / DALL-E 3。
- **国内主流**: 智谱 AI (GLM-4)、硅基流动 (DeepSeek/Flux)、魔塔社区 (Qwen)。
- **Custom Combo (组合模式)**：**特色功能**。允许用户混合使用不同服务。例如：使用 GLM-4 生成文本，同时调用 Gemini 生成图像。

## 4. 高级配置参数

- **并发控制 (Concurrency)**：在`全局设置`中可手动调节文本与图像生成的最大并发数，以适配不同 API Key 的速率限制（Rate Limits）。
- **分辨率控制**：图像生成支持 1K (1024px)、2K (2048px)、4K (4096px) 三档分辨率选择。
- **自动检测语言**：支持中、英、日三种语言输出，并具备输入语言自动检测能力。

## 5. 开发建议

- 推荐在 `.env.local` 预设 `GEMINI_API_KEY`。
- 如果使用代理（如 OneAPI），系统会自动去除 URL 中的 `/v1` 后缀以适配 Google Native SDK，同时保留 `Authorization` 头部信息。
