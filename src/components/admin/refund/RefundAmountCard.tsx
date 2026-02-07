import React from 'react';
import { DollarSign, TrendingDown, RotateCcw, Percent } from 'lucide-react';

interface RefundAmountCardProps {
    refundAmount: number;
    originalOrderAmount: number;
}

export const RefundAmountCard: React.FC<RefundAmountCardProps> = ({ 
    refundAmount, 
    originalOrderAmount 
}) => {
    const refundRate = originalOrderAmount > 0 
        ? (refundAmount / originalOrderAmount) * 100 
        : 0;

    return (
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <DollarSign size={18} />
                金额概览
            </h3>
            
            <div className="space-y-4">
                {/* 退款金额 */}
                <div className="text-center py-2">
                    <div className="text-3xl font-black">¥{refundAmount.toFixed(2)}</div>
                    <div className="text-indigo-200 text-sm">退款金额</div>
                </div>

                {/* 明细列表 */}
                <div className="space-y-2 pt-2 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-indigo-200">订单原价</span>
                        <span className="font-medium">¥{originalOrderAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-indigo-200">退款金额</span>
                        <span className="font-bold text-emerald-300">-¥{refundAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-indigo-200">退款比例</span>
                        <span className="font-bold">{refundRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-indigo-200">手续费</span>
                        <span className="font-medium">¥0.00</span>
                    </div>
                </div>

                {/* 退还积分估算 */}
                <div className="pt-2 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-indigo-200 flex items-center gap-1.5">
                            <RotateCcw size={12} /> 退还积分
                        </span>
                        <span className="font-bold text-emerald-300">+{Math.floor(refundAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
