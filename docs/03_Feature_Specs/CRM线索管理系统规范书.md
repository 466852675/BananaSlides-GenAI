# 🎯 CRM线索管理系统规范书 (Lead Management Spec)

> **文档版本**: v1.0
> **技术对齐**: `server/src/services/lead.service.ts`, `src/components/admin/LeadManagement.tsx`
> **核心机制**: 线索收集 -> 分配 -> 跟进 -> 转化全流程

---

## 1. 系统概述

CRM线索管理系统支持从多渠道收集潜在客户线索，通过智能分配和跟进管理，实现线索的高效转化。

### 1.1 设计目标

- **多渠道收集**: 支持表单、API、批量导入等多种收集方式
- **智能分配**: 支持手动分配和自动分配规则
- **全程跟进**: 记录完整的跟进历史
- **转化追踪**: 追踪线索转化率和价值

### 1.2 核心特性

| 特性 | 说明 |
|------|------|
| 多渠道 | 支持表单、API、批量导入 |
| 可分配 | 支持手动分配和自动分配 |
| 可追溯 | 完整的跟进历史记录 |
| 可分析 | 转化率和价值统计 |

---

## 2. 线索生命周期

### 2.1 状态流转

```
[NEW] → 分配 → [ASSIGNED] → 跟进 → [CONTACTING] → 转化 → [CONVERTED]
                                              ↓
                                         关闭 → [CLOSED]
```

### 2.2 状态定义

| 状态 | 代码 | 说明 |
|------|------|------|
| **NEW** | 新线索 | 刚提交的线索，待分配 |
| **ASSIGNED** | 已分配 | 已分配给负责人 |
| **CONTACTING** | 跟进中 | 正在跟进沟通 |
| **CONVERTED** | 已转化 | 线索已转化为客户 |
| **CLOSED** | 已关闭 | 线索无效或放弃 |

### 2.3 优先级定义

| 优先级 | 代码 | 说明 |
|--------|------|------|
| **HIGH** | 高 | 高价值线索，需优先处理 |
| **MEDIUM** | 中 | 普通线索，正常处理 |
| **LOW** | 低 | 低价值线索，可延后处理 |

---

## 3. 核心功能模块

### 3.1 线索收集

#### 功能列表
- [x] 落地页表单提交
- [x] API接口接收
- [ ] 批量导入（预留）
- [ ] 第三方平台同步（预留）

#### 表单字段
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 联系人姓名 |
| phone | string | 是 | 联系电话 |
| email | string | 否 | 邮箱 |
| company | string | 否 | 公司名称 |
| position | string | 否 | 职位 |
| source | string | 否 | 线索来源 |
| notes | string | 否 | 备注 |

### 3.2 线索管理

#### 功能列表
- [x] 线索列表（支持筛选、排序）
- [x] 线索详情查看
- [x] 线索状态更新
- [x] 线索优先级设置
- [x] 线索分配
- [x] 批量操作

#### 筛选条件
| 条件 | 说明 |
|------|------|
| 状态 | NEW/ASSIGNED/CONTACTING/CONVERTED/CLOSED |
| 优先级 | HIGH/MEDIUM/LOW |
| 负责人 | 指定用户 |
| 时间范围 | 创建时间范围 |
| 来源 | 线索来源 |

### 3.3 线索分配

#### 功能列表
- [x] 手动分配负责人
- [ ] 自动分配规则（预留）
- [x] 线索池管理

#### 分配规则（预留）
- 轮询分配
- 负载均衡
- 能力匹配
- 地域匹配

### 3.4 跟进管理

#### 功能列表
- [x] 跟进记录添加
- [x] 跟进历史查看
- [ ] 下次跟进提醒（预留）
- [ ] 跟进模板（预留）

#### 跟进类型
| 类型 | 说明 |
|------|------|
| NOTE | 备注 |
| CALL | 电话 |
| EMAIL | 邮件 |
| MEETING | 会议 |
| SMS | 短信 |

### 3.5 转化跟踪

#### 功能列表
- [x] 转化状态标记
- [x] 转化价值记录
- [x] 转化率统计

---

## 4. 数据模型

### 4.1 Lead（线索表）

```prisma
model Lead {
  id          String      @id @default(uuid())
  name        String      // 联系人姓名
  phone       String      // 联系电话
  email       String?     // 邮箱
  company     String?     // 公司名称
  position    String?     // 职位
  source      String?     // 线索来源
  status      LeadStatus  // 线索状态
  priority    Priority    // 优先级
  assigneeId  String?     // 负责人ID
  notes       String?     // 备注
  convertedValue Float?   // 转化价值
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  assignee    User?       @relation(fields: [assigneeId], references: [id])
  activities  LeadActivity[]
  
  @@index([status])
  @@index([priority])
  @@index([assigneeId])
  @@index([createdAt])
}
```

### 4.2 LeadActivity（跟进记录表）

```prisma
model LeadActivity {
  id          String      @id @default(uuid())
  leadId      String      // 关联线索ID
  type        ActivityType // 活动类型
  content     String      // 内容
  operatorId  String      // 操作人ID
  createdAt   DateTime    @default(now())
  
  lead        Lead        @relation(fields: [leadId], references: [id])
  operator    User        @relation(fields: [operatorId], references: [id])
  
  @@index([leadId])
  @@index([createdAt])
}
```

### 4.3 枚举类型

```prisma
enum LeadStatus {
  NEW         // 新线索
  ASSIGNED    // 已分配
  CONTACTING  // 跟进中
  CONVERTED   // 已转化
  CLOSED      // 已关闭
}

enum Priority {
  HIGH    // 高
  MEDIUM  // 中
  LOW     // 低
}

enum ActivityType {
  NOTE    // 备注
  CALL    // 电话
  EMAIL   // 邮件
  MEETING // 会议
  SMS     // 短信
}
```

---

## 5. 技术实现

### 5.1 服务端服务

#### lead.service.ts
核心线索服务，提供：
- `createLead()` - 创建线索
- `getLeads()` - 获取线索列表
- `getLeadById()` - 获取线索详情
- `updateLead()` - 更新线索
- `assignLead()` - 分配线索
- `updateStatus()` - 更新状态
- `addActivity()` - 添加跟进记录
- `getActivities()` - 获取跟进历史
- `getStats()` - 获取统计数据

### 5.2 前端组件

#### LeadManagement.tsx
线索管理页面，提供：
- 线索列表展示
- 高级筛选（状态、优先级、负责人、时间）
- 批量操作（分配、状态更新）
- 线索详情抽屉
- 跟进记录时间线
- 数据统计看板

### 5.3 API 接口

#### 创建线索
```http
POST /api/leads
Content-Type: application/json

{
  "name": "张三",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "company": "ABC公司",
  "position": "经理",
  "source": "落地页",
  "notes": "对AI PPT感兴趣"
}
```

#### 获取线索列表
```http
GET /api/leads?status=NEW&priority=HIGH&page=1&limit=20
```

#### 分配线索
```http
POST /api/leads/{id}/assign
Content-Type: application/json

{
  "assigneeId": "user-123"
}
```

#### 更新状态
```http
POST /api/leads/{id}/status
Content-Type: application/json

{
  "status": "CONTACTING"
}
```

#### 添加跟进记录
```http
POST /api/leads/{id}/activities
Content-Type: application/json

{
  "type": "CALL",
  "content": "电话沟通，客户对价格有疑问"
}
```

#### 标记转化
```http
POST /api/leads/{id}/convert
Content-Type: application/json

{
  "value": 5000
}
```

---

## 6. 权限控制

| 权限 | 说明 |
|------|------|
| leads:view | 查看线索 |
| leads:create | 创建线索 |
| leads:update | 更新线索 |
| leads:delete | 删除线索 |
| leads:assign | 分配线索 |
| leads:activity:create | 创建跟进记录 |

---

## 7. 业务流程

### 7.1 线索收集流程

```
用户提交表单
    ↓
验证数据
    ↓
创建线索（状态：NEW）
    ↓
发送通知给管理员
    ↓
管理员分配负责人
```

### 7.2 线索跟进流程

```
负责人查看线索
    ↓
添加跟进记录
    ↓
更新线索状态
    ↓
持续跟进
    ↓
标记转化或关闭
```

---

## 8. 测试要点

### 8.1 功能测试

- [ ] 线索创建
- [ ] 线索列表筛选
- [ ] 线索分配
- [ ] 状态更新
- [ ] 跟进记录添加
- [ ] 转化标记

### 8.2 权限测试

- [ ] 普通用户只能查看自己的线索
- [ ] 管理员可以查看所有线索
- [ ] 只有有权限的用户可以分配线索

---

## 9. 未来规划

### 9.1 短期规划（1-2个月）

- [ ] 自动分配规则
- [ ] 跟进提醒
- [ ] 跟进模板
- [ ] 批量导入

### 9.2 长期规划（3-6个月）

- [ ] 线索评分
- [ ] 智能推荐
- [ ] 销售漏斗分析
- [ ] 第三方CRM集成

---

*YH-AI PPT Lead Management System v1.0*
