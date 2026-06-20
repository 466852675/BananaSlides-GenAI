# 设计文档：图像生成全场景 E2E 验证

## 1. 测试架构

### 1.1 驱动层
```
Claude Code (本次会话)
    ↓ MCP stdio
@playwright/mcp@0.0.76 (--extension --browser msedge)
    ↓ CDP over browser extension
用户的 Edge 浏览器（已登录 admin 账号）
    ↓ HTTP/SSE/WebSocket
localhost:1000 (Vite 前端) → localhost:1111 (Express 后端)
    ↓ HTTPS
gpt-image-2 网关 (154.9.24.185:3100)
```

### 1.2 工具能力矩阵

| 工具 | 用途 | 关键参数 |
|------|------|---------|
| `browser_navigate` | 打开工作台 URL | `http://localhost:1000/?project=<test_project_id>` |
| `browser_snapshot` | 获取页面可访问性快照（替代 DOM 选择器猜测） | — |
| `browser_click` | 触发按钮（批量生成/单页生成/重新生成） | 用 snapshot 的 ref |
| `browser_type` | 输入大纲/项目名 | — |
| `browser_evaluate` | 在页面执行 JS：查 DB（fetch API）、读 React state、读 Query cache | 返回结构化数据 |
| `browser_route` | **核心**：Mock 网络响应 | `pattern` + `status` + `body` + `contentType` |
| `browser_route_list` | 列出当前所有 route | 测试可见性 |
| `browser_unroute` | 移除拦截 | 按 pattern 或全部 |
| `browser_network_state_set` | 全局断网/恢复 | `offline` / `online` |
| `browser_console_messages` | 抓 console 日志（验证无报错 + 验证 console.error 修复） | — |
| `browser_take_screenshot` | 证据归档 | 每阶段截图 |
| `browser_wait_for` | 等待文本/元素出现 | 等待"success"状态 |

### 1.3 为什么用 snapshot 而非 CSS 选择器
- 工作台 UI 复杂，CSS 选择器脆弱易变
- `browser_snapshot` 返回带 ref 的可访问性树，点击/输入用 ref，抗 UI 重构
- 失败时 snapshot 本身就是诊断证据

## 2. 测试项目隔离策略

### 2.1 沙箱项目生命周期
```
[创建] 新建项目「自动化测试-YYYYMMDD-HHmmss」
   ↓
[填充] 通过创作室生成 8 页大纲（AI 生成 outline，不生图）
   ↓
[测试] 7 阶段全部在该项目工作台进行
   ↓
[保留] 测试结束不删除（用户决定是否清理）
```

### 2.2 隔离保证
- **不触碰现有项目**：所有操作通过 `?project=<test_id>` 锁定到测试项目
- **不改配置**：不进管理后台、不调用任何 `/api/admin/*` 配置接口
- **不改 DB schema**：纯运行时操作
- **积分是真实扣费**：因为不动商业化配置，积分按当前规则真实扣除/退还（这正是要验证的）

### 2.3 测试项目识别
- 项目名带时间戳，避免与历史测试项目混淆
- 创建后立即记录 `test_project_id`，后续所有操作引用此 id

## 3. Mock 分类与策略

### 3.1 三类 Mock 场景

| 类别 | 触发方式 | 典型用例 | 副作用 |
|------|---------|---------|--------|
| **响应篡改** | `browser_route(pattern, status, body)` | 500/401/429/空响应 | 仅影响匹配 pattern 的请求 |
| **全局断网** | `browser_network_state_set(offline)` | 网络中断重试 | 影响所有请求，用完必须 restore |
| **无 Mock** | 直接调真实 API | 成功路径 | 真实扣积分 |

### 3.2 pattern 精准匹配规则

| 场景 | pattern | 说明 |
|------|---------|------|
| 生图 API | `**/api/ai/generate-slide-variant` | 只拦生图，不影响其他 |
| DB 同步 | `**/api/projects/*/slides` | PATCH 同步端点 |
| 项目查询 | 不拦 | 保持真实，用于读 DB 状态 |
| 积分查询 | 不拦 | 保持真实，用于积分核对 |

### 3.3 Mock 生命周期管理（关键）
- 每个失败场景**用前 route、用后 unroute**
- 阶段切换前 `browser_unroute`（无 pattern = 清除全部）防残留
- 阶段 B 结束必须清理所有 route，否则阶段 C/D 的真实请求会被误拦

### 3.4 时序风险对策
extension 模式 route 拦截可能有时序滞后。对策：
- **阶段 B 开场冒烟**：先 route 一个 500，触发一次生图，确认拦截生效（status=error 出现）才继续批量
- 若冒烟失败 → 回退方案：用 `browser_evaluate` 注入 `fetch` 拦截（monkey-patch window.fetch），这是扩展模式必支持的

## 4. 数据一致性三方检查方法

### 4.1 三方定义
| 方 | 来源 | 获取方式 |
|----|------|---------|
| **UI state** | React `items` | `browser_snapshot` 看 DOM 显示的 status/variants |
| **DB** | `Slide` 表 | `browser_evaluate` → `fetch('/api/projects/<id>')` 读 `items[].status/variants` |
| **Cache** | React Query `['project', id]` | `browser_evaluate` → `queryClient.getQueryData(['project', id])` |

### 4.2 一致性检查函数（在 browser_evaluate 中执行）
```javascript
// 伪代码，实际在 browser_evaluate 内联
async function checkConsistency(projectId, expectedSlideId, expectedStatus, expectVariant) {
  // 1. DB
  const dbRes = await fetch('/api/projects/' + projectId, {headers:{Authorization:'Bearer '+token}});
  const dbItem = (await dbRes.json()).items.find(i => i.id === expectedSlideId);
  // 2. Cache
  const cache = queryClient.getQueryData(['project', projectId]);
  const cacheItem = cache.items.find(i => i.id === expectedSlideId);
  // 3. 返回对比结果
  return {
    db: { status: dbItem.status, hasVariant: (dbItem.variants||[]).length > 0 },
    cache: { status: cacheItem.status, hasVariant: (cacheItem.variants||[]).length > 0 },
    dbCacheMatch: dbItem.status === cacheItem.status,
    dbHasVariant: expectVariant ? (dbItem.variants||[]).length > 0 : true
  };
}
```

### 4.3 关键一致性断言点
- 批量生成后：DB.variants 非空 = UI 显示图 = cache.variants 非空
- 刷新后：三方仍一致（B11 修复点）
- syncSlides 500 后：DB 不变（未被空数组覆盖）但 UI 已显示（乐观更新）

## 5. 积分验证方法

### 5.1 基线记录
- 阶段 0 记录初始积分 `balance_before`
- 查询规则：`getActionCost('slide_image')` 得到单次成本 `unit_cost`

### 5.2 扣费验证
- 阶段 A 成功 N 次生图 → 期望扣除 `N * unit_cost`
- 实际查询 `balance_after_A` → `balance_before - balance_after_A` 应 = `N * unit_cost`

### 5.3 退还验证
- 阶段 B 失败场景：生图 API 失败 → 后端应触发 refund
- 验证：阶段 B 前后积分差应为 0（失败不扣）或按 VIP 规则

### 5.4 积分一致性陷阱
- 生成成功但 DB 同步失败：积分**已扣**但数据未持久化 → 这是已知行为（退款逻辑是否覆盖此场景需观察）
- 此场景在 F4（syncSlides 500）验证，记录实际行为

## 6. Bug 覆盖映射原则

### 6.1 全量覆盖
27 个修复点 **每一个都必须有至少一个测试用例覆盖**。映射矩阵见 `specs/bug-coverage-matrix.md`。

### 6.2 覆盖深度
- **行为级验证**：不只看"没报错"，要看具体修复的行为发生了
  - 例：B26（allCompleted 闭包恒 false）→ 验证单页生成后项目 status 变成 `completed`
  - 例：B21（toast 冲突）→ 验证 syncSlides 500 时**不出现**"成功"toast
- **反向验证**：对于"移除某行为"的修复（如移除 invalidateQueries），验证该行为不再发生
  - 例：B10（自动重新生成）→ 验证刷新后**不**触发新的 generate 请求

### 6.3 证据归档
每个测试用例产出：
- 操作步骤日志
- 三方状态快照（UI/DB/Cache）
- 截图
- 通过/失败判定

## 7. 执行依赖排序

```
阶段 0 (准备) → 必须先有项目和基线
    ↓
阶段 A (真实成功) → 必须先有成功产物供后续阶段复用
    ↓
阶段 B (失败 Mock) → 依赖阶段 A 的项目状态，且必须 unroute 后才能进 C
    ↓
阶段 C (状态恢复) → 依赖阶段 B 产生的 error 状态
    ↓
阶段 D (并发竞态) → 依赖阶段 A/C 的产物
    ↓
阶段 E (积分) → 依赖前面所有阶段的扣费记录
    ↓
阶段 F (收尾) → 汇总
```

不可并行、不可乱序的原因：单项目 10 张图预算，且状态递进。

## 8. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| extension 模式 route 拦截时序滞后 | 中 | 高（阶段 B 全失效） | 开场冒烟；回退 fetch monkey-patch |
| 真实生图偶发慢（>90s） | 中 | 中 | 每步 120s 超时 + 单次重试 |
| gpt-image-2 网关临时不可用 | 低 | 高 | 开场 curl 探活，不可用则中止 |
| Query cache 读取失败（React 内部 API 变化） | 低 | 中 | 回退：只对比 UI vs DB 两方 |
| 并发竞态难以稳定复现 | 高 | 中 | D 类场景跑 3 次取多数结果 |
| 积分规则与预期不符 | 中 | 低 | 先查规则基线再断言，不符则记录而非报错 |
| Mock route 残留污染后续 | 中 | 高 | 每阶段强制 unroute + route_list 核对 |
| 测试中断后无法续跑 | 中 | 中 | 每阶段结束保存状态快照，支持从断点恢复 |

## 9. 非目标（明确排除）

- 不修复测试中发现的任何新 bug（另开变更）
- 不做性能基准测试（只验证功能正确性）
- 不做跨浏览器兼容（只 Edge）
- 不做导出功能验证
- 不做 Agent 对话模式验证
- 不修改任何源代码或配置
