# 测试用例规格：7 阶段全场景验证

> 每个测试用例包含：前置条件、操作步骤、验证点（含 bug 映射 ID）、预期结果、失败判定。
> Bug ID 对照 `bug-coverage-matrix.md`。

---

## 阶段 0：准备

### TC-0A：创建测试项目并生成 8 页大纲

**前置条件：**
- Edge 已登录 admin（playwright MCP extension 模式）
- 前后端服务运行中（localhost:1000 / 1111）
- gpt-image-2 网关可用（开场 curl 探活）

**操作步骤：**
1. `browser_navigate` → `http://localhost:1000`
2. `browser_snapshot` 确认在首页/创作室
3. 通过创作室 UI 创建新项目，标题「自动化测试-{时间戳}」
4. 输入主题，触发 AI 大纲生成（流式）
5. 等待大纲生成完成，确认页数
6. `browser_evaluate` → 记录 `test_project_id`、初始积分 `balance_before`、单次成本 `unit_cost = getActionCost('slide_image')`

**验证点：**
- ✅ 大纲生成 **8 页**（不是被截断的 6/7 页）→ **B08 流式 JSON 截断修复**
- ✅ 项目创建成功，获得 `test_project_id`
- ✅ 积分基线记录成功

**失败判定：**
- ❌ 大纲页数 < 8（B08 回归）
- ❌ 项目创建失败
- ❌ 积分查询失败

**图消耗：** 0（大纲生成不生图）

---

## 阶段 A：真实成功路径（消耗 6 张真实图）

### TC-A1：批量生成前 4 页（核心场景）

**前置条件：** TC-0A 完成，项目有 8 页 idle 大纲

**操作步骤：**
1. `browser_navigate` → `http://localhost:1000/?project=<test_project_id>`
2. `browser_snapshot` 进入工作台
3. 监控网络：开始记录所有 `/api/ai/generate-slide-variant` 和 `/api/projects/*/slides` 请求
4. `browser_click` 触发"批量生成图片"按钮
5. 等待前 4 页生成完成（每页最多 120s）
6. `browser_evaluate` 查 DB：`fetch('/api/projects/<id>')` 获取 items
7. `browser_evaluate` 查 cache：`queryClient.getQueryData(['project', id])`
8. `browser_evaluate` 查 UI 显示的图片 naturalWidth/Height
9. 查积分 `balance_after_A1`

**验证点：**
- ✅ 4 页 status=`success`，variants 非空 → **B13 newSlides 取最新 state**
- ✅ DB 与 cache 与 UI 三方一致 → **数据一致性**
- ✅ 真实图片尺寸 = 1920×1088（16 对齐）→ **B07 分辨率对齐**
- ✅ 批量生成期间 UI 不被缓存刷新覆盖（图实时出现）→ **B09**
- ✅ syncSlides 成功后**无** `/api/projects/<id>` GET refetch → **B12 反向验证**
- ✅ 项目 status 仍是 `generating`（未全部完成）→ **B14/B16 allCompleted 逻辑**
- ✅ 积分扣除 = 4 × unit_cost → **积分一致性**
- ✅ console 显示的 baseUrl 不含双重 `/images/generations` → **B20**

**失败判定：**
- ❌ 任何页 variants 为空（B13 回归）
- ❌ 三方不一致
- ❌ 图片尺寸 = 1920×1080（B07 回归，gpt-image-2 会拒绝）
- ❌ syncSlides 后出现 project refetch（B12 回归）
- ❌ 积分扣除 ≠ 4 × unit_cost

**图消耗：** 4

---

### TC-A2：单页生成第 5 页（handleSingleGenerate）

**前置条件：** TC-A1 完成，第 5 页仍为 idle

**操作步骤：**
1. `browser_snapshot` 定位第 5 页的"生成"按钮
2. `browser_click` 触发单页生成
3. 等待完成（最多 120s）
4. 三方状态检查（UI/DB/Cache）
5. 查项目 status

**验证点：**
- ✅ 第 5 页 status=`success`，variants 非空 → **B18 函数式 setItems**
- ✅ DB 立即有 variants（同步计算 slidesToSync）→ **B27**
- ✅ 其他 4 页状态不受影响（不丢失/不重置）→ **B18**
- ✅ handleSingleGenerate 积分查询若有失败，console 有日志 → **B23 间接验证**
- ✅ 项目 status 仍是 `generating`（第 6/7/8 页未完成）→ **B26 allCompleted 此时为 false（正确）**

**失败判定：**
- ❌ 第 5 页生成后其他页状态变化（B18 回归）
- ❌ DB 无 variants（B27 回归）
- ❌ 项目 status 错误变 completed（B26 闭包问题导致提前 completed）

**图消耗：** 1

---

### TC-A3：刷新页面（历史核心 bug 集中点）

**前置条件：** TC-A2 完成，5 页 success

**操作步骤：**
1. 记录刷新前 DB 状态（5 页 success + variants）
2. `browser_navigate` 重新加载 `?project=<id>`（或 `browser_evaluate` → `location.reload()`）
3. 等待工作台重新加载
4. 启动 60s 网络监控窗口
5. 60s 内观察：是否有 `/api/ai/generate-slide-variant` 请求
6. 三方状态检查

**验证点：**
- ✅ 刷新后 5 页图片仍在（UI 显示 + DB 有 variants）→ **B11 刷新丢图修复**
- ✅ 刷新后**无** generate-slide-variant 请求（60s 监控）→ **B10 自动重生成修复（反向）**
- ✅ 刷新后**无** 异常 project refetch 风暴 → **B12/B17 cache 战争修复**
- ✅ 三方一致

**失败判定：**
- ❌ 刷新后图片消失（B11 回归）
- ❌ 刷新后触发新 generate 请求（B10 回归）
- ❌ 出现 refetch 循环（B12/B17 回归）

**图消耗：** 0

---

### TC-A4：重新生成第 1 页（handleRegenerate）

**前置条件：** TC-A3 完成，第 1 页已 success

**操作步骤：**
1. `browser_snapshot` 定位第 1 页"重新生成"按钮
2. `browser_click` 触发重新生成
3. 等待完成（最多 120s）
4. 验证旧图被新图替换（variants 变化）
5. 三方状态检查
6. 查项目 status

**验证点：**
- ✅ 第 1 页重新生成成功，variants 更新（新旧不同）→ **B01 反模式修复**
- ✅ DB 立即同步（syncSingleWithRetry 被 await）→ **B15**
- ✅ updateProjectMutation 在 setItems 外执行 → **B14/B19**
- ✅ 其他页状态不受影响 → **B18**
- ✅ 项目 status 仍 `generating`（6/7/8 未完成）→ **B26**

**失败判定：**
- ❌ 重新生成后 DB 未同步（B01/B15 回归）
- ❌ 重新生成后其他页状态丢失（B18 回归）

**图消耗：** 1

---

## 阶段 B：失败与边界（browser_route Mock，0 张图）

### TC-B0：route 拦截冒烟（前置验证）

**目的：** 验证 extension 模式 `browser_route` 拦截可靠，才继续 B1-B6

**操作步骤：**
1. `browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=500
2. `browser_route_list` 确认 route 已注册
3. `browser_click` 触发第 6 页单页生成
4. 观察是否返回 500 + status 变 error
5. `browser_unroute` 清除

**验证点：**
- ✅ 拦截生效（status=error 出现）→ route 机制可靠
- ✅ unroute 后恢复正常

**失败处理：**
- 若拦截不生效 → 回退方案：`browser_evaluate` 注入 fetch monkey-patch 拦截

---

### TC-B1：生图 500

**前置条件：** TC-B0 通过

**操作步骤：**
1. `browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=500, body=`{"error":"Internal Server Error"}`
2. `browser_click` 触发第 6 页生成
3. 等待处理（重试 3 次：1s/2s/4s）
4. 观察 status 变化、toast、console
5. `browser_unroute`

**验证点：**
- ✅ 第 6 页 status=`error`，有 errorMessage → **F1 失败处理**
- ✅ 出现 error toast（"调用 XX API 失败"）→ **B25 toast 补全（regenerate 侧同理）**
- ✅ 重试间隔约 1s/2s/4s（通过 console.error 时间戳验证）→ **B24 指数回退**
- ✅ console 有 `[handleGenerateBatch] Sync failed` 或类似日志 → **B02 间接验证（非空 catch）**
- ✅ 积分未被扣除（失败不扣费）→ **积分退还**

**失败判定：**
- ❌ 无重试或重试间隔固定 1s（B24 回归）
- ❌ 无 error toast（B25 回归）
- ❌ 失败仍扣积分（积分退还失败）

**图消耗：** 0

---

### TC-B2：syncSlides 500（验证 I1 toast 冲突）

**前置条件：** 第 6 页已 error，准备重新让它成功但 sync 失败

**操作步骤：**
1. `browser_route` → pattern=`**/api/projects/*/slides`, status=500
2. （生图 API 不拦，用真实）触发第 6 页重新生成
3. 生图成功（真实），但 syncSlides 返回 500
4. 观察 toast：是否出现"成功"toast + "保存失败"toast 冲突
5. 三方状态：UI 已显示图（乐观更新），DB 是否未变
6. `browser_unroute`

**验证点：**
- ✅ syncSlides 500 时**只**出现 error toast（"幻灯片数据保存失败"）→ **B21 toast 冲突修复**
- ✅ **不**出现"调用 API 服务成功"toast → **B21 核心断言**
- ✅ UI 已显示新生图（setItems 乐观更新生效）→ **B18**
- ✅ DB 未被空数组覆盖（syncSlides 空数组保护）→ **数据安全**
- ✅ 项目 status 未变 completed（syncFailed 时抑制 updateProject）→ **B21 联动**

**失败判定：**
- ❌ 同时出现成功 + 失败 toast（B21 回归）
- ❌ DB 被空数组覆盖（历史严重 bug 回归）

**图消耗：** 1（真实生图，sync 失败）— 用 buffer

---

### TC-B3：空响应（验证 I2 null result 计数）

**前置条件：** TC-B2 完成，第 6 页状态待定

**操作步骤：**
1. `browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=200, body=`{"data":[]}`, contentType=`application/json`
2. `browser_click` 触发第 6 页生成
3. 观察处理：空响应应被当作失败
4. `browser_unroute`

**验证点：**
- ✅ 空响应计入 failureCount（status=error 或失败计数 +1）→ **B22 null result 修复**
- ✅ 结合后续 C1 重试，allCompleted 仍能正确达成 → **B22 联动**
- ✅ 有 error toast

**失败判定：**
- ❌ 空响应被静默忽略（B22 回归）→ allCompleted 永远无法达成

**图消耗：** 0

---

### TC-B4：生图 429（限流）

**操作步骤：**
1. `browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=429, body=`{"error":"rate limited"}`
2. 触发生成
3. 观察限流处理
4. `browser_unroute`

**验证点：**
- ✅ 429 被正确识别为错误（status=error）
- ✅ 有合理提示（限流相关）

**失败判定：** ❌ 429 导致未处理异常或卡死

**图消耗：** 0

---

### TC-B5：生图 401（token 失效）

**操作步骤：**
1. `browser_route` → pattern=`**/api/ai/generate-slide-variant`, status=401, body=`{"error":{"message":"Invalid token"}}`
2. 触发生成
3. 观察处理
4. `browser_unroute`

**验证点：**
- ✅ 401 被识别为错误，不卡死
- ✅ 有错误提示
- ✅ 不触发 token 自动刷新循环（401 拦截不应触发前端 refresh）

**失败判定：** ❌ 401 导致无限刷新 token 循环

**图消耗：** 0

---

### TC-B6：网络中断（全局断网 + 指数回退）

**操作步骤：**
1. `browser_network_state_set` → state=`offline`
2. 触发生成
3. 观察重试（应 1s/2s/4s 后放弃）
4. `browser_network_state_set` → state=`online` 恢复
5. 验证恢复后可正常生图

**验证点：**
- ✅ 断网时请求失败，触发重试 → **B24 指数回退**
- ✅ 重试间隔 1s/2s/4s（通过请求时间戳验证）
- ✅ 恢复网络后正常工作
- ✅ 有 error toast

**失败判定：**
- ❌ 断网无重试或重试无回退（B24 回归）
- ❌ 恢复网络后仍异常

**图消耗：** 0

---

### TC-B7：清理全部 route

**操作步骤：**
1. `browser_unroute`（无 pattern，清除全部）
2. `browser_route_list` 确认无残留 route

**验证点：**
- ✅ 无残留 route → 阶段 C/D 不受污染

---

## 阶段 C：状态机恢复（消耗 1 张真实图）

### TC-C1：error → success 重试成功

**前置条件：** 第 6 页因 B1/B3 处于 error 状态

**操作步骤：**
1. 确认第 6 页 status=`error`（来自阶段 B）
2. `browser_click` 触发第 6 页重新生成（无 route，真实 API）
3. 等待成功（最多 120s）
4. 三方状态检查
5. 查项目 status

**验证点：**
- ✅ error → generating → success 转换正确 → **状态机路径**
- ✅ syncWithRetry 被 await（B3）→ DB 立即同步
- ✅ 第 6 页 success 后，若 7/8 页也完成 → 项目 status=completed → **B16/B26 allCompleted**
- ✅ 重试只扣一次积分（成功才扣）

**失败判定：**
- ❌ error 状态无法恢复（状态机卡死）
- ❌ allCompleted 无法达成（B22 导致的计数问题）

**图消耗：** 1（buffer 用尽）

---

## 阶段 D：并发竞态（0 张图，基于已有产物）

### TC-D1：批量生成进行中刷新

**前置条件：** 项目中有 idle 页（7/8 页）

**操作步骤：**
1. 触发批量生成（剩余 idle 页）
2. 生成**进行中**（status=generating）时立即 `location.reload()`
3. 等待重新加载
4. 观察：generating 页是否恢复为 idle/error（不卡在 generating）
5. 60s 监控无自动重生成

**验证点：**
- ✅ 刷新后不卡在 `generating` 状态（恢复为 idle 或保持上次状态）→ **中断恢复**
- ✅ 刷新后无自动重生成请求 → **B10**

**失败判定：**
- ❌ 永久卡 generating（历史 bug）
- ❌ 刷新后自动重生成（B10 回归）

**图消耗：** 0（刷新打断了生成）

---

### TC-D2：同页快速连续点击（防抖）

**操作步骤：**
1. 定位某 idle 页生成按钮
2. `browser_click` 连续快速 3 次（<1s 内）
3. 观察请求数

**验证点：**
- ✅ 只发 1 次 generate 请求（防抖/按钮禁用生效）→ **并发保护**
- ✅ 不产生重复扣费

**失败判定：**
- ❌ 发 3 次请求 + 扣 3 次费（防抖缺失）

**图消耗：** 0 或 1（取决于防抖实现）

---

### TC-D3：批量进行中点单页生成

**操作步骤：**
1. 触发批量生成
2. 进行中时点某页单页生成
3. 观察是否冲突/数据混乱

**验证点：**
- ✅ 无数据竞争（variants 不被互相覆盖）→ **B01/B18 并发安全**
- ✅ 无异常报错

**失败判定：**
- ❌ 数据混乱或报错

**图消耗：** 0（被打断）

---

## 阶段 E：积分一致性

### TC-E1：成功路径扣费核对

**操作步骤：**
1. 汇总阶段 A/C 真实成功生图次数 N（预期 6+1=7 次）
2. 查当前积分 `balance_final`
3. 计算 `balance_before - balance_final`
4. 对照 `N × unit_cost`

**验证点：**
- ✅ 实际扣除 = N × unit_cost（VIP 规则下可能为 0）→ **积分一致性**

**失败判定：**
- ❌ 扣费次数 ≠ 成功次数
- ❌ 单价不符

---

### TC-E2：失败路径退还核对

**操作步骤：**
1. 阶段 B 各失败场景前后记录积分
2. 对照：失败应不扣费或正确退还

**验证点：**
- ✅ 生图失败不扣费 → **积分退还**
- ✅ syncSlides 失败（生图已成功）记录实际行为（是否退还是已知行为观察点）

**失败判定：**
- ❌ 失败仍扣费且未退

---

## 阶段 F：收尾

### TC-F1：项目最终状态

**操作步骤：**
1. 查项目 status（应 = completed，若所有页 success）
2. 查所有页 status 分布

**验证点：**
- ✅ 若全部 success → status=completed → **B16/B26 allCompleted 三入口验证**
- ✅ 页面状态分布合理（无僵尸 generating）

---

### TC-F2：console 无报错

**操作步骤：**
1. `browser_console_messages` 抓全程 console
2. 过滤 error 级别

**验证点：**
- ✅ 无未捕获异常
- ✅ 预期的 console.error（如 Sync failed）存在 → **B02/B23 间接验证**

---

### TC-F3：三 handler 一致性核对

**验证点：**
- ✅ batch / single / regenerate 三个入口的行为模式一致（slidesToSync 同步计算、函数式 setItems、syncWithRetry await、allCompleted 逻辑）

---

### TC-F4：报告生成

**产出：**
- 通过/失败矩阵（对照 bug-coverage-matrix.md）
- 每个测试用例的证据截图
- 三方状态快照
- 积分扣费明细
- 发现的新 bug 清单（如有）

---

## 图消耗汇总

| 阶段 | 用例 | 图数 |
|------|------|------|
| 0 | TC-0A | 0 |
| A | TC-A1 (4) + TC-A2 (1) + TC-A4 (1) | 6 |
| B | TC-B2 (1, buffer) | 1 |
| C | TC-C1 (1, buffer) | 1 |
| D | TC-D1/D2/D3 | 0-1 |
| E/F | — | 0 |
| **合计** | | **8-9**（≤10 约束内） |

剩余 1-2 张 buffer 应对重跑/意外。
