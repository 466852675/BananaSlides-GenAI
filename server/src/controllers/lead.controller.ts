// server/src/controllers/lead.controller.ts
import { Request, Response } from 'express';
import * as LeadService from '../services/lead.service';
import { hashPassword } from '../utils/password.util';

/**
 * 提交销售线索 (公开/用户)
 */
export async function submitLead(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        const data = req.body;
        const lead = await LeadService.createLead({ ...data, userId });
        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        console.error('Submit Lead Error:', error);
        res.status(500).json({ success: false, error: '提交失败，请稍后重试' });
    }
}

/**
 * 获取线索列表 (Admin)
 */
export async function listLeads(req: Request, res: Response) {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const status = req.query.status as string;

        const result = await LeadService.listLeads(page, limit, search, status);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('List Leads Error:', error);
        res.status(500).json({ success: false, error: '获取列表失败' });
    }
}

/**
 * 获取线索详情 (Admin)
 */
export async function getLeadDetail(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const lead = await LeadService.getLeadById(id);
        if (!lead) return res.status(404).json({ success: false, error: '线索不存在' });
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Get Lead Detail Error:', error);
        res.status(500).json({ success: false, error: '获取详情失败' });
    }
}

/**
 * 添加跟进备注 (Admin)
 */
export async function addLeadNote(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { note } = req.body;
        const operatorId = (req as any).user?.id || 'system';

        if (!note) return res.status(400).json({ success: false, error: '备注不能为空' });

        await LeadService.logActivity({
            leadId: id,
            type: 'NOTE',
            content: note,
            operatorId
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Add Lead Note Error:', error);
        res.status(500).json({ success: false, error: '添加备注失败' });
    }
}

/**
 * 获取跟进记录 (Admin)
 */
export async function getActivities(req: Request, res: Response) {
    try {
        const leadId = req.params.id as string;
        const activities = await LeadService.getActivities(leadId);
        res.json({ success: true, data: activities });
    } catch (error) {
        console.error('Get Activities Error:', error);
        res.status(500).json({ success: false, error: '获取动态失败' });
    }
}

/**
 * 添加跟进记录 (Admin)
 */
export async function addActivity(req: Request, res: Response) {
    try {
        const leadId = req.params.id as string;
        const operatorId = (req as any).user?.id || 'system';
        const { type, content, metadata } = req.body;

        if (!content) return res.status(400).json({ success: false, error: '内容不能为空' });

        const activity = await LeadService.logActivity({
            leadId,
            type: type || 'NOTE',
            content,
            metadata,
            operatorId
        });
        res.json({ success: true, data: activity });
    } catch (error) {
        console.error('Add Activity Error:', error);
        res.status(500).json({ success: false, error: '添加活动失败' });
    }
}

/**
 * 更新线索状态 (Admin)
 */
export async function updateLeadStatus(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const operatorId = (req as any).user?.id || 'system';
        const { status, notes } = req.body;

        const lead = await LeadService.updateLeadStatus(id, status, notes, operatorId);
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Update Lead Status Error:', error);
        res.status(500).json({ success: false, error: '更新状态失败' });
    }
}

/**
 * 指派负责人 (Admin)
 */
export async function assignLead(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const operatorId = (req as any).user?.id || 'system';
        const { assigneeId } = req.body;

        const lead = await LeadService.assignLead(id, assigneeId, operatorId);
        res.json({ success: true, data: lead });
    } catch (error) {
        console.error('Assign Lead Error:', error);
        res.status(500).json({ success: false, error: '指派负责人失败' });
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
 * 转换线索为用户 (Admin)
 */
export async function convertLeadToUser(req: Request, res: Response) {
    try {
        const id = req.params.id as string;
        const { email, password } = req.body;

        if (!email || !password) return res.status(400).json({ success: false, error: '邮箱和密码不能为空' });

        const passwordHash = await hashPassword(password);
        const result = await LeadService.convertLeadToUser(id, email, passwordHash);
        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Convert Lead Error:', error);
        res.status(500).json({ success: false, error: error.message || '转换失败' });
    }
}
