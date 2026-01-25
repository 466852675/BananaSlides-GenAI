import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as PointsApi from '../../api/points';
import { Loader2, X, Coins, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

interface PointsHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PointsHistory: React.FC<PointsHistoryProps> = ({ isOpen, onClose }) => {
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['points-history', page],
        queryFn: () => PointsApi.getTransactions(page, 10),
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Coins className="text-amber-500" size={20} /> 积分明细
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-purple-600" /></div>
                    ) : (
                        <div className="space-y-3">
                            {data?.items.map((item) => (
                                <div key={item.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.amount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {item.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-800">{item.description}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock size={10} />
                                                {new Date(item.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${item.amount > 0 ? 'text-amber-600' : 'text-gray-800'}`}>
                                            {item.amount > 0 ? '+' : ''}{item.amount}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            余额: {item.balance}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!data?.items || data.items.length === 0) && (
                                <div className="text-center py-8 text-gray-400">暂无积分记录</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                    <div>共 {data?.total || 0} 条</div>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            上一页
                        </button>
                        <button
                            className="px-3 py-1 border border-gray-200 rounded hover:bg-white disabled:opacity-50"
                            disabled={!data || data.items.length < 10} // Simple check, ideally check total pages
                            onClick={() => setPage(p => p + 1)}
                        >
                            下一页
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
