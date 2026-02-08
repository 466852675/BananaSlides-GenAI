import React from 'react';

interface AdminDataTableProps {
    columns: {
        header: string;
        key: string;
        className?: string;
        render?: (row: any) => React.ReactNode;
        width?: string;
    }[];
    data: any[];
    isLoading?: boolean;
    onRowClick?: (row: any) => void;
    emptyState?: React.ReactNode;
    // Selection support
    selectable?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    idKey?: string; // Default to 'id'
}

export const AdminDataTable: React.FC<AdminDataTableProps> = ({
    columns,
    data,
    isLoading,
    onRowClick,
    emptyState,
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    idKey = 'id'
}) => {
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectionChange?.(data.map(item => String(item[idKey])));
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleSelectRow = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
        e.stopPropagation();
        if (e.target.checked) {
            onSelectionChange?.([...selectedIds, id]);
        } else {
            onSelectionChange?.(selectedIds.filter(sid => sid !== id));
        }
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[400px]">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100/60 bg-slate-50/50">
                            {selectable && (
                                <th className="px-3 py-3 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={data.length > 0 && selectedIds.length === data.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={`text-left text-[11px] font-black text-slate-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap ${col.className || ''}`}
                                    style={{ width: col.width }}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-600 border-t-transparent" />
                                        <span className="text-xs font-bold text-slate-400">加载中...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-20 text-center">
                                    {emptyState || (
                                        <div className="text-slate-400 flex flex-col items-center gap-2">
                                            <span className="font-bold text-sm">暂无数据</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => {
                                const rowId = String(row[idKey]);
                                const isSelected = selectedIds.includes(rowId);
                                return (
                                    <tr
                                        key={idx}
                                        onClick={() => onRowClick?.(row)}
                                        className={`
                                            group transition-colors
                                            ${isSelected ? 'bg-blue-100/20' : ''}
                                            ${onRowClick ? 'cursor-pointer hover:bg-blue-50/30' : 'hover:bg-blue-50/30'}
                                        `}
                                    >
                                        {selectable && (
                                            <td className="px-3 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => handleSelectRow(e, rowId)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {columns.map((col, cIdx) => (
                                            <td key={cIdx} className={`px-4 py-3 ${col.className || ''}`}>
                                                {col.render ? col.render(row) : (
                                                    <span className="text-[13px] font-medium text-slate-600">
                                                        {row[col.key] ?? '-'}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
