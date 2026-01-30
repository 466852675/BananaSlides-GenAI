
// src/components/PointsBadge.tsx
// 积分消耗徽章组件：显示 AI 功能所需积分数量 (支持 VIP 优惠双显)

import React, { useEffect, useState, useMemo } from 'react';
import { Coins, Crown } from 'lucide-react';
import { getPointsRule, PointsActionCode, PointsRule } from '../api/points';
import { useAuth } from '../contexts/AuthContext';

interface PointsBadgeProps {
    actionCode: PointsActionCode;
    className?: string;
    compact?: boolean; // 紧凑模式只显示数字
    showIcon?: boolean;
    fresh?: boolean; // 是否绕过缓存实时获取
    multiplier?: number; // 倍数，用于批量操作显示总分
}

/**
 * 积分消耗徽章
 * 在 AI 功能按钮旁显示需要消耗的积分数量
 * 
 * 示例：
 * <PointsBadge actionCode="outline_generation" />
 * <PointsBadge actionCode="vision_analyze" compact />
 */
export const PointsBadge: React.FC<PointsBadgeProps> = ({
    actionCode,
    className = '',
    compact = false,
    showIcon = true,
    fresh = false,
    multiplier = 1,
}) => {
    const { user } = useAuth();
    const [rule, setRule] = useState<PointsRule | null>(null);

    // 判断用户是否为有效 VIP
    const isVip = useMemo(() => {
        if (!user || user.vipLevel <= 0) return false;
        if (!user.vipExpiresAt) return true; // 永久 VIP 或无过期时间
        return new Date(user.vipExpiresAt) > new Date();
    }, [user]);

    useEffect(() => {
        getPointsRule(actionCode, fresh)
            .then(result => {
                setRule(result);
            })
            .catch((err) => {
                console.error('[PointsBadge] Error fetching rule:', err);
                setRule(null);
            });
    }, [actionCode, fresh]);

    // 计算价格
    const pricing = useMemo(() => {
        if (!rule) return { final: null, original: null, isDiscounted: false };

        const standard = rule.costPoints * multiplier;
        // 如果是 VIP 且规则配置了 vipCostPoints
        let vipPrice = null;

        if (rule.vipCostPoints !== undefined && rule.vipCostPoints !== null) {
            vipPrice = rule.vipCostPoints * multiplier;
        }

        if (isVip && vipPrice !== null) {
            return {
                final: vipPrice,
                original: standard,
                isDiscounted: vipPrice < standard
            };
        }

        return {
            final: standard,
            original: standard,
            isDiscounted: false
        };
    }, [rule, isVip, multiplier]);


    const tooltipText = useMemo(() => {
        if (!rule) return `此操作消耗 ${pricing.final || '?'} 积分`;

        const base = `${rule.name}: 消耗 ${pricing.final} 积分`;
        const extras = [
            pricing.isDiscounted ? `(原价 ${pricing.original} 积分，尊享 VIP 特惠)` : null,
            rule.calculationMethod ? `计算方式: ${rule.calculationMethod}` : null,
            rule.deductionLogic ? `扣费逻辑: ${rule.deductionLogic}` : (rule.description || null)
        ].filter(Boolean);

        return [base, ...extras].join('\n');
    }, [rule, pricing]);

    if (pricing.final === null) {
        return null;
    }

    // 免费显示
    if (pricing.final === 0) {
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 ${className}`} title={tooltipText}>
                {showIcon && "FREE"}
            </span>
        );
    }

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${pricing.isDiscounted ? 'text-violet-600' : 'text-amber-600'} ${className}`}
                title={tooltipText}
            >
                {showIcon && (pricing.isDiscounted ? <Crown size={10} className="text-violet-500" /> : <Coins size={10} />)}
                {pricing.final}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border shadow-sm transition-all
                ${pricing.isDiscounted
                    ? 'bg-violet-50 text-violet-700 border-violet-200/50'
                    : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200/50'
                } ${className}`}
            title={tooltipText}
        >
            {showIcon && (pricing.isDiscounted ? <Crown size={11} className="text-violet-500" /> : <Coins size={11} className="text-amber-500" />)}

            <div className="flex items-baseline gap-1">
                <span>{pricing.final}</span>
                {pricing.isDiscounted && (
                    <span className="text-[9px] text-slate-400 line-through opacity-70 decoration-slate-400">{pricing.original}</span>
                )}
            </div>
        </span>
    );
};

/**
 * 积分消耗提示 Hook (支持 VIP 自动计算)
 * 用于在组件内获取操作消耗
 */
export function usePointsCost(actionCode: PointsActionCode, fresh: boolean = false): number | null {
    const { user } = useAuth();
    const [cost, setCost] = useState<number | null>(null);

    useEffect(() => {
        getPointsRule(actionCode, fresh)
            .then(rule => {
                if (!rule) {
                    setCost(null);
                    return;
                }

                // VIP 判定逻辑复用
                const isVip = user && user.vipLevel > 0 && (!user.vipExpiresAt || new Date(user.vipExpiresAt) > new Date());

                if (isVip && rule.vipCostPoints !== undefined && rule.vipCostPoints !== null) {
                    setCost(rule.vipCostPoints);
                } else {
                    setCost(rule.costPoints);
                }
            })
            .catch(() => setCost(null));
    }, [actionCode, fresh, user]);

    return cost;
}

export default PointsBadge;
