import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
    currentPage: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}

export const AdminPagination: React.FC<AdminPaginationProps> = ({
    currentPage,
    total,
    pageSize,
    onPageChange
}) => {
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100/60 bg-slate-50/30 overflow-hidden">
            <div className="text-sm text-slate-500 font-medium whitespace-nowrap">
                显示第 <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> 到 <span className="font-bold text-slate-800">{Math.min(total, currentPage * pageSize)}</span> 条，共 <span className="font-bold text-slate-800">{total}</span> 条
            </div>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-xs font-black text-violet-600">{currentPage}</span>
                    <span className="text-xs font-bold text-slate-300">/</span>
                    <span className="text-xs font-bold text-slate-500">{totalPages}</span>
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};
