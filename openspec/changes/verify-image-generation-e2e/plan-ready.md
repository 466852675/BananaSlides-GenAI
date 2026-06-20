# 实现计划：verify-image-generation-e2e

## 来源
- 提案：openspec/changes/verify-image-generation-e2e/proposal.md
- 设计：openspec/changes/verify-image-generation-e2e/design.md
- 规格：openspec/changes/verify-image-generation-e2e/specs/bug-coverage-matrix.md
- 规格：openspec/changes/verify-image-generation-e2e/specs/test-cases.md
- 任务：openspec/changes/verify-image-generation-e2e/tasks.md

## 执行约束
- **不改任何代码或配置**（纯验证任务）
- **单项目 ≤10 张真实图**（预算 8-9 张 + 1-2 buffer）
- **沙箱隔离**：新建测试项目，不动现有数据
- **驱动**：playwright MCP `--extension`（连已登录 Edge）
- **严格串行**：Task 1→9，状态递进

## 产出文件
- 测试报告：`test-results/e2e-report-{timestamp}.md`
- 截图：`test-results/snapshots/`（每用例至少 1 张）
- 状态日志：`test-results/state-log-{timestamp}.json`

---

## Task 1: 前置探活与基线记录

**目标：** 确认环境三通（前端/后端/网关），记录测试基线
**依赖：** 无
**图消耗：** 0

### 步骤 1.1：探活前端
- 工具：`browser_navigate` → `http://localhost:1000`
- 验证：页面正常加载（非空白/非报错页）
- 失败处理：若失败 → 提示用户启动前后端服务

### 步骤 1.2：探活后端 + 网关
- 工具：`browser_evaluate` 执行：
  - `fetch('/api/health')` 或 `/api/projects` 确认后端
  - 直接 fetch gpt-image-2 网关（用激活引擎的 image 配置）确认 200 + 真实图片
- 验证：后端 200 + 网关 200
- 失败处理：网关 3 次失败 → 中止，报告"网关不可用"

### 步骤 1.3：记录基线
- 工具：`browser_evaluate` 查询：
  - 初始积分 `balance_before`（`/api/points/balance`）
  - 单次成本 `unit_cost`（`getActionCost('slide_image')`）
- 产出：写入状态日志 `{ balance_before, unit_cost, timestamp }`
- 验证：两个数值都成功获取

---

## Task 2: 创建沙箱项目 + 生成大纲

**目标：** 建立隔离测试环境，验证流式 JSON 不截断
**依赖：** Task 1
**图消耗：** 0

### 步骤 2.1：创建项目
- 工具：`browser_navigate` → 首页；`browser_snapshot` 找创建入口；`browser_click` + `browser_type` 输入标题「自动化测试-{时间戳}」
- 验证：项目创建成功，跳转到工作台或项目页

### 步骤 2.2：生成大纲（验证 B08）
- 工具：输入主题，`browser_click` 触发 AI 大纲生成；`browser_wait_for` 等待大纲完成
- 验证：大纲生成 **8 页**（若 <8 → B08 流式截断回归，记录失败）
- 失败处理：若大纲生成失败 → 检查 reasoning 模型配置，报告问题

### 步骤 2.3：记录项目 ID
- 工具：`browser_evaluate` 从 URL 或全局 state 读 `test_project_id`
- 产出：写入状态日志 `{ test_project_id }`
- 验证：ID 非空

---

## Task 3: 阶段 A - 真实成功路径（消耗 6 图）

**目标：** 验证 15 个修复点 + 三方一致性
**依赖：** Task 2
**图消耗：** 6

### 步骤 3.1：批量生成前 4 页（TC-A1，消耗 4 图）
- 工具：
  - `browser_navigate` → `http://localhost:1000/?project=<test_project_id>`
  - `browser_snapshot` 确认工作台
  - 启动网络监控（记录所有 generate-slide-variant / slides 请求）
  - `browser_click` 批量生成按钮
  - `browser_wait_for` 每页 success（最多 120s/页，共 ~8min）
- 验证：
  - 4 页 status=`success` + variants 非空（B13）
  - DB 与 cache 与 UI 三方一致（`browser_evaluate` 三方查询对比）
  - 真实图片 naturalWidth=1920, naturalHeight=1088（B07）
  - 批量期间 UI 实时出图，无缓存覆盖（B09）
  - syncSlides 后无 project GET refetch（B12 反向）
  - 积分扣除 = 4 × unit_cost
  - console baseUrl 无双重拼接（B20）
- 产出：截图 + 三方状态快照 + 网络请求日志

### 步骤 3.2：单页生成第 5 页（TC-A2，消耗 1 图）
- 工具：`browser_snapshot` 定位第 5 页生成按钮；`browser_click`；`browser_wait_for` success
- 验证：
  - 第 5 页 success + variants 非空（B18）
  - DB 立即有 variants（B27 slidesToSync 同步计算）
  - 前 4 页状态不受影响（B18）
  - 项目 status 仍 `generating`（B26 allCompleted 此时正确为 false）
- 失败处理：若其他页状态变化 → B18 回归

### 步骤 3.3：刷新页面（TC-A3，消耗 0 图）
- 工具：
  - 记录刷新前 DB 状态
  - `browser_evaluate` → `location.reload()` 或 `browser_navigate` 重载
  - `browser_wait_for` 工作台重新加载
  - 启动 60s 网络监控
- 验证：
  - 5 页图片仍在（B11 刷新丢图修复）
  - 60s 内**无** generate-slide-variant 请求（B10 反向）
  - 无 project refetch 风暴（B12/B17）
  - 三方一致
- 产出：60s 网络监控日志（证明无自动重生成）

### 步骤 3.4：重新生成第 1 页（TC-A4，消耗 1 图）
- 工具：`browser_snapshot` 定位第 1 页"重新生成"；`browser_click`；`browser_wait_for` success
- 验证：
  - 第 1 页 variants 更新（新旧不同）（B01 反模式修复）
  - DB 立即同步（B15 await）
  - 其他页不受影响（B18）
  - 项目 status 仍 `generating`（B26）
- 产出：截图 + 三方快照

---

## Task 4: route 拦截冒烟

**目标：** 验证 extension 模式 browser_route 可靠
**依赖：** Task 3
**图消耗：** 0

### 步骤 4.1：注册 route
- 工具：`browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=500
- 验证：`browser_route_list` 确认 route 已注册

### 步骤 4.2：触发验证
- 工具：`browser_click` 触发某 idle 页生成；观察响应
- 验证：返回 500，status 变 error

### 步骤 4.3：清理 + 判定
- 工具：`browser_unroute`（清除）
- 验证：`browser_route_list` 无残留
- **分支：**
  - 拦截生效 → 继续 Task 5
  - 拦截不生效 → 回退方案：`browser_evaluate` 注入 fetch monkey-patch（覆盖 window.fetch 拦截匹配 URL），重新验证；仍不生效 → Task 5 标 blocked，报告限制

---

## Task 5: 阶段 B - 失败与边界（消耗 1 图）

**目标：** 验证失败处理 + toast 冲突 + null result + 指数回退
**依赖：** Task 4
**图消耗：** 1（TC-B2 真实生图但 sync 失败）

### 步骤 5.1：生图 500 + 指数回退（TC-B1，消耗 0）
- 工具：`browser_route` 生图 500；`browser_click` 生成；观察重试；`browser_unroute`
- 验证：
  - status=error + errorMessage（F1）
  - error toast 出现（B25）
  - 重试间隔 1s/2s/4s（通过 console.error 时间戳验证，B24）
  - console 有 Sync failed 日志（B02 间接）
  - 积分未扣（失败不扣费）

### 步骤 5.2：syncSlides 500 + toast 冲突（TC-B2，消耗 1 图）
- 工具：`browser_route` pattern=`**/api/projects/*/slides` status=500；生图不拦（真实）；`browser_click` 重新生成第 6 页；`browser_unroute`
- 验证：
  - **只**出现 error toast（"幻灯片数据保存失败"）（B21 核心）
  - **不**出现"调用 API 服务成功"toast（B21 核心断言）
  - UI 已显示新生图（乐观更新，B18）
  - DB 未被空数组覆盖（数据安全）
  - 项目 status 未变 completed（B21 联动）

### 步骤 5.3：空响应 null result（TC-B3，消耗 0）
- 工具：`browser_route` 生图 200 + body=`{"data":[]}`；`browser_click` 生成；`browser_unroute`
- 验证：
  - 空响应计入 failureCount（B22）
  - 有 error toast
  - （为 C1 铺垫：此页进入 error 状态）

### 步骤 5.4：生图 429（TC-B4，消耗 0）
- 工具：`browser_route` 生图 429；`browser_click` 生成；`browser_unroute`
- 验证：429 被识别为错误，有提示，不卡死

### 步骤 5.5：生图 401（TC-B5，消耗 0）
- 工具：`browser_route` 生图 401 + body=`{"error":{"message":"Invalid token"}}`；`browser_click` 生成；`browser_unroute`
- 验证：
  - 401 被识别为错误，不卡死
  - 不触发 token refresh 无限循环

### 步骤 5.6：网络中断 + 指数回退（TC-B6，消耗 0）
- 工具：`browser_network_state_set` offline；`browser_click` 生成；观察重试 1s/2s/4s；`browser_network_state_set` online
- 验证：
  - 断网触发重试 + 指数回退（B24）
  - 恢复后正常
  - 有 error toast

### 步骤 5.7：清理全部 route（TC-B7）
- 工具：`browser_unroute`（无 pattern 清全部）；`browser_route_list` 核对
- 验证：无残留 route（防污染阶段 C/D）

---

## Task 6: 阶段 C - 状态机恢复（消耗 1 图）

**目标：** 验证 error → success 转换 + allCompleted 达成
**依赖：** Task 5（第 6 页处于 error）
**图消耗：** 1（buffer 用尽）

### 步骤 6.1：确认 error 起点
- 工具：`browser_evaluate` 查第 6 页 status
- 验证：status=`error`（来自阶段 B）

### 步骤 6.2：重新生成成功（真实 API）
- 工具：`browser_click` 第 6 页重新生成；`browser_wait_for` success（120s）
- 验证：
  - error → generating → success 转换
  - DB 立即同步（B3/B15 await）
  - 积分只扣一次（成功才扣）

### 步骤 6.3：验证 allCompleted（若 7/8 页也完成）
- 工具：补齐第 7/8 页（若 idle）→ `browser_evaluate` 查项目 status
- 验证：全部 success → 项目 status=completed（B16/B26 三入口验证）
- 注意：若图预算已用尽（8 张），第 7/8 页可保持 idle，allCompleted 验证降级为"逻辑可达"证明（查代码 + 部分验证）

---

## Task 7: 阶段 D - 并发竞态（消耗 0-1 图）

**目标：** 验证竞态类 bug 不复发
**依赖：** Task 6
**图消耗：** 0-1

### 步骤 7.1：批量生成中刷新（TC-D1，消耗 0）
- 工具：触发批量生成（剩余 idle 页）；进行中 `location.reload()`；60s 监控
- 验证：
  - 不卡 generating（恢复 idle 或保持）
  - 60s 无自动重生成（B10）

### 步骤 7.2：同页快速连续点击（TC-D2，消耗 0-1）
- 工具：`browser_click` 同一页生成按钮 3 次（<1s 间隔）；监控请求数
- 验证：只发 1 次 generate 请求（防抖生效）

### 步骤 7.3：批量进行中点单页生成（TC-D3，消耗 0）
- 工具：触发批量；进行中点某页单页生成
- 验证：无数据竞争（variants 不互相覆盖，B01/B18）

---

## Task 8: 阶段 E - 积分一致性

**目标：** 验证扣费/退还正确
**依赖：** Task 7
**图消耗：** 0

### 步骤 8.1：成功扣费核对（TC-E1）
- 工具：`browser_evaluate` 查 `balance_final`；汇总成功生图次数 N
- 验证：`balance_before - balance_final = N × unit_cost`（VIP 规则下可能为 0）

### 步骤 8.2：失败退还核对（TC-E2）
- 工具：对照阶段 B 各场景前后积分差
- 验证：失败不扣费或正确退还

---

## Task 9: 阶段 F - 收尾 + 报告

**目标：** 汇总验证结果
**依赖：** Task 8
**图消耗：** 0

### 步骤 9.1：项目最终状态（TC-F1）
- 工具：`browser_evaluate` 查项目 status + 各页分布
- 验证：status=completed（若全 success）+ 无僵尸 generating

### 步骤 9.2：console 无报错（TC-F2）
- 工具：`browser_console_messages` 抓全程 console
- 验证：
  - 无未捕获异常
  - 预期 console.error 存在（Sync failed 等，B02/B23 间接）

### 步骤 9.3：三 handler 一致性核对（TC-F3）
- 验证：batch/single/regenerate 模式一致（slidesToSync 同步计算、函数式 setItems、await、allCompleted）

### 步骤 9.4：生成测试报告（TC-F4）
- 产出：`test-results/e2e-report-{timestamp}.md`，含：
  - 27 个修复点通过/失败矩阵
  - 20 个测试用例结果
  - 证据截图索引
  - 积分扣费明细
  - 发现的新 bug 清单（如有）
- 验证：报告完整、结论明确

---

## 执行检查清单（build 前自检）

- [ ] 前后端服务运行中
- [ ] Edge 已登录 admin（playwright MCP extension 已连接）
- [ ] gpt-image-2 网关可达（Task 1 探活）
- [ ] 积分余额充足（≥10 张 × unit_cost）
- [ ] test-results/ 目录可写
- [ ] 无残留 browser_route（Task 4 前确认）

## 中断恢复

每个 Task 结束写入状态日志：
```json
{
  "lastCompletedTask": 5,
  "test_project_id": "...",
  "balance_current": ...,
  "images_consumed": 7,
  "slide_states": [{"id":"...","status":"success","hasVariant":true}, ...],
  "active_routes": []
}
```

恢复时：读取状态日志 → 从 `lastCompletedTask + 1` 继续 → 先 `browser_unroute` 清理 → 继续。

## 图预算总账

| Task | 消耗 | 累计 | buffer 剩余 |
|------|------|------|------------|
| 1-2 | 0 | 0 | 10 |
| 3 | 6 | 6 | 4 |
| 4 | 0 | 6 | 4 |
| 5 | 1 | 7 | 3 |
| 6 | 1 | 8 | 2 |
| 7 | 0-1 | 8-9 | 1-2 |
| 8-9 | 0 | 8-9 | 1-2 |

**总计 8-9 张，在 ≤10 约束内。**
