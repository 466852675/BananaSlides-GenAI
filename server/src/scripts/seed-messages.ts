
import { PrismaClient, MessageType, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 开始生成全量模拟消息数据 (User + Admin)...');

    // 0. 清理旧数据 (可选，为了演示效果只清理消息表)
    // await prisma.userMessage.deleteMany({});
    // console.log('🧹 已清理旧消息数据');

    // 1. 获取所有用户及相关数据
    const users = await prisma.user.findMany({
        take: 50,
        include: {
            orders: { take: 5, orderBy: { createdAt: 'desc' } },
            refundRequests: { take: 5, orderBy: { createdAt: 'desc' } },
            projects: { take: 5, orderBy: { createdAt: 'desc' } },
        }
    });

    // 2. 识别管理员
    const admins = users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);
    const normalUsers = users.filter(u => u.role !== UserRole.ADMIN && u.role !== UserRole.SUPER_ADMIN);

    if (admins.length === 0) {
        console.warn('⚠️ 未找到管理员账号，将跳过管理员消息生成。请先设置一个用户为 ADMIN 角色。');
    }

    console.log(`📊 统计: 用户总数 ${users.length} (管理员 ${admins.length}, 普通用户 ${normalUsers.length})`);

    const messages: any[] = [];

    // ==========================================
    // A. 普通用户消息模拟
    // ==========================================
    console.log('👉 生成普通用户消息...');
    for (const user of normalUsers) {
        // 1. 订单消息
        for (const order of user.orders) {
            if (order.status === 'PAID') {
                messages.push({
                    userId: user.id,
                    type: MessageType.ORDER,
                    title: '订单支付成功',
                    content: `您的订单 ${order.orderNo} 已支付成功！已到账 ${Math.floor(order.finalPrice * 10)} 积分，感谢您的支持。`,
                    summary: `${order.productName}，+${Math.floor(order.finalPrice * 10)} 积分`,
                    bizType: 'order',
                    bizId: order.id,
                    actionUrl: `/orders/${order.id}`,
                    isImportant: true,
                    isRead: Math.random() > 0.4,
                    createdAt: order.updatedAt,
                });
            } else if (order.status === 'PENDING') {
                messages.push({
                    userId: user.id,
                    type: MessageType.ORDER,
                    title: '⏳ 订单待支付提醒',
                    content: `您的订单 ${order.orderNo} 尚未支付，库存有限，请尽快完成支付。商品：${order.productName}`,
                    summary: `待支付：¥${order.finalPrice}`,
                    bizType: 'order',
                    bizId: order.id,
                    actionUrl: `/orders/${order.id}`,
                    isImportant: false,
                    isRead: false,
                    createdAt: order.createdAt,
                });
            }
        }

        // 2. 退款消息
        for (const refund of user.refundRequests) {
            if (refund.status === 'COMPLETED') {
                messages.push({
                    userId: user.id,
                    type: MessageType.REFUND,
                    title: '✅ 退款已成功到账',
                    content: `您的退款申请已处理完成，¥${refund.amount.toFixed(2)} 原路退回至您的支付账户。`,
                    summary: `退款成功: ¥${refund.amount.toFixed(2)}`,
                    bizType: 'refund',
                    bizId: refund.id,
                    actionUrl: `/user/refunds/${refund.id}`,
                    isImportant: true,
                    isRead: Math.random() > 0.6,
                    createdAt: refund.updatedAt,
                });
            } else if (refund.status === 'PENDING') {
                messages.push({
                    userId: user.id,
                    type: MessageType.REFUND,
                    title: '退款申请已提交',
                    content: `您的退款申请（单号 ${refund.refundNo}）已提交，我们将于 1-3 个工作日内完成审核。`,
                    summary: `审核中: ¥${refund.amount}`,
                    bizType: 'refund',
                    bizId: refund.id,
                    actionUrl: `/user/refunds/${refund.id}`,
                    isImportant: false,
                    isRead: false,
                    createdAt: refund.updatedAt,
                });
            } else if (refund.status === 'REJECTED') {
                messages.push({
                    userId: user.id,
                    type: MessageType.REFUND,
                    title: '❌ 退款申请未通过',
                    content: `很抱歉，您的退款申请未通过审核。原因：${refund.remark || '不符合退款条件'}。`,
                    summary: `退款驳回`,
                    bizType: 'refund',
                    bizId: refund.id,
                    actionUrl: `/user/refunds/${refund.id}`,
                    isImportant: true,
                    isRead: false,
                    createdAt: refund.updatedAt,
                });
            }
        }

        // 3. AI 生成消息
        for (const project of user.projects) {
            // 模拟 70% 的项目生成成功通知
            if (Math.random() > 0.3) {
                messages.push({
                    userId: user.id,
                    type: MessageType.AI,
                    title: '✨ PPT 生成完成',
                    content: `您的演示文稿《${project.title}》已由 AI 生成完毕，快点击查看效果吧！`,
                    summary: `生成完成：${project.title}`,
                    bizType: 'project',
                    bizId: project.id,
                    actionUrl: `/workbench?project=${project.id}`,
                    isImportant: false,
                    isRead: Math.random() > 0.2,
                    createdAt: project.updatedAt,
                });
            }
        }

        // 4. VIP 变动
        if (user.vipLevel > 0) {
            const levelName = ['免费', '基础', '专业', '尊享', '企业'][user.vipLevel] || 'VIP';
            messages.push({
                userId: user.id,
                type: MessageType.VIP,
                title: '🎉 恭喜升级',
                content: `您已成功升级为 ${levelName}版会员，解锁 infinite AI 生成次数！`,
                summary: `等级升级：${levelName}版`,
                bizType: 'vip',
                actionUrl: '/settings',
                isImportant: true,
                isRead: true,
                createdAt: user.updatedAt,
            });
        }

        // 5. 营销活动 (群发)
        messages.push({
            userId: user.id,
            type: MessageType.ACTIVITY,
            title: '🎁 限时特惠：终身会员 5 折',
            content: `【新春特惠】终身会员限时 5 折抢购！支持开发票，企业报销无忧。仅限前 100 名。`,
            summary: `终身会员 5 折`,
            actionUrl: '/pricing',
            isImportant: false,
            isRead: Math.random() > 0.8,
            createdAt: new Date(Date.now() - 3600000 * 4), // 4小时前
        });

        // 6. 系统公告
        messages.push({
            userId: user.id,
            type: MessageType.SYSTEM,
            title: '🔧 系统升级通知',
            content: `为了提升生成速度，我们将于本周六凌晨 02:00 进行服务器升级，预计耗时 30 分钟。`,
            summary: `系统维护通知`,
            isImportant: true,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000 * 3), // 3天前
        });
    }

    // ==========================================
    // B. 管理员消息模拟 (Admin 视角)
    // ==========================================
    console.log('👉 生成管理员消息...');

    // 🛠️ 补充：创建一些模拟线索 (Lead)
    console.log('  -> 生成模拟销售线索...');
    const mockLeads = [
        { name: '张经理', company: '杭州科技无限公司', phone: '13800138000', needs: '企业版采购咨询' },
        { name: '李总监', company: '未来教育集团', phone: '13912345678', needs: 'API 对接需求' },
        { name: '王老师', company: '某大学', phone: '13588888888', needs: '教育优惠申请' }
    ];

    const createdLeads = [];
    // 随机分配线索给现有用户（模拟用户提交）
    for (const leadData of mockLeads) {
        const randomUser = normalUsers[Math.floor(Math.random() * normalUsers.length)];
        // 注意：这里需要确保 Lead 表和 schema 兼容，简单起见我们只生成消息，不强制创建 Lead 记录
        // 如果需要跳转 actionUrl: '/admin/users?tab=leads'，最好有真实数据。
        // 为了演示消息，我们假设ID存在。
        createdLeads.push({ ...leadData, id: `mock-lead-${Date.now()}-${Math.random()}` });
    }

    // 获取近期的高额订单 (模拟)
    const recentBigOrders = await prisma.order.findMany({
        where: { status: 'PAID', finalPrice: { gt: 99 } },
        take: 3,
        orderBy: { createdAt: 'desc' }
    });

    // 获取待处理退款
    const pendingRefunds = await prisma.refundRequest.findMany({
        where: { status: 'PENDING' },
        take: 3
    });

    // 获取新注册用户
    const newUsers = await prisma.user.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
    });

    for (const admin of admins) {
        // 1. 业务提醒：新线索 (GAP 2 重点)
        for (const lead of createdLeads) {
            messages.push({
                userId: admin.id,
                type: MessageType.SYSTEM, // 线索属于 SYSTEM 类型，但在前端通过 bizType: 'admin_lead' 区分
                title: '📈 收到新销售线索',
                content: `有新的潜在客户提交了信息。\n公司: ${lead.company}\n联系人: ${lead.name}\n需求: ${lead.needs}`,
                summary: `新线索: ${lead.name}`,
                bizType: 'admin_lead', // 关键：对应 MessagePanel 的 Admin Tabs 筛选
                bizId: lead.id,
                actionUrl: '/admin/users?tab=leads',
                isImportant: false,
                isRead: false,
                createdAt: new Date(),
            });
        }

        // 2. 业务提醒：新订单
        for (const order of recentBigOrders) {
            messages.push({
                userId: admin.id,
                type: MessageType.ORDER,
                title: '💰 新的大额订单',
                content: `收到一笔新的支付订单！\n用户: ${order.userId.substring(0, 6)}...\n金额: ¥${order.finalPrice}\n商品: ${order.productName}`,
                summary: `入账: ¥${order.finalPrice}`,
                bizType: 'admin_order',
                bizId: order.id,
                actionUrl: `/admin/orders`,
                isImportant: true,
                isRead: false,
                createdAt: order.createdAt,
            });
        }

        // 3. 待办事项：退款审核
        for (const refund of pendingRefunds) {
            messages.push({
                userId: admin.id,
                type: MessageType.REFUND,
                title: '⚠️ 待处理退款申请',
                content: `用户提交了退款申请，请及时审核。\n单号: ${refund.refundNo}\n金额: ¥${refund.amount}\n原因: ${refund.reason}`,
                summary: `待审核: ¥${refund.amount}`,
                bizType: 'admin_refund',
                bizId: refund.id,
                actionUrl: `/admin/orders?tab=refunds`,
                isImportant: true,
                isRead: false,
                createdAt: refund.createdAt,
            });
        }

        // 4. 用户增长 (报表)
        if (newUsers.length > 0) {
            messages.push({
                userId: admin.id,
                type: MessageType.SYSTEM,
                title: '📈 用户增长日报',
                content: `昨日新增注册用户 ${Math.floor(Math.random() * 50) + 10} 人，新增 VIP 用户 ${Math.floor(Math.random() * 5)} 人。`,
                summary: `昨日新增: +${Math.floor(Math.random() * 50) + 10} 人`,
                bizType: 'admin_report', // 关键：对应可能的 Report Tab
                isImportant: false,
                isRead: true,
                createdAt: new Date(),
            });
        }

        // 5. 系统监控 (系统)
        messages.push({
            userId: admin.id,
            type: MessageType.SECURITY,
            title: '🛡️ 系统安全周报',
            content: `本周拦截异常登录尝试 12 次，系统运行平稳。无高危漏洞。`,
            summary: `系统安全评分: 98`,
            bizType: 'admin_security',
            isImportant: false,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000),
        });

        // 6. 资源预警 (系统)
        if (Math.random() > 0.5) {
            messages.push({
                userId: admin.id,
                type: MessageType.SYSTEM,
                title: '⚡ [预警] AI 算力负载较高',
                content: `当前 AI 生成队列积压超过 50 个任务，建议检查算力节点状态。`,
                summary: `队列积压: 50+`,
                bizType: 'admin_alert',
                isImportant: true,
                isRead: false,
                createdAt: new Date(),
            });
        }
    }

    // 批量插入
    console.log(`💾 准备插入 ${messages.length} 条消息...`);
    const batchSize = 50;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        await prisma.userMessage.createMany({
            data: batch,
        });
    }

    console.log('✅ 全量模拟数据生成完成！');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
