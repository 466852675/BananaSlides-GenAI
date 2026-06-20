# 变更提案：图像生成全场景 E2E 验证（浏览器自动化）

## 背景与动机

YH-AI 智能PPT创作平台近期完成了一轮密集的图像生成链路 bug 修复（17 个 commit），涵盖 React 状态竞态、React Query 缓存管理、流式 JSON 截断、分辨率对齐、DB 回写竞态、toast 冲突、allCompleted 闭包陷阱、指数回退重试等。这些修复目前只通过了 MOCK 模式的 Playwright 验证和真实 API 的 curl 冒烟测试，**尚未在真实用户场景下做端到端的全场景覆盖验证**。

当前激活的生图引擎「朗新科技+GPT」（gpt-image-2，`http://154.9.24.185:3100/v1`）已验证可用（HTTP 200 + 真实图片）。需要用浏览器自动化在真实用户操作流程中，系统性地验证所有修复点 + 6 类风险维度的正确性，建立一次性的全场景验证报告。

## 目标

1. **回归验证** — 证明 17 个 bug 修复后无回归，原问题场景现在正常
2. **风险维度全覆盖** — 状态机 / 并发竞态 / 数据一致性 / 中断恢复 / 失败路径 / 积分一致性 6 类全部测到
3. **真实链路验证** — 真实 gpt-image-2 生图 + 真实 DB 持久化 + 真实积分扣费
4. **不污染生产** — 专设沙箱测试项目，不动现有项目数据、不改任何后端/引擎/商业化配置

## 范围

### 包含

- 三个生图入口：`handleGenerateBatch`（批量）/ `handleSingleGenerate`（单页）/ `handleRegenerate`（重新生成）
- 6 类风险维度（详见"测试维度"）
- 真实 gpt-image-2 生图 + 失败场景 Mock
- 积分扣费/退还一致性

### 不包含

- 导出功能（PPTX/PDF/ZIP）的验证（独立流程，非本次范围）
- Agent 对话模式的验证
- 文档上传/MinerU 解析的验证
- 视觉回归测试（像素级截图对比）
- 后端单元测试（已有 Bun 测试覆盖）
- 修改任何代码或配置

## 约束

| 约束 | 说明 |
|------|------|
| **单项目** | 在一个新建的沙箱测试项目内完成所有场景 |
| **真实图预算 ≤10 张** | 成功路径用真实图，失败/竞态用 Mock，总数不超过 10 张 |
| **不改配置** | 不动 AI 引擎配置、商业化配置、环境变量、DB schema |
| **不改现有数据** | 不操作现有项目，测试项目独立 |
| **驱动方式** | playwright MCP（`--extension` 连已登录 Edge），不写独立脚本 |

## 测试维度（6 类风险）

### P0-1 状态机转换（6 条路径）
- `idle → generating → success`（A1 批量生成）
- `idle → generating → error`（B1 生图 500）
- `error → generating → error`（B3 空响应）
- `error → generating → success`（C1 重试成功）
- `success → generating → success`（A4 重新生成）
- `generating → [刷新] → 恢复`（A3/D1 中断恢复，历史高发 bug）

### P0-2 并发竞态（刚修的 bug 重灾区）
- D1 批量生成进行中刷新页面
- D2 同一页快速连续点击（防抖）
- D3 批量进行中点单页生成（并发保护）

### P0-3 数据三方一致性
每个关键操作后验证三方对齐：
- React `items` state（UI 显示）
- DB `Slide` 记录（API 查询）
- React Query `['project', id]` cache（内部一致性）

### P1-1 生成中刷新/中断恢复
- A3 批量生成完成后刷新（图片不消失，历史核心 bug）
- D1 批量生成进行中刷新（不卡 generating）

### P1-2 失败路径扩展
- F1 生图 500 → status→error + 可重试 toast
- F2 生图 401 → token 失效处理
- F3 网络中断（`browser_network_state_set: offline`）→ 重试 + 指数回退
- F4 syncSlides 500 → **验证 I1：不显示"成功"toast**（toast 冲突修复）
- F5 空响应 `{"data":[]}` → **验证 I2：null result 计入失败**（计数遗漏修复）
- F6 生图 429 → 限流处理

### P2 积分一致性
- E1 真实生图次数 vs 积分实际扣除（对照验证）
- E2 失败场景积分正确退还
- E3 失败不扣费确认

## 技术方案

### 驱动
- playwright MCP `--extension --browser msedge`（连已登录 Edge）
- 登录态天然存在（admin 已登录），无需 token 注入

### 失败场景 Mock
| 场景 | 工具 | 参数 |
|------|------|------|
| 生图 500/401/429 | `browser_route` | `pattern=**/api/ai/generate-slide-variant`, `status=500/401/429` |
| 空响应（null result） | `browser_route` | `pattern=**/generate-slide-variant`, `status=200`, `body={"data":[]}` |
| DB 同步失败 | `browser_route` | `pattern=**/api/projects/*/slides`, `status=500` |
| 全局断网 | `browser_network_state_set` | `state=offline` |
| 恢复 | `browser_unroute` | 按 pattern 移除拦截 |

### 数据一致性检查
通过 `browser_evaluate` 执行 fetch 调 `/api/projects/{id}` 查 DB，对照 UI DOM 和 cache。

## 执行流（7 阶段，单项目顺序进行）

### 阶段 0：准备
- 新建项目「自动化测试-{时间戳}」，生成 8 页大纲（不生图）
- 记录初始积分（`/api/points/balance`）
- 记录初始项目状态

### 阶段 A：真实成功路径（消耗 6 张真实图）
| 步骤 | 操作 | 验证点 |
|------|------|--------|
| A1 | 批量生成前 4 页 | 真实出图 + DB 回写 + 三方一致 + 状态机 idle→success + 积分扣除 |
| A2 | 单页生成第 5 页 | handleSingleGenerate + allCompleted 闭包修复 |
| A3 | 刷新页面 | S2 图片不消失（历史核心 bug）+ 三方一致 |
| A4 | 重新生成第 1 页 | handleRegenerate + 旧图替换 + 状态机 success→success |

### 阶段 B：失败与边界（browser_route Mock，0 张图）
| 步骤 | 操作 | 验证点 |
|------|------|--------|
| B1 | route 生图 500 | status→error + error toast |
| B2 | route syncSlides 500 | **I1：不显示"成功"toast** |
| B3 | route 空响应 | **I2：null result 计入失败** + allCompleted 正确 |
| B4 | route 生图 429 | 限流处理 |
| B5 | route 生图 401 | token 失效不卡死 |
| B6 | network_state offline | 重试 + 指数回退 |
| B7 | unroute 恢复 | 拦截器正确清除 |

### 阶段 C：状态机恢复（消耗 1 张真实图）
- C1 第 6 页：route 生图 500 → status=error → unroute → 重新生成成功
- 验证 `error → generating → success` 转换 + index backoff retry

### 阶段 D：并发竞态（0 张图，基于已有产物）
- D1 批量生成进行中刷新 → 验证不卡 generating + 中断恢复
- D2 同页快速连续点击 3 次 → 验证防抖/不重复请求
- D3 批量进行中点单页生成 → 验证并发保护 + 数据不混乱

### 阶段 E：积分一致性
- E1 对照阶段 A 生图次数（6 次）vs 积分实际扣除
- E2 阶段 B 失败场景后查积分 → 验证正确退还
- E3 阶段 C 重试成功只扣一次

### 阶段 F：收尾验证
- F1 项目 status = completed（allCompleted 正确触发）
- F2 浏览器 console 无报错（全程监控）
- F3 三个 handler 行为一致性核对表
- F4 截图归档 + 测试报告生成

## 图预算分配（总 8 张 + 2 buffer）

| 用途 | 图数 | 阶段 |
|------|------|------|
| 批量生成前 4 页 | 4 | A1 |
| 单页生成第 5 页 | 1 | A2 |
| 重新生成第 1 页 | 1 | A4 |
| error→success 重试 | 1 | C1 |
| buffer | 1 | 应对意外/重跑 |

## 验收标准

- ✅ 所有 P0 维度场景通过（状态机 6 路径 + 并发竞态 + 数据一致性）
- ✅ 17 个已修 bug 对应场景全部验证通过，无回归
- ✅ 积分扣费/退还逻辑正确
- ✅ 测试报告产出（通过/失败矩阵 + 证据截图）
- ⚠️ 失败场景的 Mock 拦截时序确认可靠（extension 模式实测）
- ⚠️ 若发现新 bug，记录但不在此变更内修复（另开变更）

## 风险与对策

| 风险 | 对策 |
|------|------|
| extension 模式 route 拦截时序滞后 | 阶段 B 先做单点冒烟，确认拦截可靠再批量 |
| 真实生图偶发慢/超时 | 每步设 90s 超时 + 重试 |
| 拦截器残留影响后续阶段 | 每阶段结束 `browser_unroute` 清理 |
| 并发竞态难以稳定复现 | D 类场景多次重试取一致性结果 |
| 积分扣费规则不确定 | E1 执行前先查 `getActionCost('slide_image')` 基线 |

## 关联

- 修复链：commit `c32717f` → `b734f2a`（17 个 commit）
- 激活引擎：`朗新科技+GPT`（id `7bd15563`，gpt-image-2）
- 现有验证脚本：`scripts/playwright-verify.mjs`（MOCK）、`scripts/playwright-real-verify.mjs`（真实）
