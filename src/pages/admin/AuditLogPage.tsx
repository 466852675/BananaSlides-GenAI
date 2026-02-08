import React, { useState, useEffect } from 'react';
import { Table, Button, DateRangePicker, Select, Tag, Card } from '../../components/ui';
import { auditApi, AuditLog, AuditLogFilters } from '../../api/audit';
import { format } from 'date-fns';

const severityColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    low: 'default',
    medium: 'info',
    high: 'warning',
    critical: 'danger'
};

const severityLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
};

const typeLabels: Record<string, string> = {
    'ADMIN_LOGIN': '管理员登录',
    'ADMIN_ACTION': '管理操作',
    'AI_ENGINE_UPDATE': 'AI引擎更新',
    'POINTS_RULE_CHANGE': '积分规则变更',
    'USER_STATUS_CHANGE': '用户状态变更',
    'ORDER_REFUND': '订单退款',
    'PERMISSION_CHANGE': '权限变更',
    'CONTENT_VIOLATION': '内容违规',
    'PROMPT_INJECTION': '提示词注入',
    'RATE_LIMIT': '频率限制',
    'SUSPICIOUS_ACTIVITY': '可疑活动'
};

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });
    const [filters, setFilters] = useState<AuditLogFilters>({
        type: '',
        severity: '',
        startDate: '',
        endDate: '',
        keyword: ''
    });
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const fetchLogs = async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await auditApi.getAuditLogs({
                ...filters,
                page,
                limit: pagination.pageSize
            });
            setLogs(response.items);
            setPagination({
                ...pagination,
                current: page,
                total: response.pagination.total
            });
        } catch (error) {
            console.error('获取审计日志失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const handleSearch = () => {
        const newFilters: AuditLogFilters = {
            ...filters,
            startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
            endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
        };
        setFilters(newFilters);
        fetchLogs(1);
    };

    const handleReset = () => {
        setFilters({
            type: '',
            severity: '',
            startDate: '',
            endDate: '',
            keyword: ''
        });
        setStartDate(null);
        setEndDate(null);
        fetchLogs(1);
    };

    const columns = [
        {
            key: 'createdAt',
            title: '时间',
            width: 180,
            render: (record: AuditLog) => format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss')
        },
        {
            key: 'type',
            title: '类型',
            width: 150,
            render: (record: AuditLog) => (
                <span className="text-sm text-gray-900">
                    {typeLabels[record.type] || record.type}
                </span>
            )
        },
        {
            key: 'severity',
            title: '严重程度',
            width: 100,
            render: (record: AuditLog) => (
                <Tag variant={severityColors[record.severity]}>
                    {severityLabels[record.severity]}
                </Tag>
            )
        },
        {
            key: 'user',
            title: '操作人',
            width: 150,
            render: (record: AuditLog) => (
                <span className="text-sm text-gray-900">
                    {record.user?.nickname || record.user?.email || '系统'}
                </span>
            )
        },
        {
            key: 'reason',
            title: '描述',
            render: (record: AuditLog) => (
                <span className="text-sm text-gray-900 max-w-md truncate block">
                    {record.reason || record.content || '-'}
                </span>
            )
        },
        {
            key: 'ip',
            title: 'IP地址',
            width: 130,
            render: (record: AuditLog) => (
                <span className="text-sm text-gray-500 font-mono">
                    {record.ip || '-'}
                </span>
            )
        }
    ];

    const typeOptions = [
        { value: '', label: '全部类型' },
        { value: 'ADMIN_LOGIN', label: '管理员登录' },
        { value: 'ADMIN_ACTION', label: '管理操作' },
        { value: 'AI_ENGINE_UPDATE', label: 'AI引擎更新' },
        { value: 'POINTS_RULE_CHANGE', label: '积分规则变更' },
        { value: 'USER_STATUS_CHANGE', label: '用户状态变更' },
        { value: 'ORDER_REFUND', label: '订单退款' },
        { value: 'PERMISSION_CHANGE', label: '权限变更' },
        { value: 'CONTENT_VIOLATION', label: '内容违规' },
        { value: 'PROMPT_INJECTION', label: '提示词注入' },
        { value: 'RATE_LIMIT', label: '频率限制' },
        { value: 'SUSPICIOUS_ACTIVITY', label: '可疑活动' }
    ];

    const severityOptions = [
        { value: '', label: '全部等级' },
        { value: 'low', label: '低' },
        { value: 'medium', label: '中' },
        { value: 'high', label: '高' },
        { value: 'critical', label: '严重' }
    ];

    return (
        <div className="space-y-6">
            <Card title="审计日志查询">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">日志类型</label>
                        <Select
                            value={filters.type}
                            onChange={(value) => setFilters({ ...filters, type: value })}
                            options={typeOptions}
                            placeholder="选择类型"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">严重程度</label>
                        <Select
                            value={filters.severity}
                            onChange={(value) => setFilters({ ...filters, severity: value })}
                            options={severityOptions}
                            placeholder="选择等级"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">关键词</label>
                        <input
                            type="text"
                            value={filters.keyword}
                            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                            placeholder="搜索描述内容"
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">时间范围</label>
                        <DateRangePicker
                            startDate={startDate}
                            endDate={endDate}
                            onStartDateChange={setStartDate}
                            onEndDateChange={setEndDate}
                        />
                    </div>
                </div>
                <div className="flex space-x-3">
                    <Button onClick={handleSearch} variant="primary">
                        查询
                    </Button>
                    <Button onClick={handleReset} variant="ghost">
                        重置
                    </Button>
                </div>
            </Card>

            <Card title={`日志列表（共 ${pagination.total} 条）`}>
                <Table
                    columns={columns}
                    data={logs}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        onChange: (page) => fetchLogs(page)
                    }}
                />
            </Card>
        </div>
    );
};

export default AuditLogPage;
