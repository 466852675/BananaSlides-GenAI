import React, { useState, useEffect } from 'react';
import { Table, Button, DateRangePicker, Select, Tag, Card } from '../../components/ui';
import { operationLogApi, OperationLog, OperationLogFilters } from '../../api/operation-log';
import { format } from 'date-fns';

const moduleLabels: Record<string, string> = {
    'users': '用户管理',
    'orders': '订单管理',
    'points-rules': '积分规则',
    'products': '商品管理',
    'ai-engine': 'AI引擎',
    'refunds': '退款管理',
    'roles': '角色权限'
};

const actionLabels: Record<string, string> = {
    'create': '创建',
    'update': '更新',
    'delete': '删除',
    'activate': '激活',
    'audit': '审核',
    'reset': '重置',
    'unknown': '未知'
};

const OperationLogPage: React.FC = () => {
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0
    });
    const [filters, setFilters] = useState<OperationLogFilters>({
        module: '',
        action: '',
        success: undefined,
        startDate: '',
        endDate: ''
    });
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const fetchLogs = async (page: number = 1) => {
        setLoading(true);
        try {
            const response = await operationLogApi.getOperationLogs({
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
            console.error('获取操作日志失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const handleSearch = () => {
        const newFilters: OperationLogFilters = {
            ...filters,
            startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
            endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
        };
        setFilters(newFilters);
        fetchLogs(1);
    };

    const handleReset = () => {
        setFilters({
            module: '',
            action: '',
            success: undefined,
            startDate: '',
            endDate: ''
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
            render: (record: OperationLog) => format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss')
        },
        {
            key: 'module',
            title: '模块',
            width: 120,
            render: (record: OperationLog) => (
                <span className="text-sm text-gray-900">
                    {moduleLabels[record.module] || record.module}
                </span>
            )
        },
        {
            key: 'action',
            title: '操作',
            width: 100,
            render: (record: OperationLog) => (
                <span className="text-sm text-gray-900">
                    {actionLabels[record.action] || record.action}
                </span>
            )
        },
        {
            key: 'description',
            title: '描述',
            render: (record: OperationLog) => (
                <span className="text-sm text-gray-900">
                    {record.description}
                </span>
            )
        },
        {
            key: 'operator',
            title: '操作人',
            width: 150,
            render: (record: OperationLog) => (
                <span className="text-sm text-gray-900">
                    {record.operator?.nickname || record.operator?.email || record.operatorId}
                </span>
            )
        },
        {
            key: 'success',
            title: '结果',
            width: 80,
            render: (record: OperationLog) => (
                <Tag variant={record.success ? 'success' : 'danger'}>
                    {record.success ? '成功' : '失败'}
                </Tag>
            )
        },
        {
            key: 'ip',
            title: 'IP地址',
            width: 130,
            render: (record: OperationLog) => (
                <span className="text-sm text-gray-500 font-mono">
                    {record.ip || '-'}
                </span>
            )
        }
    ];

    const moduleOptions = [
        { value: '', label: '全部模块' },
        { value: 'users', label: '用户管理' },
        { value: 'orders', label: '订单管理' },
        { value: 'points-rules', label: '积分规则' },
        { value: 'products', label: '商品管理' },
        { value: 'ai-engine', label: 'AI引擎' },
        { value: 'refunds', label: '退款管理' },
        { value: 'roles', label: '角色权限' }
    ];

    const actionOptions = [
        { value: '', label: '全部操作' },
        { value: 'create', label: '创建' },
        { value: 'update', label: '更新' },
        { value: 'delete', label: '删除' },
        { value: 'activate', label: '激活' },
        { value: 'audit', label: '审核' },
        { value: 'reset', label: '重置' }
    ];

    const successOptions = [
        { value: '', label: '全部状态' },
        { value: 'true', label: '成功' },
        { value: 'false', label: '失败' }
    ];

    return (
        <div className="space-y-6">
            <Card title="操作日志查询">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">模块</label>
                        <Select
                            value={filters.module}
                            onChange={(value) => setFilters({ ...filters, module: value })}
                            options={moduleOptions}
                            placeholder="选择模块"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">操作</label>
                        <Select
                            value={filters.action}
                            onChange={(value) => setFilters({ ...filters, action: value })}
                            options={actionOptions}
                            placeholder="选择操作"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                        <Select
                            value={filters.success !== undefined ? String(filters.success) : ''}
                            onChange={(value) => setFilters({ ...filters, success: value ? value === 'true' : undefined })}
                            options={successOptions}
                            placeholder="选择状态"
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

            <Card title={`操作日志列表（共 ${pagination.total} 条）`}>
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

export default OperationLogPage;
