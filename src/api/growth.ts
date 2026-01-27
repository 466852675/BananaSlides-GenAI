// src/api/growth.ts
import { client } from './client';

export interface CheckInStatus {
    lastCheckIn: string | null;
    streak: number;
    canCheckIn: boolean;
    rewardToday: number;
}

export interface CheckInLog {
    id: string;
    date: string;
    points: number;
    streak: number;
    createdAt: string;
}

/**
 * 获取用户签到状态
 */
export async function getCheckInStatus(): Promise<CheckInStatus> {
    const res = await client.get('/growth/checkin/status') as any;
    return res.data;
}

/**
 * 执行每日签到
 */
export async function performCheckIn(): Promise<{ points: number; streak: number }> {
    const res = await client.post('/growth/checkin') as any;
    return res.data;
}

/**
 * 获取签到历史
 */
export async function getCheckInLogs(): Promise<CheckInLog[]> {
    const res = await client.get('/growth/checkin/logs') as any;
    return res.data;
}

/**
 * 绑定邀请码
 */
export async function bindReferral(code: string): Promise<void> {
    await client.post('/growth/referral/bind', { code });
}

/**
 * 获取邀请记录
 */
export async function getReferrals(): Promise<any[]> {
    const res = await client.get('/growth/referrals') as any;
    return res.data;
}
