# 🍌 BananaSlides-GenAI 项目核心手册

> **最后更新时间**: 2026-01-25
> **核心原则**: 全局遵守 **中文原生协议 v5.0**

---

## 1. 🇨🇳 首要原则 (Prime Directives)

> **⚠️ 所有 Agent / 开发者必须遵守以下规则：**

*   **始终使用中文回答**：无论用户使用何种语言，输出必须强制使用中文。
*   **中文原生协议 v5.0**：
    *   **输出语言**：所有解释、计划 (Plans)、任务 (Tasks)、提交信息 (Commit Messages) 必须使用中文。
    *   **技术术语**：保留英文 (如 API, JWT, Docker)。
    *   **代码符号**：保留英文 (如 `fileName`, `functionName`)。

---

## 2. 🛠️ 运维与脚本指南 (Operations)

为了提升易用性与数据安全，项目已对脚本进行了全面重构。

### A. 启动应用 (Start Up)
*   **入口**：直接点击根目录下的 **`一键启动.bat`**。
*   **特性**：
    *   ✅ **自动备份**：启动时自动备份 `dev.db`（保留最近 10 份）。
    *   ✅ **清理进程**：自动结束残留的 Node.js 进程。
    *   ✅ **端口管理**：前端 (1000) + 后端 (1111)。

### B. 维护脚本 (Maintenance)
所有高级维护工具均位于 **`scripts/`** 目录下：
1.  **`备份数据库.bat`**：手动创建数据库快照。
2.  **`初始化数据库.bat`**：重新同步 Schema (无损)。
3.  **`强制重置数据库(慎用).bat`**：**[高危]** 删除并重建数据库。已添加“二次确认”安全锁。

---

## 3. ⚡ 混合 AI 引擎配置 (Hybrid AI Engine)

> **BananaSlides-GenAI** 并不绑定单一供应商。通过其强大的 **Router-Adapter** 架构，您可以自由组合全球最顶尖的 AI 模型。

### A. 核心模型矩阵 (Key Model Matrix)

| 任务层 (Layer) | 推荐模型 (Google) | 推荐模型 (Local/OpenAI) | 职责描述 |
| :--- | :--- | :--- | :--- |
| **🧠 Text (大脑)** | `gemini-3-pro-preview` | `deepseek-v3` / `gpt-4o` | 负责逻辑推理、大纲生成。 |
| **🎨 Image (画布)** | `gemini-3-pro-image` | `flux-pro` / `dall-e-3` | 负责生成 16:9 高审美背景图。 |
| **👁️ Vision (视觉)** | `gemini-3-flash` | `gpt-4o-mini` | 负责图片理解、参考图分析。 |

### B. 接入力方式 (Integration)
所有配置均位于前端界面的 **"全局设置 (Global Settings)"** 面板中。
*   **Google Native**: 直接填入 API Key。
*   **OpenAI Compatible**: 支持 DeepSeek, Ollama 等 (需填 Base URL)。

---

## 4. 性能与排查 (Performance & Troubleshooting)

### 🚀 性能参数
*   **Text Concurrency**: 建议 3-5 (控制正文生成速度)。
*   **Image Concurrency**: 建议 1 (控制绘图成本与限流)。

### 🔧 常见问题
*   **数据丢失?**：请检查 `server/prisma/` 下的 `dev.db.backup` 备份文件。
*   **启动闪退?**：请直接使用 `一键启动.bat`，它已内置字符集修复 (`chcp 65001`)。
*   **Vision 报错**：检查模型是否支持视觉能力，否则请切换至纯文本模式。
