// src/components/PointsBadge.tsx
// 积分消耗徽章组件：显示 AI 功能所需积分数量

import React, { useEffect, useState, useMemo } from 'react';
import { Coins } from 'lucide-react';
import { getPointsRule, PointsActionCode, PointsRule } from '../api/points';

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
    const [rule, setRule] = useState<PointsRule | null>(null);
    const unitCost = rule?.costPoints ?? null;
    const cost = unitCost !== null ? unitCost * multiplier : null;

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

    const tooltipText = useMemo(() => {
        if (!rule) return `此操作消耗 ${cost || '?'} 积分`;
        const parts = [
            `${rule.name}: 消耗 ${cost} 积分`,
            rule.calculationMethod ? `计算方式: ${rule.calculationMethod}` : null,
            rule.deductionLogic ? `扣费逻辑: ${rule.deductionLogic}` : (rule.description || null)
        ].filter(Boolean);
        return parts.join('\n');
    }, [rule, cost]);

    if (cost === null || cost === 0) {
        return null;
    }

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 ${className}`}
                title={tooltipText}
            >
                {showIcon && <Coins size={10} />}
                {cost}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold 
                bg-gradient-to-r from-amber-50 to-orange-50 
                text-amber-700 border border-amber-200/50
                shadow-sm ${className}`}
            title={tooltipText}
        >
            {showIcon && <Coins size={11} className="text-amber-500" />}
            <span>{cost}</span>
        </span>
    );
};

/**
 * 积分消耗提示 Hook
 * 用于在组件内获取操作消耗
 */
export function usePointsCost(actionCode: PointsActionCode, fresh: boolean = false): number | null {
    const [cost, setCost] = useState<number | null>(null);

    useEffect(() => {
        getPointsRule(actionCode, fresh)
            .then(rule => setCost(rule?.costPoints ?? null))
            .catch(() => setCost(null));
    }, [actionCode, fresh]);

    return cost;
}

export default PointsBadge;
