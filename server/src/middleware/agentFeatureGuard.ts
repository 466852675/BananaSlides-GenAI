// server/src/middleware/agentFeatureGuard.ts
// Agent 功能 API 守卫中间件

import { Request, Response, NextFunction } from 'express';
import { SettingService } from '../services/setting.service';

/**
 * 创建 Agent 功能守卫中间件
 * 当 Agent 模式被禁用时，所有 agent API 返回 403
 */
export function agentFeatureGuard() {
    return async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const config = await SettingService.getAgentFeatureConfig();

            if (!config.enabled) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FEATURE_DISABLED',
                        message: 'Agent 模式已关闭'
                    }
                });
                return;
            }

            next();
        } catch (error) {
            console.error('[AgentFeatureGuard] 检查失败:', error);
            res.status(500).json({
                success: false,
                error: { code: 'GUARD_ERROR', message: '系统内部错误' }
            });
        }
    };
}