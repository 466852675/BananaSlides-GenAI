# CRM线索系统

## 概述

CRM线索系统是一个完整的客户关系管理模块，负责收集、管理和转化潜在用户线索。系统支持从线索提交到最终转化的全流程管理，包括线索分配、跟进记录、状态流转和自动化通知等功能。

## 核心功能

| 功能 | 说明 | 权限要求 |
|------|------|----------|
| 线索提交 | 用户/访客提交合作意向表单 | 公开访问 |
| 线索列表 | 管理员查看所有线索，支持筛选和搜索 | admin.leads.view |
| 线索详情 | 查看线索完整信息和跟进历史 | admin.leads.view.detail |
| 线索分配 | 将线索分配给指定销售人员 | admin.leads.manage.owner |
| 状态更新 | 更新线索处理状态 | admin.leads.manage.status |
| 跟进记录 | 添加电话、邮件、会议等跟进记录 | admin.leads.manage.note |
| 线索转化 | 将线索转换为正式系统用户 | admin.leads.convert |
| 线索删除 | 删除无效线索 | admin.leads.delete |

## 数据库模型

### Lead 模型

```prisma
model Lead {
  id               String         @id @default(uuid())
  userId           String?        // 关联前台用户
  name             String
  company          String?
  position         String?
  phone            String
  email            String?
  teamSize         String?
  industry         String?
  needs            String?
  status           String         @default("PENDING")
  priority         String?        @default("MEDIUM") // LOW, MEDIUM, HIGH
  
  // CRM 核心扩展
  assigneeId       String?        // 负责人 ID (管理员)
  nextFollowUpAt   DateTime?      // 下次跟进时间
  convertedOrderId String?        // 转化后的订单 ID
  
  source           String?        // 线索来源
  notes            String?        // 简易备注
  
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  
  // 关联
  user             User?          @relation(fields: [userId], references: [id])
  assignee         User?          @relation("LeadAssignee", fields: [assigneeId], references: [id])
  activities       LeadActivity[]
}
```

### LeadActivity 模型

```prisma
model LeadActivity {
  id         String   @id @default(uuid())
  leadId     String
  type       String   // CALL, EMAIL, MEETING, NOTE, SYSTEM
  content    String
  metadata   String?  // JSON string for extra info
  operatorId String   // 操作人 ID
  createdAt  DateTime @default(now())
  
  lead       Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)

  @@index([leadId])
  @@index([createdAt])
}
```

## 线索状态流转

```
┌─────────────┐     首次跟进      ┌─────────────┐
│   PENDING   │ ────────────────→ │  CONTACTED  │
│   (待处理)   │                  │   (已联系)   │
└──────┬──────┘                  └──────┬──────┘
       │                                │
       │ 直接转化                        │ 确认意向
       ↓                                ↓
┌─────────────┐                  ┌─────────────┐
│  CONVERTED  │                  │   QUALIFIED  │
│   (已转化)   │                  │   (已确认)   │
└─────────────┘                  └──────┬──────┘
                                        │
                                        │ 完成转化
                                        ↓
                                  ┌─────────────┐
                                  │  CONVERTED  │
                                  └─────────────┘
```

### 状态说明

| 状态 | 英文标识 | 说明 | 触发条件 |
|------|----------|------|----------|
| 待处理 | PENDING | 新提交的线索，尚未处理 | 线索提交时 |
| 已联系 | CONTACTED | 已进行首次联系 | 添加跟进记录时自动触发 |
| 已确认 | QUALIFIED | 已确认合作意向 | 管理员手动标记 |
| 已转化 | CONVERTED | 已成功转为正式用户 | 执行转化操作时 |
| 已流失 | LOST | 无意向或无法联系 | 管理员手动标记 |

## 核心算法实现

### 线索创建服务

```typescript
// server/src/services/lead.service.ts

/**
 * 创建线索
 */
export async function createLead(data: any) {
    const { userId, name, phone, company, position, email, 
            teamSize, industry, needs, source } = data;
    
    const newLead = await prisma.lead.create({
        data: {
            userId,
            name,
            phone,
            company,
            position,
            email,
            teamSize,
            industry,
            needs,
            source,
            status: 'PENDING',
            priority: 'MEDIUM'
        }
    });

    // 异步通知管理员新线索
    notifyAdminNewLead({
        id: newLead.id,
        name: newLead.name,
        company: newLead.company,
        phone: newLead.phone,
        industry: newLead.industry,
        needs: newLead.needs
    }).catch(err => console.error('[LeadNotify] 管理员通知发送失败:', err));

    return newLead;
}
```

### 线索列表查询

```typescript
/**
 * 获取线索列表 (带分页和筛选)
 */
export async function listLeads(
    page: number, 
    limit: number, 
    search?: string, 
    status?: string
) {
    const where: any = {};
    
    // 多字段搜索
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { phone: { contains: search } },
            { company: { contains: search } },
            { email: { contains: search } }
        ];
    }
    
    // 状态筛选
    if (status) {
        where.status = status;
    }

    const [items, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                assignee: {
                    select: { nickname: true, avatar: true }
                }
            }
        }),
        prisma.lead.count({ where })
    ]);

    return {
        items,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}
```

### 自动状态流转

```typescript
/**
 * 记录跟进动态（含自动状态变更）
 */
export async function logActivity(data: {
    leadId: string;
    type: string;
    content: string;
    metadata?: any;
    operatorId: string;
}) {
    // 1. 创建活动记录
    const activity = await prisma.leadActivity.create({
        data: {
            leadId: data.leadId,
            type: data.type,
            content: data.content,
            metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            operatorId: data.operatorId
        }
    });

    // 2. 自动化逻辑：首次填写跟进备注自动改为已跟进
    if (data.type !== 'SYSTEM' && data.operatorId !== 'system') {
        const lead = await prisma.lead.findUnique({
            where: { id: data.leadId },
            select: { status: true }
        });

        if (lead?.status === 'PENDING') {
            await prisma.lead.update({
                where: { id: data.leadId },
                data: { status: 'CONTACTED' }
            });

            // 记录系统自动变更日志
            await prisma.leadActivity.create({
                data: {
                    leadId: data.leadId,
                    type: 'SYSTEM',
                    content: '线索状态自动变更为: 已跟进 (触发因素: 首次添加跟进记录)',
                    operatorId: 'system'
                }
            });
        }
    }

    return activity;
}
```

### 线索转化为用户

```typescript
/**
 * 转换线索为用户
 */
export async function convertLeadToUser(
    leadId: string, 
    email: string, 
    passwordHash: string
) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new Error('线索不存在');

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('该邮箱已注册');

    return await prisma.$transaction(async (tx) => {
        // 1. 创建用户
        const user = await tx.user.create({
            data: {
                email,
                passwordHash,
                nickname: lead.name,
                phone: lead.phone,
                role: UserRole.USER,
                status: UserStatus.ACTIVE,
                points: 30 // 默认注册奖励
            }
        });

        // 2. 更新线索状态
        await tx.lead.update({
            where: { id: leadId },
            data: {
                status: 'CONVERTED',
                userId: user.id
            }
        });

        // 3. 记录转化日志
        await tx.leadActivity.create({
            data: {
                leadId,
                type: 'SYSTEM',
                content: `线索已成功转换为正式用户: ${email}`,
                operatorId: 'system'
            }
        });

        return user;
    });
}
```

## API 接口规范

### 公开接口

#### 提交线索

```
POST /api/leads
```

**请求体：**
```json
{
  "name": "张三",
  "phone": "13800138000",
  "company": "示例科技",
  "position": "产品经理",
  "email": "zhangsan@example.com",
  "teamSize": "20-50人",
  "industry": "互联网",
  "needs": "需要批量生成PPT方案",
  "source": "官网首页"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "张三",
    "phone": "13800138000",
    "status": "PENDING",
    "createdAt": "2026-02-16T10:00:00Z"
  }
}
```

### 管理接口（需认证）

#### 获取线索列表

```
GET /api/leads?page=1&limit=20&status=PENDING&search=张三
```

**查询参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认1 |
| limit | number | 每页数量，默认20 |
| status | string | 状态筛选 |
| search | string | 搜索关键词 |

**响应：**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

#### 获取线索详情

```
GET /api/leads/:id
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "张三",
    "phone": "13800138000",
    "company": "示例科技",
    "status": "CONTACTED",
    "assignee": {
      "nickname": "销售小李",
      "avatar": "..."
    },
    "activities": [
      {
        "id": "uuid",
        "type": "CALL",
        "content": "已电话沟通，对方有明确意向",
        "operatorId": "admin-id",
        "createdAt": "2026-02-16T10:30:00Z"
      }
    ]
  }
}
```

#### 更新线索状态

```
PUT /api/leads/:id/status
```

**请求体：**
```json
{
  "status": "QUALIFIED",
  "notes": "客户意向强烈，预计下周签约"
}
```

#### 分配负责人

```
PUT /api/leads/:id/assign
```

**请求体：**
```json
{
  "assigneeId": "admin-user-id"
}
```

#### 添加跟进记录

```
POST /api/leads/:id/activities
```

**请求体：**
```json
{
  "type": "MEETING",
  "content": "线上会议沟通需求细节",
  "metadata": {
    "duration": 45,
    "participants": ["张三", "李四"]
  }
}
```

#### 添加备注

```
PUT /api/leads/:id/note
```

**请求体：**
```json
{
  "note": "客户预算充足，重点关注售后服务"
}
```

#### 转化线索为用户

```
POST /api/leads/:id/convert
```

**请求体：**
```json
{
  "email": "zhangsan@example.com",
  "password": "temporaryPassword123"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "zhangsan@example.com",
    "nickname": "张三"
  }
}
```

## 前端组件设计

### 线索列表组件

```tsx
// LeadList.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, User, Phone, Building } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  company?: string;
  status: 'PENDING' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee?: { nickname: string; avatar?: string };
  createdAt: string;
}

const statusMap = {
  PENDING: { label: '待处理', color: 'bg-yellow-100 text-yellow-800' },
  CONTACTED: { label: '已联系', color: 'bg-blue-100 text-blue-800' },
  QUALIFIED: { label: '已确认', color: 'bg-green-100 text-green-800' },
  CONVERTED: { label: '已转化', color: 'bg-purple-100 text-purple-800' },
  LOST: { label: '已流失', color: 'bg-gray-100 text-gray-800' }
};

export const LeadList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data, isLoading } = useQuery({
    queryKey: ['leads', page, search, statusFilter],
    queryFn: () => fetchLeads({ page, search, status: statusFilter })
  });

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索姓名、电话、公司..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="PENDING">待处理</option>
          <option value="CONTACTED">已联系</option>
          <option value="QUALIFIED">已确认</option>
          <option value="CONVERTED">已转化</option>
        </select>
      </div>

      {/* 线索列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">客户信息</th>
              <th className="px-4 py-3 text-left">联系方式</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">负责人</th>
              <th className="px-4 py-3 text-left">提交时间</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.items.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{lead.name}</div>
                      {lead.company && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {lead.company}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {lead.phone}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    statusMap[lead.status].color
                  }`}>
                    {statusMap[lead.status].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lead.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                      <span className="text-sm">{lead.assignee.nickname}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">未分配</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 线索详情组件

```tsx
// LeadDetail.tsx
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Phone, Mail, Building, Calendar, User } from 'lucide-react';

interface LeadDetailProps {
  leadId: string;
}

export const LeadDetail: React.FC<LeadDetailProps> = ({ leadId }) => {
  const { data: lead } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => fetchLeadDetail(leadId)
  });

  const updateStatusMutation = useMutation({
    mutationFn: updateLeadStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    }
  });

  if (!lead) return null;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* 左侧：客户信息 */}
      <div className="col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">客户信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="姓名" value={lead.name} />
            <InfoItem icon={Building} label="公司" value={lead.company} />
            <InfoItem icon={Phone} label="电话" value={lead.phone} />
            <InfoItem icon={Mail} label="邮箱" value={lead.email} />
          </div>
          {lead.needs && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <div className="text-sm text-gray-500 mb-1">需求描述</div>
              <div className="text-sm">{lead.needs}</div>
            </div>
          )}
        </div>

        {/* 跟进记录 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">跟进记录</h2>
          <div className="space-y-4">
            {lead.activities?.map((activity) => (
              <div key={activity.id} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{activity.type}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{activity.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧：操作面板 */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">状态管理</h3>
          <select
            className="w-full px-3 py-2 border rounded-lg"
            value={lead.status}
            onChange={(e) => updateStatusMutation.mutate({
              id: leadId,
              status: e.target.value
            })}
          >
            <option value="PENDING">待处理</option>
            <option value="CONTACTED">已联系</option>
            <option value="QUALIFIED">已确认</option>
            <option value="CONVERTED">已转化</option>
            <option value="LOST">已流失</option>
          </select>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">快速操作</h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              添加跟进记录
            </button>
            <button className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
              分配给负责人
            </button>
            {lead.status !== 'CONVERTED' && (
              <button className="w-full px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50">
                转化为用户
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

## 管理员通知

当有新线索提交时，系统会自动通知管理员：

```typescript
// server/src/services/admin-notification.service.ts

export async function notifyAdminNewLead(lead: {
  id: string;
  name: string;
  company?: string;
  phone: string;
  industry?: string;
  needs?: string;
}) {
  // 创建系统消息通知管理员
  await prisma.userMessage.createMany({
    data: adminUsers.map(admin => ({
      userId: admin.id,
      type: 'LEAD',
      title: '新线索提醒',
      content: `${lead.name}(${lead.company || '个人'}) 提交了合作意向，请尽快跟进。`,
      bizType: 'LEAD',
      bizId: lead.id,
      actionUrl: `/admin/leads/${lead.id}`,
      isImportant: true
    }))
  });
}
```

## 权限控制

CRM 线索系统使用 RBAC 权限模型，所需权限如下：

| 接口 | 所需权限 | 说明 |
|------|----------|------|
| GET /leads | admin.leads.view | 查看线索列表 |
| GET /leads/:id | admin.leads.view.detail | 查看线索详情 |
| PUT /leads/:id/status | admin.leads.manage.status | 更新线索状态 |
| PUT /leads/:id/assign | admin.leads.manage.owner | 分配负责人 |
| POST /leads/:id/activities | admin.leads.manage.note | 添加跟进记录 |
| POST /leads/:id/convert | admin.leads.convert | 转化为用户 |
| DELETE /leads/:id | admin.leads.delete | 删除线索 |

## 扩展阅读

- [用户管理](../07_用户管理/用户管理前端文档.md) - 转化后的用户管理
- [消息中心](../04_用户增值服务/消息中心.md) - 线索通知机制
- [认证服务系统](../05_认证与权限/认证服务系统.md) - 用户注册与认证
- [权限体系现状报告](../05_认证与权限/权限体系现状报告.md) - RBAC 权限系统

---

*最后更新: 2026-02-16*  
*文档版本: v2.0 (基于实际代码扩充)*
