# ⚡ 混合 AI 引擎配置手册 (Hybrid AI Engine)

> **BananaSlides-GenAI** 并不绑定单一供应商。通过其强大的 **Router-Adapter** 架构，您可以自由组合全球最顶尖的 AI 模型，以达到成本、速度与质量的最佳平衡。  
> 本文档主要关注 **AI 模型配置** 与 **性能调优**。关于系统架构、数据库模型与前端组件，请参阅 [README.md - 架构深度解析](./README.md#架构深度解析-architecture-deep-dive)。

---

## 1. 核心模型矩阵 (Key Model Matrix)

我们在代码中预置了以下四类任务的最佳实践模型，同时也支持您通过 OpenAI 兼容接口接入任意模型（包括本地 LLM）。

| 任务层 (Layer) | 推荐模型 (Google) | 推荐模型 (OpenAI / Local) | 推荐模型 (Open Source / Dedicated) | 职责描述 |
| :--- | :--- | :--- | :--- | :--- |
| **🧠 Text (大脑)** | `gemini-3-pro-preview` | `gpt-4-turbo` / `qwen-2.5` | `deepseek-v3` / `glm-4.7` | 负责逻辑推理、大纲生成、演讲稿撰写。需要高智商与长上下文。 |
| **🎨 Image (画布)** | `gemini-3-pro-image` | `dall-e-3` | `flux-pro` / `wanx-v1` | 负责生成 16:9 的高审美背景图。需具备优秀的构图与光影理解力。 |
| **👁️ Vision (视觉)** | `gemini-3-pro-preview` | `gpt-4o` | `qwen-vl-max` | 负责通用图片理解 (如从图片中提取灵感)。 |
| **📄 DocParser (文档)** | N/A | N/A | **MinerU** (Recommended) | **[新]** 专用于 PDF/文档的高保真解析，准确识别表格、公式与多栏排版。 |

---

## 2. 接入方式详解 (Integration Guide)

所有配置均位于前端界面的 **"全局设置 (Global Settings)"** 面板中。配置数据将安全存储在本地 SQLite 数据库中。

### A. Google Gemini (Native Mode)

_推荐指数：⭐⭐⭐⭐⭐_
直接调用 Google 原生 API，延迟最低，支持高级参数控制（如 Safety Settings）。

- **API Key**: 前往 [Google AI Studio](https://aistudio.google.com/) 免费申请。
- **Base URL**: 默认为 `https://generativelanguage.googleapis.com`。

### B. OpenAI Compatible (Universal Mode)

_推荐指数：⭐⭐⭐⭐_
支持所有兼容 OpenAI 接口规范的服务商，也支持 **Ollama / LM Studio** 等本地模型。

- **API Key**: 
  - 云服务：填写 `sk-xxxx`。
  - 本地模型：通常可填任意字符 (如 `sk-local`)。
- **Base URL**: 
  - DeepSeek: `https://api.deepseek.com`
  - Ollama: `http://localhost:11434/v1`
- **Model ID**: 手动输入目标模型名称（如 `deepseek-chat` 或 `llama3`）。

### C. Custom Combo (组合模式) —— *推荐*

_推荐指数：⭐⭐⭐⭐⭐ (极客首选)_
**打破单一供应商限制，组装你的“超级战舰”。**

- **配置逻辑**:
  1.  **Text Model**: 推荐 **DeepSeek-V3** (便宜且聪明) 用于生成大量文本。
  2.  **Image Model**: 推荐 **Gemini 3 Image** (免费且画质高) 用于渲染背景。
  3.  **Vision Model**: 推荐 **GPT-4o** (视觉最强) 用于精准识别上传的文档。
  4.  **DocParser**: 配置 **MinerU** API (或自建服务)，用于处理复杂的 PDF 上传需求。

---

## 3. 性能调优 (Performance Tuning)

在 "Performance" 选项卡中，您可以微调引擎的“油门”与“刹车”。这些设置会直接影响 `server/src/services/ai.service.ts` 中的并发控制逻辑。

### 🚀 并发控制 (Concurrency)

- **Text Concurrency (Default: 3)**:
  - 同时生成多少页的正文。建议保持在 3-5 之间。
  - _注意_: DeepSeek 等 API 通常有较低的并发限制，过高会导致 429 错误。
- **Image Concurrency (Default: 1)**:
  - 同时渲染多少张图片。建议 **不要超过 2**。
  - _理由_: 绘图不仅昂贵，而且大多数服务商限制 strict QPS。

### 🖼️ 分辨率策略 (Resolution)

- **1K (1024x1024 / 16:9)**: 快速预览。约 3-5 秒出图。
- **2K (Upscaled)**: 标准演示。适合 1080P 投影仪。
- **4K (Ultra)**: 影院级。仅推荐在最后导出前使用。

---

## 4. 常见错误排查 (Troubleshooting)

- **MinerU 解析失败**: 
  - 请检查 `MINERU_API_KEY` 是否配置。
  - 如果未配置，系统会自动降级 (Fallback) 使用通用 Vision 模型，但准确率可能下降。
- **Error 429**: 并发过高。请在 Performance 面板降低 Concurrency。
- **SecurityBlock (Gemini)**: Google 安全过滤器拦截。请尝试更委婉的 Prompt 或切换到 OpenAI/DeepSeek 模型。
