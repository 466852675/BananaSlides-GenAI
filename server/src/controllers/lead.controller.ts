// server/src/controllers/lead.controller.ts
import { Request, Response } from 'express';
import * as LeadService from '../services/lead.service';

/**
 * 提交销售线索 (公开/用户)
 */
export async function submitLead(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.userId; // 可选：如果用户已登录
        const { name, phone, company, position, email, teamSize, industry, needs } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: '姓名和联系电话为必填项' });
        }

        const lead = await LeadService.createLead({
            userId,
            name,
            phone,
            company,
            position,
            email,
            teamSize,
            industry,
            needs
        });

        res.status(201).json(lead);
    } catch (error) {
        console.error('Submit Lead Error:', error);
        res.status(500).json({ error: '提交失败，请稍后重试' });
    }
}

/**
 * 获取线索列表 (Admin)
 */
export async function listLeads(req: Request, res: Response) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search ? (req.query.search as string) : undefined;
        const status = req.query.status ? (req.query.status as string) : undefined;

        const result = await LeadService.listLeads(page, limit, search, status);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('List Leads Error:', error);
        res.status(500).json({ success: false, error: '获取列表失败' });
    }
}

/**
 * 更新线索状态 (Admin)
 */
export async function updateLeadStatus(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { status, notes } = req.body;

        if (!status || typeof status !== 'string') {
            return res.status(400).json({ success: false, error: '状态无效或为空' });
        }

        const lead = await LeadService.updateLeadStatus(id, status, notes);
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Update Lead Error:', error);
        res.status(500).json({ success: false, error: '更新失败' });
    }
}

/**
 * 删除线索 (Admin)
 */
export async function deleteLead(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        await LeadService.deleteLead(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete Lead Error:', error);
        res.status(500).json({ success: false, error: '删除失败' });
    }
}

/**
 * 获取线索详情 (Admin)
 */
export async function getLeadDetail(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const lead = await LeadService.getLeadById(id);
        
        if (!lead) {
            return res.status(404).json({ success: false, error: '线索不存在' });
        }
        
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Get Lead Detail Error:', error);
        res.status(500).json({ success: false, error: '获取线索详情失败' });
    }
}

/**
 * 添加跟进备注 (Admin)
 */
export async function addLeadNote(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { note } = req.body;
        
        if (!note || typeof note !== 'string') {
            return res.status(400).json({ success: false, error: '备注内容不能为空' });
        }
        
        const lead = await LeadService.addLeadNote(id, note);
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Add Lead Note Error:', error);
        res.status(500).json({ success: false, error: '添加备注失败' });
    }
}

/**
 * 转换线索为用户 (Admin)
 */
export async function convertLeadToUser(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, error: '邮箱和密码为必填项' });
        }
        
        const result = await LeadService.convertLeadToUser(id, email, password);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Convert Lead Error:', error);
        res.status(500).json({ success: false, error: error.message || '转换失败' });
    }
}
