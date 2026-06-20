---
title: SPEC-001 — ProjectAttachment 类型定义
status: draft
capability: project-attachment
---

# SPEC-001: ProjectAttachment 类型定义

## 变更类型

新增（类型层）

## 改动文件

- `src/types.ts` — 新增 `ProjectAttachment` 接口；`ProjectSession` 增加 `attachment` 字段

## 需求

### Requirement: ProjectAttachment 接口

新增项目附件类型，描述用户上传的源文件元信息：

```typescript
export interface ProjectAttachment {
  name: string;       // 原始文件名，如 "report.pdf"
  type: string;       // MIME 类型，如 "application/pdf"
  url: string;        // 服务器相对路径，如 "/uploads/up-xxx.pdf"
  size?: number;      // 文件大小（字节），可选
}
```

**不变量**：
- `url` 为服务器返回的相对路径，非空时才可下载/预览
- 不含 `content`（解析文本）字段——内容按需从 url 获取，避免持久化冗余

### Requirement: ProjectSession 扩展

`ProjectSession` 接口增加可选附件字段：

```typescript
export interface ProjectSession {
  // ... 现有字段 ...
  attachment?: ProjectAttachment | null;  // 新增：项目源文档附件
}
```

**理由**：附件是项目级概念（源文档），不属于 `StyleConfig`（样式配置）。独立字段保持语义清晰。

## 场景

### Scenario: 历史项目无附件

- **Given** 数据库中 `globalConfig` JSON 不含 `fileAttachment` 键
- **When** `transformProject` 解析该项目
- **Then** `project.attachment` 为 `null`
- **And** 工作台不渲染附件条

### Scenario: 新项目带附件

- **Given** 用户通过文件生成 PPT 并导入工作台
- **When** `handleOutlineImport` 接收到非空 attachment
- **Then** `projectAttachment` state 被设置
- **And** `globalConfig.fileAttachment` 被持久化到 DB

## 验证方式

- `npm run build` 类型检查通过（无 TS 错误）
- `src/types.ts` 导出 `ProjectAttachment`，`ProjectSession` 含 `attachment` 字段
