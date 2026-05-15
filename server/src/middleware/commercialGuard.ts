// server/src/middleware/commercialGuard.ts
// 商业化功能 API 守卫中间件

import { Request, Response, NextFunction } from 'express';
import { SettingService } from '../services/setting.service';

// 商业化模块标识列表
export const COMMERCIAL_MODULES = [
    'points',
    'checkin',
    'invite',
    'purchase',
    'orders',
    'refunds',
    'leads',
    'points-rules',
    'growth',
    'pricing',
] as const;

export type CommercialModule = typeof COMMERCIAL_MODULES[number];

/**
 * 创建商业化模块守卫中间件
 * @param moduleId 模块标识
 * @param isAdminRoute 是否为管理后台路由（管理端返回友好提示，用户端返回 404）
 */
export function commercialGuard(moduleId: CommercialModule, isAdminRoute: boolean = false) {
    return async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const config = await SettingService.getCommercialConfig();

            // 如果商业化已关闭，所有模块默认禁用（除非不在 disabledModules 中）
            if (!config.enabled) {
                const isDisabled = config.disabledModules.length === 0 || config.disabledModules.includes(moduleId);
                if (isDisabled) {
                    if (isAdminRoute) {
                        // 管理后台：返回友好提示
                        res.status(200).json({
                            success: false,
                            disabled: true,
                            error: {
                                code: 'FEATURE_DISABLED',
                                message: '该功能已关闭，如需使用请在系统设置中开启'
                            }
                        });
                    } else {
                        // 用户端：返回 404
                        res.status(404).json({
                            success: false,
                            error: {
                                code: 'FEATURE_DISABLED',
                                message: '功能未开启'
                            }
                        });
                    }
                    return;
                }
            }

            next();
        } catch (error) {
            console.error('[CommercialGuard] 检查失败:', error);
            res.status(500).json({
                success: false,
                error: { code: 'GUARD_ERROR', message: '系统内部错误' }
            });
        }
    };
}