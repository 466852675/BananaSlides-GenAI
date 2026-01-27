
import { PrismaClient } from '@prisma/client';
import { addPoints, getActionCost } from './points.service';
import * as AdminService from './admin.service';

const prisma = new PrismaClient();

export const growthService = {
    /**
     * getCheckInStatus
     * Get today's check-in status and streak info
     */
    async getCheckInStatus(userId: string) {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastLog = await prisma.checkInLog.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: todayStr
                }
            }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { checkInStreak: true, checkInDate: true }
        });

        return {
            checkedIn: !!lastLog,
            streak: user?.checkInStreak || 0,
            today: todayStr
        };
    },

    /**
     * dailyCheckIn
     * Execute daily check-in with tiered rewards
     */
    async dailyCheckIn(userId: string) {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Check if already checked in
        const existingLog = await prisma.checkInLog.findUnique({
            where: {
                userId_date: { userId, date: todayStr }
            }
        });
        if (existingLog) {
            throw new Error('ALREADY_CHECKED_IN');
        }

        // 2. Get User Streak Info
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('USER_NOT_FOUND');

        // Logic: specific date check (yesterday)
        // If last check-in was yesterday, streak++, else streak=1
        // Simple logic: check difference in days
        let newStreak = 1;
        if (user.checkInDate) {
            const lastDate = new Date(user.checkInDate);
            const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Note: This needs careful "calendar day" logic, simplified here as < 48h check roughly
            // Better: compare ISO date strings
            const lastDateStr = lastDate.toISOString().split('T')[0];
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

            if (lastDateStr === yesterdayStr) {
                newStreak = user.checkInStreak + 1;
            } else if (lastDateStr === todayStr) {
                // Should be caught by CheckInLog check, but safety net
                newStreak = user.checkInStreak;
            }
        }

        // 3. Calculate Reward (Dynamic from PointsRule)
        const [baseRuleCost, bonus3Cost, bonus7Cost] = await Promise.all([
            getActionCost('daily_checkin' as any),
            getActionCost('checkin_bonus_3' as any),
            getActionCost('checkin_bonus_7' as any)
        ]);

        let reward = baseRuleCost || 50; // Base (default 50)
        let description = '每日签到';

        // Add bonus based on streak
        if (newStreak % 7 === 3) {
            const bonus = bonus3Cost || 50;
            reward += bonus;
            description += ` (连签3天奖励 +${bonus})`;
        } else if (newStreak % 7 === 0) {
            const bonus = bonus7Cost || 200;
            reward += bonus;
            description += ` (连签7天奖励 +${bonus})`;
        }

        // 4. Transaction execution
        return await prisma.$transaction(async (tx) => {
            // Create Log
            await tx.checkInLog.create({
                data: {
                    userId,
                    date: todayStr,
                    points: reward,
                    streak: newStreak
                }
            });

            // Update User
            await tx.user.update({
                where: { id: userId },
                data: {
                    checkInDate: new Date(),
                    checkInStreak: newStreak,
                    points: { increment: reward }
                }
            });

            // Add Transaction Record (using raw create to be in same tx)
            await tx.transaction.create({
                data: {
                    userId,
                    type: 'reward',
                    amount: reward,
                    balance: user.points + reward,
                    description,
                    module: '增长',
                    category: '签到'
                }
            });

            return { success: true, points: reward, streak: newStreak };
        });
    },

    /**
     * bindReferral
     * Bind referral code and grant rewards
     */
    async bindReferral(userId: string, targetInviteCode: string) {
        if (!targetInviteCode) return { success: false };

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.invitedById) {
            return { success: false, message: 'Already bound or invalid user' };
        }

        // Find referrer
        const referrer = await prisma.user.findUnique({
            where: { inviteCode: targetInviteCode }
        });

        if (!referrer || referrer.id === userId) {
            throw new Error('INVALID_INVITE_CODE');
        }

        // --- Risk Control (Check IP/Device limit would go here) ---

        // Exec Transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update invitee
            await tx.user.update({
                where: { id: userId },
                data: { invitedById: referrer.id }
            });

            // 2. Grant reward to referrer (Read from GlobalConfig or default 200)
            const settings = await AdminService.getAllSettings();
            const referralReward = parseInt(settings.REFERRAL_POINTS || '200', 10);

            await tx.user.update({
                where: { id: referrer.id },
                data: { points: { increment: referralReward } }
            });

            await tx.transaction.create({
                data: {
                    userId: referrer.id,
                    type: 'reward',
                    amount: referralReward,
                    balance: referrer.points + referralReward,
                    description: `邀请好友注册奖励 (${user.nickname || '新用户'})`,
                    module: '增长',
                    category: '拉新'
                }
            });
        });

        return { success: true };
    }
};
