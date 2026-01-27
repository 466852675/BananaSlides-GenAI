# MCP 包使用指南

本项目已全局安装以下两个 MCP（Model Context Protocol）包：

## 已安装的 MCP 包

| MCP 包 | 版本 | 功能描述 |
|---------|-------|----------|
| **@playwright/mcp** | 0.0.56 | 浏览器自动化、网页交互、截图、表单填写 |
| **context7** | 1.0.3 | 项目查询、代码搜索、信息获取 |

## Playwright MCP (@playwright/mcp)

### 功能概览
- **浏览器自动化**：使用 Playwright 自动化浏览器操作
- **网页交互**：点击、滚动、拖拽、表单填写
- **页面快照**：捕获结构化可访问性快照（优于截图）
- **支持所有主流浏览器**：Chrome、Firefox、Edge、WebKit
- **LLM 友好**：无需视觉模型，纯文本交互

### 核心工具能力

```bash
# 标准启动命令
npx @playwright/mcp@latest

# 带参数启动示例
npx @playwright/mcp@latest --headless --browser chrome
```

### 配置示例

#### VS Code 配置
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

#### Cursor 配置
```json
{
  "mcpServers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@playwright/mcp@latest"
      ]
    }
  }
}
```

#### 使用场景

1. **网页测试**：自动化测试网页功能
2. **表单填写**：自动填写和提交表单
3. **数据抓取**：从网页提取数据
4. **UI 测试**：测试用户界面交互

---

## Context7 CLI (context7)

### 功能概览
- **项目查询**：快速搜索和查询 Context7 索引的项目
- **代码搜索**：在项目文档中搜索特定代码片段
- **信息获取**：获取项目元数据（仓库、更新时间等）
- **灵活输出**：支持文本和 JSON 格式输出

### 核心命令能力

```bash
# 基本命令结构
c7 <projectname> <query...> [options]

# 常用选项
--type txt           # 输出为文本（默认）
--type json          # 输出为 JSON
--save              # 保存查询结果到文件
--tokens 1000        # 限制 API 响应令牌数
```

### 使用示例

```bash
# 查询 Next.js 项目状态
c7 nextjs info

# 搜索 React 代码片段
c7 search react "useEffect" --type json

# 查询项目并保存结果
c7 vite query "file upload" --save -s vite_llms_file_upload.json
```

---

## 在项目中使用这些 MCP

### 方式一：通过 MCP 客户端集成

如果您使用的 IDE 或 AI 助手支持 MCP（如 VS Code、Cursor、Claude Desktop），可以直接配置使用：

1. **打开 IDE 设置**
2. **找到 MCP 服务器配置**
3. **添加配置**

Playwright 配置：
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

Context7 配置：
```bash
# 通过命令行调用
c7 <projectname> <query>
```

### 方式二：通过代码直接调用

如果需要在代码中调用，可以使用 Node.js 的 `child_process` 或 MCP SDK：

```javascript
import { spawn } from 'child_process';
import { createConnection } from '@modelcontextprotocol/sdk/server/sse.js';

// 调用 Playwright MCP
const connection = await createConnection({
  name: 'playwright',
  command: 'npx',
  args: ['@playwright/mcp@latest']
});

await connection.connect();

// 使用工具
const result = await connection.callTool('browser_click', {
  element: '#submit-button',
  ref: 'button-ref'
});
```

---

## 验证安装

### 检查安装状态
```bash
# 查看 Playwright MCP
npm list -g @playwright/mcp

# 查看 Context7 CLI
npm list -g context7

# 测试运行
c7 --help
```

### 输出示例

```bash
# Playwright MCP 工具列表
browser_click        # 点击元素
browser_close        # 关闭浏览器
browser_navigate     # 导航到URL
browser_fill_form   # 填写表单
browser_screenshot  # 截图
browser_snapshot     # 获取页面快照
browser_type_text    # 输入文本
browser_wait_for     # 等待元素

# Context7 命令
c7 <projectname>     # 查询项目信息
c7 search <term>     # 搜索项目
c7 info <projectname> # 获取项目详情
```

---

## 常见问题解答

### Q: 如何在 VS Code 中使用？
A: 打开命令面板（Ctrl+Shift+P），输入：
```
code --add-mcp '{"name":"playwright","command":"npx","args":["@playwright/mcp@latest"]}'
```

### Q: 如何在 Cursor 中使用？
A: 打开设置 → AI → Manage MCP Servers → 点击 "Add New MCP Server"：
   - Name: `playwright`
   - Command: `npx`
   - Args: `["@playwright/mcp@latest"]`

### Q: Playwright MCP 和 Playwright 浏览器有什么区别？
A: 
   - **Playwright MCP**：提供 LLM 友好的 API，通过 MCP 协议与 AI 对话
   - **Playwright 浏览器**：底层的浏览器自动化库，MCP 服务器依赖它

### Q: Context7 可以搜索哪些平台？
A: Context7 索引了 GitHub、GitLab、Git 等平台上的项目

---

## 技术栈要求

- **Node.js**: >= 18.0.0
- **npm**: 全局安装包管理器
- **MCP Client**: 支持 VS Code、Cursor、Claude Desktop 等

---

## 更多资源

### Playwright MCP 文档
https://github.com/microsoft/playwright-mcp

### Context7 文档
https://github.com/quint/context7

### MCP 协议规范
https://modelcontextprotocol.io/

---

**最后更新**: 2025-01-25
