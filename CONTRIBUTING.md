# 贡献指南

感谢你对 YH-AI PPT 的关注！欢迎参与项目贡献。

## 快速开始

### 环境要求

- Node.js v18+（推荐 v22+）
- 一个 AI 提供商的 API Key（如 [Gemini](https://aistudio.google.com/)）

### 本地开发

```bash
# 1. 安装依赖
npm install && cd server && npm install

# 2. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env，填写 AI_PROVIDER 和对应的 API Key

# 3. 初始化数据库
cd server && npx prisma db push

# 4. 启动开发服务
# 方式一：Windows 一键启动
一键启动.bat
# 方式二：分别启动
npm run dev          # 前端 localhost:1000
cd server && npm run dev  # 后端 localhost:1111
```

### 测试

```bash
# 前端单元测试
npm test

# E2E 测试
npm run test:e2e

# 后端测试
cd server && npm test
```

## 如何贡献

### 提交 Issue

- Bug 报告：请描述复现步骤、预期行为和实际行为
- 功能建议：请描述使用场景和期望效果

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：使用清晰的中文或英文 commit message
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- TypeScript 严格模式，避免 `any`
- React 函数组件 + Hooks
- Tailwind CSS 样式
- 后端遵循 Routes → Controllers → Services → Prisma 分层
- API 输入使用 Zod 校验

### Commit 规范

使用约定式提交格式：

- `feat: 新功能`
- `fix: 修复bug`
- `docs: 文档更新`
- `refactor: 代码重构`
- `test: 测试相关`
- `chore: 构建/工具变更`

## 许可证

本项目采用 [AGPL-3.0](./LICENSE) 许可证。贡献的代码将按相同许可证授权。
