
import React, { useState, useEffect } from 'react';
import { Save, RefreshCcw, Settings, AlertTriangle } from 'lucide-react';

interface GlobalConfig {
    SYSTEM_STATUS: 'NORMAL' | 'MAINTENANCE';
    REG_MODE: 'OPEN' | 'INVITE_ONLY' | 'CLOSED';
    WARN_THRESHOLD: string;
    NEW_USER_POINTS: string;
    REFERRAL_POINTS: string;
    BIND_PHONE_POINTS: string;
}

export const ConfigCenter: React.FC = () => {
    const [config, setConfig] = useState<GlobalConfig>({
        SYSTEM_STATUS: 'NORMAL',
        REG_MODE: 'OPEN',
        WARN_THRESHOLD: '100',
        NEW_USER_POINTS: '50',
        REFERRAL_POINTS: '200',
        BIND_PHONE_POINTS: '1000'
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/config', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('bananaslides_v8_token')}` }
            });
            const data = await res.json();
            if (data.success && data.data) {
                // Merge with default to ensure keys exist
                setConfig(prev => ({ ...prev, ...data.data }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/admin/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('bananaslides_v8_token')}`
                },
                body: JSON.stringify(config)
            });
            // Show toast properly in real app
            alert('配置已保存');
        } catch (error) {
            console.error(error);
            alert('保存失败');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="text-indigo-600" /> 全局配置中心
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={fetchConfig}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="刷新配置"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
                    >
                        {saving ? '保存中...' : <><Save size={18} /> 保存配置</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 核心开关 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">系统运行开关</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-800">系统状态</label>
                                <p className="text-xs text-slate-500">维护模式下普通用户无法访问</p>
                            </div>
                            <select
                                value={config.SYSTEM_STATUS}
                                onChange={e => setConfig({ ...config, SYSTEM_STATUS: e.target.value as any })}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="NORMAL">正常运行 (Normal)</option>
                                <option value="MAINTENANCE">系统维护 (Maintenance)</option>
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-slate-800">注册模式</label>
                                <p className="text-xs text-slate-500">控制新用户注册通道</p>
                            </div>
                            <select
                                value={config.REG_MODE}
                                onChange={e => setConfig({ ...config, REG_MODE: e.target.value as any })}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="OPEN">开放注册 (Open)</option>
                                <option value="INVITE_ONLY">仅限邀请 (Invite Only)</option>
                                <option value="CLOSED">关闭注册 (Closed)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 积分策略 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">增长与积分策略</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">新用户赠送 (Points)</label>
                            <input
                                type="number"
                                value={config.NEW_USER_POINTS}
                                onChange={e => setConfig({ ...config, NEW_USER_POINTS: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">邀请奖励 (Points)</label>
                            <input
                                type="number"
                                value={config.REFERRAL_POINTS}
                                onChange={e => setConfig({ ...config, REFERRAL_POINTS: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">绑定手机 (Points)</label>
                            <input
                                type="number"
                                value={config.BIND_PHONE_POINTS}
                                onChange={e => setConfig({ ...config, BIND_PHONE_POINTS: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">余额预警阈值</label>
                            <input
                                type="number"
                                value={config.WARN_THRESHOLD}
                                onChange={e => setConfig({ ...config, WARN_THRESHOLD: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-amber-500 outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-xs">
                        <AlertTriangle size={14} className="mt-0.5" />
                        <p>调整积分策略会实时影响新产生的交易。不会追溯修改历史数据。</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
