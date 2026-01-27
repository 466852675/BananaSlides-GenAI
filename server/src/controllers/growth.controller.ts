
import { Request, Response } from 'express';
import { growthService } from '../services/growth.service';

/**
 * GET /api/growth/status
 */
export async function getCheckInStatus(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const status = await growthService.getCheckInStatus(userId);
        res.json({ success: true, data: status });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
}

/**
 * POST /api/growth/check-in
 */
export async function checkIn(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const result = await growthService.dailyCheckIn(userId);
        res.json({ success: true, data: result });
    } catch (e: any) {
        if (e.message === 'ALREADY_CHECKED_IN') {
            return res.status(400).json({ success: false, error: { code: 'ALREADY_CHECKED_IN', message: '今天已经签到过了' } });
        }
        res.status(500).json({ success: false, error: e.message });
    }
}

/**
 * POST /api/growth/bind-referral
 */
export async function bindReferral(req: Request, res: Response) {
    try {
        const { inviteCode } = req.body;
        const userId = req.user!.id;
        await growthService.bindReferral(userId, inviteCode);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
}
