# 任务清单：图像生成全场景 E2E 验证

> 按执行依赖排序（非功能模块排序）。每个任务引用 `specs/test-cases.md` 的用例 ID。
> 约束：单项目 ≤10 张真实图，全程不改配置/不动现有数据。

---

## Task 1：前置探活与基线记录

**目标：** 确认环境可用，记录测试基线
**对应用例：** TC-0A（部分）
**步骤：**
1. `browser_navigate` 打开 `http://localhost:1000`，确认前端正常
2. `browser_evaluate` 探活后端 + gpt-image-2 网关（fetch 生图 API 返回 200）
3. `browser_evaluate` 查初始积分 `balance_before` + 单次成本 `unit_cost`
4. 记录基线到测试报告

**验证：** 前后端 + 网关三通，基线数值已记录
**图消耗：** 0

---

## Task 2：创建沙箱测试项目 + 生成大纲

**目标：** 建立隔离测试环境
**对应用例：** TC-0A
**步骤：**
1. 创作室创建项目「自动化测试-{时间戳}」
2. 输入主题触发 AI 大纲生成（流式）
3. 等待完成，确认页数
4. `browser_evaluate` 记录 `test_project_id`

**验证：**
- 大纲生成 **8 页**（B08 流式截断修复验证）
- 项目创建成功

**图消耗：** 0
**依赖：** Task 1

---

## Task 3：阶段 A - 真实成功路径（消耗 6 张）

**目标：** 验证成功路径 + 15 个修复点
**对应用例：** TC-A1, TC-A2, TC-A3, TC-A4
**步骤：**
1. **TC-A1**：批量生成前 4 页 → 三方一致性 + 尺寸 1920×1088 + 无 refetch + 扣费 4×unit_cost
2. **TC-A2**：单页生成第 5 页 → handleSingleGenerate 不影响他页
3. **TC-A3**：刷新页面 → 图片不消失 + 60s 无自动重生成 + 无 refetch 风暴
4. **TC-A4**：重新生成第 1 页 → handleRegenerate DB 立即同步 + 旧图替换

**验证修复点：** B07, B08, B09, B10, B11, B12, B13, B14, B15, B16, B17, B18, B19, B20, B23(间接), B26, B27
**验证：** 见 test-cases.md 各用例验证点
**图消耗：** 6
**依赖：** Task 2

---

## Task 4：阶段 B - route 拦截冒烟

**目标：** 验证 extension 模式 `browser_route` 可靠
**对应用例：** TC-B0
**步骤：**
1. `browser_route` 拦生图 500
2. 触发一次生图，确认 status=error
3. `browser_unroute` 恢复

**验证：** 拦截生效（若失败 → 回退 fetch monkey-patch 方案）
**图消耗：** 0
**依赖：** Task 3

---

## Task 5：阶段 B - 失败与边界（0 张图）

**目标：** 验证失败处理 + toast 冲突 + null result + 指数回退
**对应用例：** TC-B1, TC-B2, TC-B3, TC-B4, TC-B5, TC-B6, TC-B7
**步骤：**
1. **TC-B1**：生图 500 → error toast + 重试 1s/2s/4s + 不扣费
2. **TC-B2**：syncSlides 500 → **不出现成功 toast**（B21 核心）
3. **TC-B3**：空响应 `{"data":[]}` → 计入 failureCount（B22）
4. **TC-B4**：生图 429 → 限流处理
5. **TC-B5**：生图 401 → 不卡死 + 无 refresh 循环
6. **TC-B6**：全局断网 → 指数回退重试 + 恢复后正常
7. **TC-B7**：`browser_unroute` 清理全部 + route_list 核对无残留

**验证修复点：** B02(间接), B21, B22, B24, B25
**图消耗：** 1（TC-B2 真实生图但 sync 失败，用 buffer）
**依赖：** Task 4

---

## Task 6：阶段 C - 状态机恢复（消耗 1 张）

**目标：** 验证 error → success 转换 + allCompleted 最终达成
**对应用例：** TC-C1
**步骤：**
1. 第 6 页（阶段 B 后 error）重新生成（真实 API）
2. 验证 error → generating → success
3. 验证 DB 立即同步（B3/B15 await）
4. 若 7/8 页也完成 → 验证项目 status=completed（B16/B26）

**验证修复点：** B03, B15, B16, B22(联动), B26
**图消耗：** 1（buffer 用尽）
**依赖：** Task 5

---

## Task 7：阶段 D - 并发竞态（0 张）

**目标：** 验证刚修的竞态类 bug 不复发
**对应用例：** TC-D1, TC-D2, TC-D3
**步骤：**
1. **TC-D1**：批量生成中刷新 → 不卡 generating + 60s 无自动重生成
2. **TC-D2**：同页快速连续点击 3 次 → 只发 1 次请求（防抖）
3. **TC-D3**：批量进行中点单页生成 → 无数据竞争

**验证修复点：** B01, B10, B18
**图消耗：** 0-1
**依赖：** Task 6

---

## Task 8：阶段 E - 积分一致性

**目标：** 验证扣费/退还正确
**对应用例：** TC-E1, TC-E2
**步骤：**
1. **TC-E1**：汇总成功生图次数 N，对照 `balance_before - balance_final = N × unit_cost`
2. **TC-E2**：阶段 B 失败场景前后积分差应为 0（失败不扣）

**验证：** 积分一致性
**图消耗：** 0
**依赖：** Task 7

---

## Task 9：阶段 F - 收尾验证 + 报告

**目标：** 汇总验证结果
**对应用例：** TC-F1, TC-F2, TC-F3, TC-F4
**步骤：**
1. **TC-F1**：项目 status = completed + 无僵尸 generating
2. **TC-F2**：`browser_console_messages` 无未捕获异常
3. **TC-F3**：三 handler 行为一致性核对
4. **TC-F4**：生成测试报告（通过/失败矩阵 + 截图 + bug 清单）

**验证修复点：** B16, B26（allCompleted 三入口）
**图消耗：** 0
**依赖：** Task 8

---

## 任务依赖图

```
Task 1 (探活)
  ↓
Task 2 (建项目)
  ↓
Task 3 (阶段 A 真实成功) ← 消耗 6 图
  ↓
Task 4 (route 冒烟)
  ↓
Task 5 (阶段 B 失败 Mock) ← 消耗 1 图
  ↓
Task 6 (阶段 C 状态恢复) ← 消耗 1 图
  ↓
Task 7 (阶段 D 并发)
  ↓
Task 8 (阶段 E 积分)
  ↓
Task 9 (阶段 F 收尾)
```

**严格串行，不可并行。** 原因：单项目状态递进 + 图预算约束。

---

## 图预算核对

| Task | 图消耗 | 累计 |
|------|--------|------|
| Task 1-2 | 0 | 0 |
| Task 3 | 6 | 6 |
| Task 4 | 0 | 6 |
| Task 5 | 1 | 7 |
| Task 6 | 1 | 8 |
| Task 7 | 0-1 | 8-9 |
| Task 8-9 | 0 | 8-9 |

**总计 8-9 张，≤10 约束内，留 1-2 张 buffer。**

---

## 中断恢复策略

每个 Task 结束保存：
- 当前 `test_project_id`
- 各页当前状态快照（status + variants 有无）
- 当前积分
- 已消耗图数
- 当前 route 状态（route_list）

中断后从断点 Task 继续，跳过已完成的 Task。若 route 有残留，先 `browser_unroute` 清理。

---

## 异常处理

| 异常 | 处理 |
|------|------|
| gpt-image-2 网关临时不可用 | 等待 60s 重试，3 次失败则中止并报告 |
| route 拦截不生效 | 回退 fetch monkey-patch；仍不生效则该 Task 标 blocked |
| 测试项目被意外修改 | 从最近快照恢复或重建项目（消耗 buffer 图） |
| 发现新 bug | 记录到报告，不在本变更内修复 |
