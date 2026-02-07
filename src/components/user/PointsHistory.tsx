import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import * as PointsApi from '../../api/points';
import { Loader2, X, Coins, Calendar, Search, Filter, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Sparkles, MonitorPlay } from 'lucide-react';

interface PointsHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

// 辅助函数：解析描述 JSON
const parseDescription = (desc: string, itemCreatedAt: string) => {
    try {
        if (!desc.trim().startsWith('{')) throw new Error();
        const data = JSON.parse(desc);
        return {
            module: data.module || '-',
            category: data.category || '-',
            subCategory: data.subcategory || '-',
            detail: data.details || data.text || '-',
            triggerTime: data.triggerTime || itemCreatedAt, // 如果没有记录触发时间，默认等于创建时间
            successTime: data.successTime || itemCreatedAt
        };
    } catch (e) {
        // Fallback for legacy plain text data
        return {
            module: '-',
            category: '通用',
            subCategory: '-',
            detail: desc,
            triggerTime: itemCreatedAt,
            successTime: itemCreatedAt
        };
    }
};

const formatTime = (time: string | number) => {
    if (!time) return '-';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

export const PointsHistory: React.FC<PointsHistoryProps> = ({ isOpen, onClose }) => {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('');
    // New Filters
    const [filterModule, setFilterModule] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');
    const [filterDateField, setFilterDateField] = useState<'createdAt' | 'triggerTime'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { data, isLoading } = useQuery({
        queryKey: ['points-history', page, searchTerm, filterType, filterModule, filterCategory, filterStartDate, filterEndDate, filterDateField, sortOrder],
        queryFn: () => PointsApi.getTransactions(
            page,
            10,
            searchTerm,
            filterType,
            filterModule,
            filterCategory,
            filterStartDate,
            filterEndDate,
            filterDateField,
            sortOrder
        ),
        enabled: isOpen,
    });

    // Reset handler
    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterType('');
        setFilterModule('');
        setFilterCategory('');
        setFilterStartDate('');
        setFilterEndDate('');
        setFilterDateField('createdAt');
        setSortOrder('desc');
        setPage(1);
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1400px] flex flex-col h-[90vh] overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                            <Coins size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">积分明细账单</h2>
                            <p className="text-xs text-slate-400 mt-0.5">查看您所有的积分详细收支记录</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar - Optimized Grid Layout */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-3 shrink-0">
                    {/* Search */}
                    <div className="relative group w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="搜索描述..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Filters Group */}
                    <div className="flex items-center gap-2">
                        {/* Type Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium cursor-pointer"
                            value={filterType}
                            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                        >
                            <option value="">全部类型</option>
                            <option value="consume">支出</option>
                            <option value="recharge">充值</option>
                            <option value="reward">奖励</option>
                            <option value="refund">退款</option>
                        </select>

                        {/* Module Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium cursor-pointer"
                            value={filterModule}
                            onChange={(e) => { setFilterModule(e.target.value); setPage(1); }}
                        >
                            <option value="">全部板块</option>
                            <option value="创作室">创作室</option>
                            <option value="模版间">模版间</option>
                            <option value="系统操作">系统操作</option>
                        </select>

                        {/* Category Filter */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium cursor-pointer"
                            value={filterCategory}
                            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                        >
                            <option value="">全部分类</option>
                            <option value="文本生成">文本生成</option>
                            <option value="图片生成">图片生成</option>
                            <option value="视觉分析">视觉分析</option>
                            <option value="风格应用">风格应用</option>
                            <option value="充值">充值</option>
                        </select>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    {/* Date & Sort Group */}
                    <div className="flex items-center gap-2">
                        {/* Date Field Select */}
                        <select
                            className="bg-white border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-medium cursor-pointer"
                            value={filterDateField}
                            onChange={(e) => { setFilterDateField(e.target.value as 'createdAt' | 'triggerTime'); setPage(1); }}
                        >
                            <option value="createdAt">完成时间</option>
                            <option value="triggerTime">触发时间</option>
                        </select>

                        {/* Date Range */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg p-1">
                            <Calendar size={14} className="ml-1 text-slate-400" />
                            <input
                                type="date"
                                className="outline-none bg-transparent w-24 cursor-pointer"
                                value={filterStartDate}
                                onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }}
                            />
                            <span>-</span>
                            <input
                                type="date"
                                className="outline-none bg-transparent w-24 cursor-pointer"
                                value={filterEndDate}
                                onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }}
                            />
                        </div>

                        {/* Sort Toggle */}
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-500 transition-colors flex items-center justify-center w-8 h-8"
                            title={sortOrder === 'asc' ? "当前：时间正序" : "当前：时间倒序"}
                        >
                            {sortOrder === 'asc' ? (
                                <ChevronRight size={14} className="rotate-[-90deg]" />
                            ) : (
                                <ChevronRight size={14} className="rotate-90" />
                            )}
                        </button>
                    </div>

                    {/* Reset Button */}
                    {(searchTerm || filterType || filterModule || filterCategory || filterStartDate || filterEndDate || filterDateField !== 'createdAt' || sortOrder !== 'desc') && (
                        <button
                            onClick={handleResetFilters}
                            className="ml-auto text-xs text-blue-500 hover:text-blue-700 font-medium px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                            重置筛选
                        </button>
                    )}
                </div>

                {/* Table Content */}
                <div className="flex-1 overflow-auto bg-slate-50/30">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider shadow-sm">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center text-slate-400">序号</th>
                                <th className="px-4 py-3 w-28">一级板块</th>
                                <th className="px-4 py-3 w-28">二级分类</th>
                                <th className="px-4 py-3 w-28">三级板块</th>
                                <th className="px-4 py-3">详细描述</th>
                                <th className="px-4 py-3 w-32 whitespace-nowrap">关联 ID</th>
                                <th className="px-4 py-3 w-36 whitespace-nowrap">点击触发时间</th>
                                <th className="px-4 py-3 w-36 whitespace-nowrap">生成成功时间</th>
                                <th className="px-4 py-3 w-24 text-right">变动积分</th>
                                <th className="px-4 py-3 w-24 text-right">剩余积分</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="animate-spin text-blue-500" size={32} />
                                            <span className="text-slate-400 text-sm">加载记录中...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (!data?.items || data.items.length === 0) ? (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-50">
                                            <FileText size={48} className="text-slate-300" />
                                            <span className="text-slate-500 text-sm">暂无相关记录</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.items.map((item, index) => {
                                    // 优先使用新字段，如果没有则尝试解析 description（兼容旧数据）
                                    let info = {
                                        module: item.module || '-',
                                        category: item.category || '-',
                                        subCategory: item.subcategory || '-',
                                        detail: item.description || '-',
                                        triggerTime: item.triggerTime || item.createdAt,
                                        successTime: item.completedAt || null
                                    };

                                    // 如果字段为空，尝试解析旧的 JSON description (Fallback)
                                    if ((!item.module || item.module === '-') && item.description && item.description.trim().startsWith('{')) {
                                        try {
                                            const json = JSON.parse(item.description);
                                            info = {
                                                module: json.module || '-',
                                                category: json.category || '-',
                                                subCategory: json.subcategory || '-',
                                                detail: json.details || json.text || '-',
                                                triggerTime: json.triggerTime || item.createdAt,
                                                successTime: item.completedAt || json.successTime || null
                                            };
                                        } catch (e) {
                                            // Ignore parse error
                                        }
                                    }

                                    // 兼容旧数据的显示逻辑（如管理员加分/扣分）
                                    // 迁移后，module 应为 '系统操作' 或空 (如果是极旧数据未被脚本覆盖)
                                    if ((info.module === '-' || info.module === '系统') && (item.type === 'reward' || item.type === 'adjust' || item.description?.includes('管理员'))) {
                                        info.module = '系统操作';
                                        info.category = item.amount > 0 ? '奖励' : '扣除';
                                    }

                                    // 移除之前的临时映射逻辑，因为现在应当直接处理或由上方逻辑覆盖

                                    const isPositive = item.amount > 0;
                                    const rowIndex = (page - 1) * 10 + index + 1;

                                    // Determine ID to display with prefix
                                    let idPrefix = '';
                                    let rawId = '-';

                                    if (info.module === '模版间') {
                                        rawId = item.templateId || item.projectId || '-';
                                        if (rawId !== '-') idPrefix = '模版';
                                    } else {
                                        rawId = item.projectId || '-';
                                        if (rawId !== '-') idPrefix = '项目';
                                    }

                                    const shortId = rawId !== '-' && rawId.length > 8 ? rawId.substring(0, 8) + '...' : rawId;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-4 py-2.5 text-xs text-slate-400 text-center font-mono">
                                                {rowIndex}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-white transition-colors">
                                                    <MonitorPlay size={9} className="opacity-50" />
                                                    {info.module}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-white transition-colors">
                                                    {info.category === '图片生成' ? <ImageIcon size={9} className="opacity-50" /> : <Sparkles size={9} className="opacity-50" />}
                                                    {info.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{info.subCategory}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-700 font-medium max-w-xs truncate" title={info.detail}>
                                                {info.detail}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-400 font-mono" title={rawId !== '-' ? rawId : undefined}>
                                                {rawId !== '-' ? (
                                                    <span>
                                                        <span className="text-slate-300 mr-1">{idPrefix}</span>
                                                        {shortId}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap font-mono">{formatTime(info.triggerTime)}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-400 whitespace-nowrap font-mono">{formatTime(info.successTime)}</td>
                                            <td className={`px-4 py-2.5 text-xs font-bold text-right ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {isPositive ? '+' : ''}{item.amount}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-slate-600 text-right font-mono">
                                                {item.balance}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination - Updated Layout */}
                <div className="px-8 py-3 border-t border-slate-100 bg-white flex items-center justify-center shrink-0 relative">
                    {/* Left: Total Count */}
                    <div className="absolute left-8 text-sm text-slate-500 font-medium">
                        共 <span className="text-slate-800 font-bold">{data?.total || 0}</span> 条记录
                    </div>

                    {/* Center: Pagination Controls */}
                    <div className="flex items-center gap-4">
                        <button
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all text-slate-600"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                            title="上一页"
                        >
                            <ChevronLeft size={16} strokeWidth={2} />
                        </button>

                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                            <span className="text-xs font-bold text-slate-600 px-3 cursor-default">
                                第 {page} 页
                            </span>
                        </div>

                        <button
                            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all text-slate-600"
                            disabled={!data || data.items.length < 10 || (data.total && page * 10 >= data.total)}
                            onClick={() => setPage(p => p + 1)}
                            title="下一页"
                        >
                            <ChevronRight size={16} strokeWidth={2} />
                        </button>
                    </div>

                    {/* Jump to Page - Right Side */}
                    <div className="absolute right-8 flex items-center gap-2">
                        <span className="text-xs text-slate-400">前往</span>
                        <input
                            type="number"
                            className="w-10 h-7 border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            min={1}
                            max={data?.total ? Math.ceil(data.total / 10) : 999}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = parseInt(e.currentTarget.value);
                                    if (!isNaN(val) && val > 0) {
                                        setPage(val);
                                    }
                                }
                            }}
                        />
                        <span className="text-xs text-slate-400">页</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
