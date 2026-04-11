# 项目来源标识设计文档

## 背景

用户反馈在 Agent 模式中的项目列表无法区分哪些项目是通过 IDE 模式手动创建的，哪些是通过 Agent 模式 AI 生成的。缺少直观的来源标识导致用户体验混乱。

## 设计方案

### 1. 数据库层面

#### 1.1 Schema 变更

在 `Project` 模型中新增 `source` 字段：

```prisma
model Project {
  id            String    @id @default(cuid())
  title         String
  // ... 其他字段
  source        String    @default("IDE") // IDE | AGENT - 项目创建来源
  // ... 关系字段

  @@index([source]) // 新增索引优化查询性能
}
```

**字段取值：**
- `IDE`: 手动创建（IDE 模式）
- `AGENT`: AI 生成（Agent 模式）

#### 1.2 迁移策略

- **默认值**: `IDE` - 现有项目自动标记为 IDE 模式创建
- **回退机制**: 如果数据库字段缺失，使用推断逻辑 `agentSession ? 'AGENT' : 'IDE'`
- **数据完整性**: 通过 `prisma db push` 已同步到生产数据库

---

### 2. 业务逻辑层面

#### 2.1 项目创建时标记来源

**IDE 模式** (`project.service.ts`):
```typescript
async create(ownerId: string, data: any) {
    const project = await prisma.project.create({
        data: {
            ...data,
            userId: ownerId,
            displayId: this.generateDisplayId(),
            source: 'IDE' // 默认值，显式声明
        },
        // ...
    });
    return this.mapSlideToItems(project);
}
```

**Agent 模式** (`agent.service.ts`):
```typescript
async createSession(input: AgentSessionCreateInput) {
    const session = await prisma.agentSession.create({
        data: {
            projectId: input.projectId,
            mode: input.mode || AgentMode.GUIDED,
            status: AgentSessionStatus.ACTIVE
        },
        // ...
    });

    // 创建会话后，更新项目来源为 AGENT
    await prisma.project.update({
        where: { id: input.projectId },
        data: { source: 'AGENT' }
    });

    return this.mapSessionToFrontend(session);
}
```

#### 2.2 查询时返回来源字段

**Agent 项目列表** (`agent.service.ts`):
```typescript
async getUserProjectsWithSessions(userId: string) {
    const projects = await prisma.project.findMany({
        where: { userId, isDeleted: false },
        select: {
            id: true,
            displayId: true,
            title: true,
            source: true, // ← 返回来源字段
            // ... 其他字段
        }
    });

    return projects.map(p => ({
        id: p.id,
        title: p.title,
        source: p.source || (enrichedSession ? 'AGENT' : 'IDE'), // 回退逻辑
        // ... 其他字段
    }));
}
```

---

### 3. 前端展示层面

#### 3.1 类型定义更新

**API 接口** (`src/api/agent.ts`):
```typescript
export interface ProjectWithSession {
  id: string;
  title: string;
  source: 'IDE' | 'AGENT'; // 新增来源字段
  agentSession?: { /* ... */ };
  // ... 其他字段
}
```

#### 3.2 视觉标识组件

**新建组件** (`src/components/ProjectSourceBadge.tsx`):

```tsx
export const ProjectSourceBadge: React.FC<{
  source: 'IDE' | 'AGENT';
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ source, showIcon = true, showText = true, size = 'md' }) => {
  const isAgent = source === 'AGENT';

  return (
    <Badge
      variant={isAgent ? 'default' : 'secondary'}
      className={`
        ${isAgent
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' // AI 生成
          : 'bg-slate-100 text-slate-700' // 手动创建
        }
      `}
    >
      {showIcon && (
        isAgent
          ? <Sparkles className="w-4 h-4" />
          : <Presentation className="w-4 h-4" />
      )}
      {showText && (isAgent ? 'AI 生成' : '手动创建')}
    </Badge>
  );
};
```

**视觉设计：**
- **Agent 项目**: 渐变紫色徽章 + 星光图标 (✨ AI 生成)
- **IDE 项目**: 灰色徽章 + 演示图标 (📊 手动创建)

#### 3.3 使用场景

**Agent 模式项目列表**:
```tsx
{projects.map(project => (
  <div className="flex items-center justify-between">
    <h3>{project.title}</h3>
    <ProjectSourceBadge source={project.source} />
  </div>
))}
```

**项目详情页**:
```tsx
<div className="flex items-center gap-2">
  <h1>{project.title}</h1>
  <ProjectSourceBadge source={project.source} size="lg" />
</div>
```

**项目卡片**:
```tsx
<Card>
  <CardHeader>
    <div className="flex justify-between">
      <CardTitle>{project.title}</CardTitle>
      <ProjectSourceBadge source={project.source} size="sm" showText={false} />
    </div>
  </CardHeader>
</Card>
```

---

## 实施清单

### ✅ 已完成
1. **数据库迁移** - 新增 `source` 字段并同步到生产数据库
2. **后端逻辑** - Agent 创建会话时更新项目来源
3. **后端查询** - 项目列表查询返回 `source` 字段
4. **前端类型** - 更新 `ProjectWithSession` 接口定义
5. **前端组件** - 创建 `ProjectSourceBadge` 徽章组件

### 🔄 待实施
1. **集成到 AgentView** - 在项目列表中展示徽章
2. **集成到项目卡片** - 在项目详情页展示徽章
3. **统计面板** - 展示 AI 生成项目占比
4. **筛选功能** - 支持按来源筛选项目

---

## 扩展建议

### 1. 时间线可视化

在项目详情页展示创建时间线：
```
[IDE 创建] ──────> [Agent 会话开始] ──────> [完成]
   10:00              10:05                  10:15
```

### 2. 来源统计

在用户中心展示：
- 总项目数: 20
- AI 生成: 15 (75%)
- 手动创建: 5 (25%)

### 3. 批量操作

支持按来源筛选后批量操作：
- 仅删除 AI 生成的失败项目
- 仅导出手动创建的项目

---

## 注意事项

### 1. 数据完整性

- 现有项目默认为 `IDE` 来源
- 创建 Agent 会话后立即更新来源（事务保证）
- 删除会话不改变项目来源（保留历史记录）

### 2. 性能优化

- `source` 字段已添加索引
- 查询时使用 `select` 避免返回大字段
- 前端组件使用 `React.memo` 避免不必要的重渲染

### 3. 国际化

预留国际化支持：
```tsx
const labels = {
  'IDE': t('project.source.ide'),
  'AGENT': t('project.source.agent')
};
```

---

## 测试验证

### 测试场景

1. **IDE 模式创建项目**
   - 验证 `source` 字段为 `IDE`
   - 徽章显示 "手动创建"

2. **Agent 模式创建会话**
   - 验证 `source` 字段更新为 `AGENT`
   - 徽章显示 "AI 生成"

3. **现有项目兼容**
   - 验证 `source` 字段默认为 `IDE`
   - 回退逻辑正常工作

4. **删除 Agent 会话**
   - 项目来源保持不变（仍为 `AGENT`）

---

## 总结

通过数据库字段 + 业务逻辑 + 视觉标识三层设计，实现了项目来源的清晰区分：

1. **数据层**: `source` 字段记录真实来源
2. **逻辑层**: 创建会话时自动更新来源
3. **展示层**: 渐变徽章提供视觉反馈

**用户价值：**
- 直观区分 AI 生成和手动创建的项目
- 快速识别高质量 AI 生成内容
- 便于管理和筛选项目

**技术优势：**
- 数据库层面保证数据完整性
- 回退机制兼容历史数据
- 视觉设计符合 AI 产品调性