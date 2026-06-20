# Bug 覆盖矩阵：27 个修复点 → 测试用例映射

> 本矩阵是"重要场景和之前处理的问题都要覆盖到"的核心证据。每个修复点必须有至少一个测试用例覆盖，否则视为覆盖缺口。

## 修复点全量清单（11 commits → 27 修复点）

### 第一轮（c32717f ~ 5ea550a，10 commits）

| ID | Commit | 修复内容 | 验证类型 |
|----|--------|---------|---------|
| B01 | c32717f | handleRegenerate 反模式（setItems 回调内调 syncSlidesMutation.mutate） | E2E 行为 |
| B02 | c32717f | 6 处空 catch 块补 console.warn/error | 静态/间接 |
| B03 | c32717f | syncWithRetry 即发即弃（无 await） | E2E 行为 |
| B04 | c32717f | context 传递修正 | 静态 |
| B05 | c32717f | 测试补充 | 静态 |
| B06 | c32717f | Prompt 模板去重 | 静态 |
| B07 | dafa862 | 16:9 分辨率对齐（16 通用 + 32 智谱/火山） | E2E 行为 |
| B08 | b462012 | 流式 JSON 大纲截断（28→25 页） | E2E 行为 |
| B09 | e3101a8 | 批量生成后缓存刷新覆盖回写 UI | E2E 行为 |
| B10 | 025e5f0 | 批量生成后缓存刷新导致自动重新生成 | E2E 反向验证 |
| B11 | 77b4136 | 刷新后图片消失（setQueryData 用旧闭包 items） | E2E 行为 |
| B12 | 8649a1d (C1) | syncSlidesMutation.onSuccess 用 setQueryData 替换 invalidateQueries | E2E 反向验证 |
| B13 | 8649a1d (C2) | newSlides 从 setItems 函数式更新器获取最新状态 | E2E 行为 |
| B14 | 8649a1d (H1) | updateProjectMutation 移出 setItems 回调 | E2E 行为 |
| B15 | 8649a1d (H2) | handleRegenerate syncSingleWithRetry 加 await | E2E 行为 |
| B16 | d48afee | allCompleted 用 generatedResults+failureCount 替代闭包 items | E2E 行为 |
| B17 | d48afee | updateProjectMutation.onSettled 移除 invalidateQueries | E2E 反向验证 |
| B18 | 6dae863 | handleSingleGenerate/handleRegenerate 函数式 setItems 取最新 state | E2E 行为 |
| B19 | 6dae863 | updateProjectMutation 移出回调（与 B14 同类，单页/重生成侧） | E2E 行为 |
| B20 | 5ea550a | image API 日志显示实际 baseUrl（消除双重拼接误导） | 静态 |

### 第二轮（b734f2a）

| ID | 修复内容 | 验证类型 |
|----|---------|---------|
| B21 (I1) | DB 同步失败后仍显示"成功"toast → 加 syncSuccess 标记抑制 | E2E 行为 |
| B22 (I2) | Batch 模式 null result 未计入 failureCount → 项目永不到达 completed | E2E 行为 |
| B23 (S1) | handleSingleGenerate 积分查询 catch 丢失 error 上下文 | 静态/间接 |
| B24 (S2) | Retry 固定 1s → 指数回退 1s/2s/4s，最大 3 次 | E2E 行为 |
| B25 | handleRegenerate 重试失败无 toast → 补 showToast | E2E 行为 |
| B26 | single/regenerate allCompleted 恒 false（闭包 items）→ `\|\| i.id === id` | E2E 行为 |
| B27 | single/regenerate slidesToSync 未同步计算 → 对齐 batch | E2E 行为 |

---

## 覆盖矩阵：修复点 → 测试用例

### E2E 行为验证类（21 个修复点）

| 修复点 | 测试用例 | 阶段 | 验证方法 |
|--------|---------|------|---------|
| **B01** | TC-D3 | D | handleRegenerate 不在 setItems 内触发 sync → 验证重新生成后 DB 立即同步（无延迟/无丢失） |
| **B03** | TC-A4, TC-C1 | A/C | syncWithRetry 被 await → 验证重新生成/重试后 DB 一致（之前 fire-and-forget 会丢同步） |
| **B07** | TC-A1 | A | 生成的真实图片尺寸 = 1920x1088（16 对齐），不是 1080 → `browser_evaluate` 读 img naturalWidth/Height |
| **B08** | TC-0A | 0 | 大纲生成 8 页全部出现（不是被截断到 6 页）→ snapshot 数页数 |
| **B09** | TC-A1 | A | 批量生成后 UI 不被缓存刷新覆盖 → 生成后立即查 UI 仍有图 |
| **B10** | TC-A3 | A | 刷新后**不**触发新的 generate 请求 → 监控网络，刷新后 60s 内无 generate-slide-variant 请求 |
| **B11** | TC-A3 | A | 刷新后图片仍在 → 刷新前后 DB.variants 数量一致 + UI 显示图 |
| **B12** | TC-A3 | A | syncSlides 后不触发 refetch → 监控，syncSlides 成功后无 `/api/projects/<id>` GET 请求 |
| **B13** | TC-A1 | A | newSlides 取最新 state → 批量生成多页，所有页 variants 都正确写入（非空） |
| **B14** | TC-A4, TC-A1 | A | updateProjectMutation 在 setItems 外 → 验证项目 status 更新不依赖 setItems 时序 |
| **B15** | TC-A4 | A | handleRegenerate syncSingleWithRetry 被 await → 重新生成后 DB 立即可见 |
| **B16** | TC-A1 | A | allCompleted 用计数 → 批量生成全部成功后项目 status=completed |
| **B17** | TC-A1 | A | updateProject.onSettled 不 invalidate → status 更新后不触发 project refetch |
| **B18** | TC-A2, TC-A4 | A | single/regenerate 函数式 setItems → 单页生成/重新生成不丢失其他页状态 |
| **B19** | TC-A2, TC-A4 | A | 单页/重生成 updateProjectMutation 在 setItems 外 → status 正确更新 |
| **B21** | TC-B2 | B | syncSlides 500 时**不出现**"成功"toast → 只见 error toast |
| **B22** | TC-B3 | B | null result 计入 failureCount → 空响应后 allCompleted 仍能达成（结合 C1 重试） |
| **B24** | TC-B6 | B | 指数回退 → 网络中断时重试间隔约 1s/2s/4s（通过 console 时间戳或网络请求时间戳验证） |
| **B25** | TC-B1 (regenerate 侧) | B | handleRegenerate 重试失败有 toast → 重新生成且 sync 失败时见 error toast |
| **B26** | TC-A2, TC-A4 | A | single/regenerate allCompleted → 单页生成最后一页后项目 status=completed |
| **B27** | TC-A2, TC-A4 | A | single/regenerate slidesToSync 同步计算 → 单页生成后 DB 立即有 variants（非空数组） |

### E2E 反向验证类（3 个修复点，验证"坏行为不再发生"）

| 修复点 | 测试用例 | 阶段 | 验证方法 |
|--------|---------|------|---------|
| **B10** | TC-A3 | A | 刷新后**无**自动 generate 请求（反向：之前会无限循环） |
| **B12** | TC-A3 | A | syncSlides 成功后**无** project refetch（反向：之前 invalidate 触发） |
| **B17** | TC-A1 | A | updateProject 后**无** project refetch（反向：之前 invalidate 触发） |

### 静态/间接验证类（6 个修复点，E2E 无法直接触发）

| 修复点 | 验证方式 | 说明 |
|--------|---------|------|
| **B02** | `browser_console_messages` 抓 console | 6 处 catch 现在有 warn/error → 触发对应场景时 console 有日志（间接验证非空 catch） |
| **B04** | 代码审查已确认 | context 传递是内部逻辑，无外部可观测行为 |
| **B05** | 测试文件已存在 | 单元测试已补充，`npx vitest run` 通过即可 |
| **B06** | Prompt 去重无行为差异 | 纯代码质量，不影响功能 |
| **B20** | `browser_console_messages` 抓日志 | 生图时 console 显示的 baseUrl 不含双重 `/images/generations` |
| **B23** | `browser_console_messages` 抓日志 | 积分查询失败时 console 有 `[handleSingleGenerate] Cost/balance check failed` |

---

## 覆盖度统计

| 类型 | 修复点数 | 覆盖方式 |
|------|---------|---------|
| E2E 行为验证 | 21 | 7 阶段测试用例直接验证 |
| E2E 反向验证 | 3 | 监控"坏行为不发生" |
| 静态/间接 | 6 | console 日志 + 代码审查 + 单元测试 |
| **合计** | **30**（含 3 个反向验证交叉计入） | **27 个修复点 100% 覆盖** |

---

## 高风险修复点（重点加倍验证）

以下修复点是历史上"反复修反复坏"或"修复本身引入过新 bug"的，每个需要**双测试用例**或**多次重试验证稳定性**：

| 修复点 | 风险原因 | 加倍验证 |
|--------|---------|---------|
| B11 刷新丢图 | 修过 3 次才稳定 | TC-A3 跑 2 次（生成后刷新 + 重新生成后刷新） |
| B10 自动重生成 | 修复曾引入缓存覆盖 | TC-A3 监控 60s 无 generate 请求 |
| B16/B26 allCompleted | 闭包陷阱反复出现 | TC-A1（batch）+ TC-A2（single）+ TC-A4（regenerate）三入口都验证 status=completed |
| B21 toast 冲突 | 第二轮新修 | TC-B2 严格断言"成功 toast 不出现" |
| B22 null result | 第二轮新修 | TC-B3 验证失败计数 + 结合 C1 验证 allCompleted 可达成 |
| B12/B17 cache 战争 | setQueryData vs invalidate 反复调整 | TC-A3 全程网络监控 |

---

## 覆盖缺口声明

经核对，**27 个修复点无覆盖缺口**。6 个静态类修复点虽无法纯 E2E 触发，但通过 console 日志间接验证 + 已有单元测试覆盖，不构成验证盲区。

若执行中发现某修复点的预期行为未出现，视为**回归 bug**，记录到测试报告但不在本变更内修复。
