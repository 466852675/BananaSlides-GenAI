// server/src/controllers/points.controller.ts
// 积分控制器：处理用户积分相关 HTTP 请求

import { Request, Response } from 'express';
import { prisma } from '../db';
import * as PointsService from '../services/points.service';

/**
 * 获取当前用户积分余额
 * GET /api/points/balance
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true, pointsUsed: true },
        });

        if (!user) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '用户不存在' }
            });
            return;
        }

        res.json({
            success: true,
            data: {
                balance: user.points,
                used: user.pointsUsed,
            }
        });
    } catch (error) {
        console.error('[Points] 获取余额失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取余额失败' }
        });
    }
}

/**
 * 获取积分交易历史
 * GET /api/points/transactions
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.id;
        const { page = '1', limit = '20', search, type, module, category, startDate, endDate, dateField, sortOrder } = req.query;

        const result = await PointsService.getTransactionHistory(
            userId,
            parseInt(page as string, 10) || 1,
            Math.min(parseInt(limit as string, 10) || 20, 100),
            search as string | undefined,
            type as string | undefined,
            module as string | undefined,
            category as string | undefined,
            startDate as string | undefined,
            endDate as string | undefined,
            dateField as 'createdAt' | 'triggerTime' | undefined,
            sortOrder as 'asc' | 'desc' | undefined
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Points] 获取交易历史失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取交易历史失败' }
        });
    }
}

/**
 * 获取积分规则列表（公开）
 * GET /api/points/rules
 */
export async function getRules(req: Request, res: Response): Promise<void> {
    try {
        const rules = await prisma.pointsRule.findMany({
            where: { isActive: true },
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                module: true,
                category: true,
                costPoints: true,
                costType: true,
                calculationMethod: true,
                deductionLogic: true,
                isActive: true,
                sortOrder: true,
                effectiveAt: true,
                createdAt: true,
                User: {
                    select: {
                        nickname: true,
                        avatar: true,
                    }
                }
            },
            orderBy: { sortOrder: 'asc' },
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        console.error('[Points] 获取积分规则失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '获取积分规则失败' }
        });
    }
}

/**
 * 检查操作所需积分
 * GET /api/points/check/:actionCode
 */
export async function checkAction(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.id;
        const actionCode = req.params.actionCode as PointsService.PointsActionCode;

        const result = await PointsService.checkPoints(userId, actionCode);

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[Points] 检查积分失败:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: '检查积分失败' }
        });
    }
}
/**
 * 扣除积分
 * POST /api/points/deduct
 */
export async function deductPoints(req: Request, res: Response): Promise<void> {
    try {
        const userId = req.user!.id;
        const { actionCode, projectId, description, module, category, subcategory, triggerTime } = req.body;

        if (!actionCode) {
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAM', message: '缺少 actionCode' }
            });
            return;
        }

        const result = await PointsService.deductPoints(
            userId,
            actionCode,
            projectId,
            description,
            1, // multiplier, default 1 for now or passed from body? Assuming 1 for compatibility or add multiplier to body later if needed.
            {
                module,
                category,
                subcategory,
                triggerTime: triggerTime ? new Date(triggerTime) : undefined
            }
        );

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.warn('[Points] 扣分失败:', error.message);

        if (error.message && error.message.includes('不足')) {
            res.status(402).json({
                success: false,
                error: { code: 'INSUFFICIENT_POINTS', message: error.message }
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message || '扣分失败' }
        });
    }
}
