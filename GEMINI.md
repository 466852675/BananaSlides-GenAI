# ⚡ 混合 AI 引擎配置手册 (Hybrid AI Engine)

> **BananaSlides-GenAI** 并不绑定单一供应商。通过其强大的 **Router-Adapter** 架构，您可以自由组合全球最顶尖的 AI 模型，以达到成本、速度与质量的最佳平衡。  
> 本文档主要关注 **AI 模型配置** 与 **性能调优**。关于系统架构、数据库模型与前端组件，请参阅 [README.md - 架构深度解析](./README.md#架构深度解析-architecture-deep-dive)。

---

## 1. 核心模型矩阵 (Key Model Matrix)

我们在代码中预置了以下四类任务的最佳实践模型，同时也支持您通过 OpenAI 兼容接口接入任意模型（包括本地 LLM）。

| 任务层 (Layer) | 推荐模型 (Google) | 推荐模型 (OpenAI / Local) | 推荐模型 (Open Source / Dedicated) | 职责描述 |
| :--- | :--- | :--- | :--- | :--- |
| **🧠 Text (大脑)** | `gemini-3-pro-preview` | `gpt-4o` / `qwen-2.5` | `deepseek-v3` / `glm-4.7` | 负责逻辑推理、大纲生成、演讲稿撰写。需要长上下文。 |
| **🎨 Image (画布)** | `gemini-3-pro-image` | `dall-e-3` | `flux-pro` | 负责生成 16:9 的高审美背景图。支持原生的 Gemini Image 2.0 接口。 |
| **👁️ Vision (视觉)** | `gemini-3-flash` | `gpt-4o-mini` | `qwen-vl-max` | **[优化]** 负责图片理解、参考图风格分析。使用 Flash 模型以获得极致速度。 |
| **📄 DocParser** | N/A | N/A | **MinerU** (Recommended) | 专用于 PDF/文档的高保真解析，准确识别表格、公式与多栏排版。 |

---

## 2. 交互逻辑演进 (Intelligence Flow)

系统在生成图片前，会执行一个隐藏的 **"视觉预处理"** 步骤：

1.  **Vision 提取**: 首先调用 `Vision` 模型对风格参考图进行深度切片，提取构图、空间层级、背景肌理和配色灵魂。
2.  **Prompt 合成**: 将上述特征与业务内容（如：幻灯片标题、正文）合并，构建出极具针对性的 **4 层级结构化 Prompt**。
3.  **精确渲染**: 确保 AI 绘图不仅是“好看”，而是“逻辑一致”地还原了参考图的核心设计语言。

---

## 3. 接入方式详解 (Integration Guide)

所有配置均位于前端界面的 **"全局设置 (Global Settings)"** 面板中。配置数据将安全存储在本地 SQLite 数据库中。

### A. Google Gemini (Native Mode)
直接调用 Google 原生 API，支持高级参数控制（如 Safety Settings）。
- **API Key**: 前往 [Google AI Studio](https://aistudio.google.com/) 免费申请。
- **Base URL**: 默认为 `https://generativelanguage.googleapis.com`。

### B. OpenAI Compatible (Universal Mode)
支持所有兼容 OpenAI 接口规范的服务商，也支持 **Ollama / LM Studio** 等本地模型。
- **Base URL**: 
  - DeepSeek: `https://api.deepseek.com`
  - Ollama: `http://localhost:11434/v1`
- **Model ID**: 手动输入目标模型名称（如 `deepseek-chat` 或 `llama3`）。

---

## 4. 性能调优 (Performance Tuning)

在 "Performance" 选项卡中，您可以微调引擎的“油门”与“刹车”。

### 🚀 并发控制 (Concurrency)
- **Text Concurrency (Default: 3)**: 同时生成多少页的正文。建议保持在 3-5 之间。
- **Image Concurrency (Default: 1)**: 同时渲染多少张图片。因绘图昂贵且 API 限制较严，建议设置为 1。

### 🖼️ 分辨率策略 (Resolution)
系统支持基于目标场景的动态分辨率：
- **1024x1024 / 16:9**: 快速预览。
- **2048x1024 (2K)**: **系统默认标准**，适合 1080P 投影仪。
- **4096x2048 (4K)**: 超高清导出。

---

## 5. 常见错误排查 (Troubleshooting)

- **Vision 解析失败**: 检查 `ai.service.ts` 中的模型 ID 映射。如果模型不支持 Vision，系统会降级到纯文字描述模式。
- **Error 429**: 并发过高。请在 Performance 面板降低 Concurrency。
- **MinerU 解析慢**: 处理大型 PDF 时可能需要 30-60 秒，请耐心等待或检查 MinerU API 状态。
