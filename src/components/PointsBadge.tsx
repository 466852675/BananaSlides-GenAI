// src/components/PointsBadge.tsx
// 积分消耗徽章组件：显示 AI 功能所需积分数量

import React, { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { getActionCost, PointsActionCode } from '../api/points';

interface PointsBadgeProps {
    actionCode: PointsActionCode;
    className?: string;
    compact?: boolean; // 紧凑模式只显示数字
    showIcon?: boolean;
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
}) => {
    const [cost, setCost] = useState<number | null>(null);

    useEffect(() => {

        getActionCost(actionCode)
            .then(result => {
                setCost(result);
            })
            .catch((err) => {
                console.error('[PointsBadge] Error fetching cost:', err);
                setCost(null);
            });
    }, [actionCode]);



    if (cost === null || cost === 0) {
        return null;
    }

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 ${className}`}
                title={`消耗 ${cost} 积分`}
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
            title={`此操作消耗 ${cost} 积分`}
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
export function usePointsCost(actionCode: PointsActionCode): number | null {
    const [cost, setCost] = useState<number | null>(null);

    useEffect(() => {
        getActionCost(actionCode)
            .then(setCost)
            .catch(() => setCost(null));
    }, [actionCode]);

    return cost;
}

export default PointsBadge;
