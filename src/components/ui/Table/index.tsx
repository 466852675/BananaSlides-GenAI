import React from 'react';

export interface Column<T> {
    key: string;
    title: string;
    width?: string | number;
    render?: (record: T, index: number) => React.ReactNode;
    sorter?: (a: T, b: T) => number;
}

export interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    rowKey?: string | ((record: T) => string);
    pagination?: {
        current: number;
        pageSize: number;
        total: number;
        onChange: (page: number) => void;
    };
    onRowClick?: (record: T) => void;
    emptyText?: string;
}

export function Table<T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    rowKey = 'id',
    pagination,
    onRowClick,
    emptyText = '暂无数据'
}: TableProps<T>) {
    const getRowKey = (record: T, index: number): string => {
        if (typeof rowKey === 'function') {
            return rowKey(record);
        }
        return record[rowKey] || String(index);
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    style={{ width: column.width }}
                                >
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                                    {emptyText}
                                </td>
                            </tr>
                        ) : (
                            data.map((record, index) => (
                                <tr
                                    key={getRowKey(record, index)}
                                    onClick={() => onRowClick?.(record)}
                                    className={onRowClick ? 'hover:bg-gray-50 cursor-pointer transition-colors' : ''}
                                >
                                    {columns.map((column) => (
                                        <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {column.render
                                                ? column.render(record, index)
                                                : record[column.key]
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {pagination && (
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="text-sm text-gray-700">
                        共 {pagination.total} 条记录
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => pagination.onChange(pagination.current - 1)}
                            disabled={pagination.current <= 1}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            上一页
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                            第 {pagination.current} 页
                        </span>
                        <button
                            onClick={() => pagination.onChange(pagination.current + 1)}
                            disabled={pagination.current * pagination.pageSize >= pagination.total}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
