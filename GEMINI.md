# ⚡ Hybrid AI Engine Configuration (混合引擎配置手册)

> **BananaSlides-GenAI** 并不绑定单一供应商。通过其强大的 **Router-Adapter** 架构，您可以自由组合全球最顶尖的 AI 模型，以达到成本、速度与质量的最佳平衡。

---

## 1. 核心模型矩阵 (Key Model Matrix)

我们在代码中预置了以下三类任务的最佳实践模型，同时也支持您通过 OpenAI 兼容接口接入任意模型。

| 任务层 (Layer)       | 推荐模型 (Google)      | 推荐模型 (OpenAI) | 推荐模型 (Open Source)    | 职责描述                                                     |
| :------------------- | :--------------------- | :---------------- | :------------------------ | :----------------------------------------------------------- |
| **🧠 Text (大脑)**   | `gemini-3-pro-preview` | `gpt-4-turbo`     | `glm-4.7` / `deepseek-v3` | 负责逻辑推理、大纲生成、演讲稿撰写。需要高智商与长上下文。   |
| **🎨 Image (画布)**  | `gemini-3-pro-image`   | `dall-e-3`        | `flux-pro` / `wanx-v1`    | 负责生成 16:9 的高审美背景图。需具备优秀的构图与光影理解力。 |
| **👁️ Vision (眼睛)** | `gemini-3-pro-preview` | `gpt-4o`          | `qwen-vl-max`             | 负责读取用户上传的 PDF/图片，提取风格参数与文字内容。        |

---

## 2. 接入方式详解 (Integration Guide)

所有配置均位于前端界面的 **"全局设置 (Global Settings)"** 面板中。

### A. Google Gemini (Native Mode)

_推荐指数：⭐⭐⭐⭐⭐_
直接调用 Google 原生 API，延迟最低，支持高级参数控制。

- **API Key**: 前往 [Google AI Studio](https://aistudio.google.com/) 免费申请。
- **Base URL**: 默认为 `https://generativelanguage.googleapis.com`。
  - _Tips_: 国内用户如使用代理，请填写代理商提供的 BaseURL (通常需去除 `/v1` 后缀)。

### B. OpenAI Compatible (Universal Mode)

_推荐指数：⭐⭐⭐⭐_
支持所有兼容 OpenAI 接口规范的服务商（如 DeepSeek, Moonshot, SiliconFlow, OneAPI）。

- **API Key**: 也就是通常说的 `sk-xxxx`。
- **Model ID**: 手动输入目标模型名称（如 `deepseek-chat`）。
- **注意**: 此模式下，部分 Gemini 特有的参数（如 SafetySettings）可能不生效。

### C. Custom Combo (组合模式)

_推荐指数：⭐⭐⭐⭐⭐ (极客首选)_
**打破单一供应商限制，组装你的“超级战舰”。**

- **原理**: 系统内部维护了 `textProvider`, `imageProvider`, `visionProvider` 三个独立的 Client 实例。
- **配置**:
  1.  **Text**: 选择 **DeepSeek-V3** (便宜且聪明) 用于生成大量文本。
  2.  **Image**: 选择 **Gemini 3 Image** (免费且画质高) 用于渲染背景。
  3.  **Vision**: 选择 **GPT-4o** (视觉最强) 用于精准识别上传的文档。
- **优势**: 成本降低 80%，同时获得各领域的 SOTA 体验。

---

## 3. 性能调优 (Performance Tuning)

在 "Performance" 选项卡中，您可以微调引擎的“油门”与“刹车”。

### 🚀 并发控制 (Concurrency)

- **Text Concurrency (Default: 3)**:
  - 同时生成多少页的正文。建议保持在 3-5 之间。
  - _过高风险_: 触发文本模型的 RPM (Requests Per Minute) 限制。
- **Image Concurrency (Default: 1)**:
  - 同时渲染多少张图片。建议 **不要超过 2**。
  - _理由_: 绘图模型通常 QPS 极低，且 GPU 资源昂贵。并发过高极易导致 429 报错或绘图质量下降。

### 🖼️ 分辨率策略 (Resolution)

- **1K (1024x1024 / 16:9)**: 快速预览。约 3-5 秒出图。
- **2K (Upscaled)**: 标准演示。适合 1080P 投影仪。
- **4K (Ultra)**: 影院级。仅推荐在最后导出前使用，生成时间较长 (10s+)。

---

## 4. 提示词工程 (Prompt Engineering)

本系统的 **Visual Designer** 内置了一个强大的 Prompt 优化器 (**Smart Refine**)。

### 工作原理

当您输入简单的 _"科技感"_ 时，AI 会自动将其扩写为：

> _"Futuristic digital landscape, cybernetic data streams, neon blue form factors, dark background, cinematic lighting, 8k resolution, unreal engine 5 render..."_

### 编写技巧

如果您想手动控制风格，请遵循 **[主体] + [环境] + [风格] + [参数]** 的公式：

- ✅ **好**: _"Electric car concept (主体), driving on mars surface (环境), cyberpunk style, neon lights (风格), wide angle, photorealistic (参数)"_
- ❌ **差**: _"画一辆车"_

---

## 5. 常见错误排查 (Troubleshooting)

- **Error 401 (Unauthorized)**: API Key 错误或过期。请检查是否有多余空格。
- **Error 429 (Too Many Requests)**: 并发设置过高。请在 Performance 面板调低 Concurrency。
- **Error 500 / Timeout**: 通常是绘图服务响应慢。系统会自动重试 3 次，请耐心等待。
- **SecurityBlock**: Google 的安全过滤器拦截了敏感词。请尝试更委婉的描述。
