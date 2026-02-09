import { prisma } from './src/db';

async function seedLeads() {
    console.log('🚀 Starting to seed mock leads...');

    const mockLeads = [
        {
            name: '张经理',
            phone: '13812345678',
            email: 'zhang@enterprise.com',
            company: '某大型科技集团',
            position: '采购总监',
            industry: '互联网/软件',
            teamSize: '500-1000人',
            needs: '需要为全公司部署 AI PPT 生成工具，要求支持私有化部署和 API 联动。',
            status: 'PENDING',
            priority: 'HIGH',
            source: '官网表单',
            createdAt: new Date() // 现在
        },
        {
            name: '李女士',
            phone: '13987654321',
            email: 'li@design_studio.cn',
            company: '雅致设计工作室',
            position: '创始人',
            industry: '文创/广告',
            teamSize: '10-20人',
            needs: '希望提升提案 PPT 的产出效率，对视觉质量要求极高。',
            status: 'CONTACTED',
            priority: 'MEDIUM',
            source: '朋友推荐'
        },
        {
            name: '王小龙',
            phone: '13500001111',
            email: 'wangxiaolong@startup-inc.io',
            company: '新能未来科技',
            position: 'CEO',
            industry: '新能源',
            teamSize: '50-100人',
            needs: '准备下周的路演，需要一套极具冲击力的融资商业计划书 PPT。',
            status: 'QUALIFIED',
            priority: 'HIGH',
            source: '百度搜索'
        },
        {
            name: '测试用户A',
            phone: '18888888888',
            email: 'test_a@example.com',
            company: '模拟测试有限公司',
            position: '测试工程师',
            industry: '教育培训',
            teamSize: '200-500人',
            needs: '批量生成课程大纲对应的课件 PPT。',
            status: 'CLOSED',
            priority: 'LOW',
            source: '外部市场活动'
        },
        {
            name: '陈总',
            phone: '13666668888',
            email: 'chen@fintech-global.com',
            company: '金诚财富管理',
            position: '总经理',
            industry: '金融/投资',
            teamSize: '100-200人',
            needs: '已采购企业版，需协助进行私有化部署及员工培训。',
            status: 'CONVERTED',
            priority: 'HIGH',
            source: '老客户转介绍',
            createdAt: new Date(Date.now() - 86400000 * 15) // 15天前创建
        },
        {
            name: '赵老师',
            phone: '13344445555',
            email: 'zhao@edu-online.net',
            company: '云端教育科技',
            position: '教研组长',
            industry: '在线教育',
            teamSize: '500+人',
            needs: '订购了50个账号，用于教研团队批量制作标准化课件。',
            status: 'CONVERTED',
            priority: 'MEDIUM',
            source: '官网咨询',
            createdAt: new Date(Date.now() - 86400000 * 20) // 20天前创建
        }
    ];

    for (const leadData of mockLeads) {
        // @ts-ignore
        const { createdAt, ...restData } = leadData;
        const lead = await prisma.lead.create({
            data: {
                ...restData,
                createdAt: createdAt || new Date()
            }
        });
        console.log(`✅ Created lead: ${lead.name} (${lead.id})`);

        // 为部分线索添加初始跟进记录
        if (lead.status !== 'PENDING') {
            await prisma.leadActivity.create({
                data: {
                    leadId: lead.id,
                    type: 'SYSTEM',
                    content: '系统：线索已进入分配池',
                    operatorId: 'system',
                    createdAt: createdAt || new Date() // 使用线索创建时间
                }
            });

            if (lead.status === 'CONTACTED') {
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'CALL',
                        content: '初次电话联络，客户表达了强烈意向，正在等待公司内部审批流程。',
                        operatorId: 'admin_mock'
                    }
                });
            }

            // 为已成交线索添加完整的时间轴
            if (lead.status === 'CONVERTED' && lead.name === '陈总') {
                // 1. 电话沟通
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'CALL',
                        content: '与陈总进行了深入沟通，详细介绍了企业版的功能和私有化部署方案。',
                        operatorId: 'admin_mock',
                        createdAt: new Date(Date.now() - 86400000 * 7) // 7天前
                    }
                });
                // 2. 确认高意向
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'NOTE',
                        content: '客户认可方案报价，进入合同流程。状态变更为：高意向',
                        operatorId: 'admin_mock',
                        createdAt: new Date(Date.now() - 86400000 * 5) // 5天前
                    }
                });
                // 3. 成交
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'SYSTEM',
                        content: '系统：订单支付成功，线索自动转化为成交状态。',
                        operatorId: 'system',
                        createdAt: new Date(Date.now() - 86400000 * 1) // 1天前
                    }
                });
            }

            if (lead.status === 'CONVERTED' && lead.name === '赵老师') {
                // 1. 电话沟通
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'CALL',
                        content: '了解学校教研团队的课件制作痛点，演示了 AI 一键生成的功能。',
                        operatorId: 'admin_mock',
                        createdAt: new Date(Date.now() - 86400000 * 10) // 10天前
                    }
                });
                // 2. 确认高意向
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'NOTE',
                        content: '赵老师申请了 3 个试用账号给团队测试，反馈良好。',
                        operatorId: 'admin_mock',
                        createdAt: new Date(Date.now() - 86400000 * 6) // 6天前
                    }
                });
                // 3. 成交
                await prisma.leadActivity.create({
                    data: {
                        leadId: lead.id,
                        type: 'SYSTEM',
                        content: '系统：批量采购订单已在后台录入。',
                        operatorId: 'system',
                        createdAt: new Date(Date.now() - 86400000 * 2) // 2天前
                    }
                });
            }
        }
    }

    console.log('✨ Seeding completed!');
}

seedLeads()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
