# 代码质量审查 SKILL 使用指南

## 概述

本 SKILL 提供了 BananaSlides 项目的全面代码质量审查功能,涵盖了类型检查、构建验证、依赖审计、安全检查和 API 测试等多个维度。

## 审查维度

### 1. 类型安全检查
- **前端类型检查**: 使用 TypeScript 编译器检查前端代码
- **后端类型检查**: 使用 TypeScript 编译器检查后端代码
- **检查内容**:
  - 类型定义完整性
  - 接口一致性
  - 泛型使用正确性
  - 类型推断准确性

### 2. 构建验证
- **前端构建**: 执行 `vite build` 验证前端可构建性
- **后端构建**: 执行 `tsc` 验证后端可编译性
- **检查内容**:
  - 依赖完整性
  - 配置正确性
  - 模块解析
  - 打包产物

### 3. 数据库验证
- **Prisma 模式验证**: 验证 schema.prisma 语法
- **Prisma 格式化**: 确保代码格式一致性
- **检查内容**:
  - 数据模型定义
  - 关系配置
  - 迁移文件一致性
  - 索引和约束

### 4. 安全审计
- **前端依赖审计**: 检查前端依赖包安全漏洞
- **后端依赖审计**: 检查后端依赖包安全漏洞
- **检查内容**:
  - 已知漏洞(CVE)
  - 依赖版本过期
  - 配置安全问题
  - API Key 泄露风险

### 5. 代码一致性
- **API 端点测试**: 验证关键 API 可用性
- **代码规范检查**: 确保前后端代码风格一致
- **检查内容**:
  - 命名规范
  - 代码格式
  - 注释完整性
  - 文件组织结构

## 使用方式

### 快速开始

```bash
# 执行完整的代码质量审查
# 使用 code-quality.json SKILL 配置
```

### 分步执行

如果需要单独执行某个检查步骤:

```bash
# 1. 前端类型检查
cd /path/to/BananaSlides-GenAI
npx tsc --noEmit

# 2. 后端类型检查
cd server
npx tsc --noEmit

# 3. 前端构建
cd ..
npm run build

# 4. 后端构建
cd server
npm run build

# 5. 数据库验证
npx prisma validate
npx prisma format

# 6. 依赖审计
npm audit --audit-level=moderate

# 7. API 测试
node test_api.js
```

## 审查报告

审查完成后会生成 `code-quality-report.txt` 报告文件,包含:

- ✅ 通过的检查项
- ❌ 失败的检查项
- ⚠️ 警告信息
- 📋 改进建议

## 常见问题处理

### TypeScript 类型错误

**问题**: `error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'`

**解决方案**:
1. 检查类型定义是否正确
2. 添加类型断言或类型守卫
3. 修改函数签名或调用方式

### 构建失败

**问题**: `Build failed with errors`

**解决方案**:
1. 检查依赖是否完整安装
2. 清理缓存: `rm -rf node_modules dist && npm install`
3. 检查 Vite/TypeScript 配置

### Prisma 验证错误

**问题**: `Error validating Prisma Schema`

**解决方案**:
1. 检查语法错误
2. 运行 `npx prisma format` 自动修复格式
3. 检查模型关系配置
4. 重新生成客户端: `npx prisma generate`

### 依赖安全漏洞

**问题**: `npm audit found vulnerabilities`

**解决方案**:
1. 查看漏洞详情: `npm audit`
2. 自动修复: `npm audit fix`
3. 手动更新有漏洞的包
4. 如果是开发依赖可考虑 `--force` 选项

## 最佳实践

### 代码质量维护

1. **定期审查**: 每周至少执行一次完整审查
2. **提交前检查**: 提交代码前运行类型检查和构建
3. **持续监控**: 关注依赖包安全公告
4. **及时更新**: 定期更新依赖到安全版本

### TypeScript 使用

1. **启用严格模式**: 在 tsconfig.json 中设置 `"strict": true`
2. **避免 any 类型**: 尽量使用具体类型
3. **使用类型守卫**: 确保运行时类型安全
4. **利用泛型**: 提高代码复用性

### 依赖管理

1. **锁定版本**: 使用 package-lock.json 锁定版本
2. **定期审计**: 每月执行 `npm audit`
3. **谨慎更新**: 测试后再更新生产环境依赖
4. **移除未使用**: 定期清理无用依赖

## 检查清单

使用此清单确保所有质量标准都已满足:

- [ ] 前端无 TypeScript 错误
- [ ] 后端无 TypeScript 错误
- [ ] 所有类型定义完整
- [ ] 前端构建成功
- [ ] 后端构建成功
- [ ] 无构建警告
- [ ] Prisma Schema 语法正确
- [ ] 迁移文件一致性
- [ ] 数据库模型关系正确
- [ ] 无高危安全漏洞
- [ ] 依赖包版本更新
- [ ] API Key 安全配置
- [ ] 命名规范一致
- [ ] 代码格式统一
- [ ] 注释清晰完整

## 相关资源

- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [Vite 文档](https://vitejs.dev/)
- [npm Audit 文档](https://docs.npmjs.com/cli/v8/commands/npm-audit)
