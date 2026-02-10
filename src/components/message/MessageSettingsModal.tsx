
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Bell, Globe, Save, RefreshCw } from 'lucide-react';
import { getMessageSettings, updateMessageSettings, MessageSettings, UpdateMessageSettingsDTO } from '../../api/message';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface MessageSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MESSAGE_TYPES = [
    { type: 'ORDER', label: '订单消息', desc: '订单状态变更、支付成功、发货提醒' },
    { type: 'REFUND', label: '退款消息', desc: '退款申请进度、审核结果' },
    { type: 'AI', label: 'AI创作', desc: 'PPT生成完成、AI任务进度' },
    { type: 'POINTS', label: '积分变动', desc: '积分获取、消耗、过期提醒' },
    { type: 'VIP', label: '会员权益', desc: '会员开通、续费、等级变更' },
    { type: 'ACTIVITY', label: '活动优惠', desc: '限时活动、优惠券领取' },
    { type: 'SYSTEM', label: '系统通知', desc: '平台公告、功能变更、维护通知' },
    { type: 'SECURITY', label: '安全中心', desc: '登录异常、密码修改、风险提示' },
];

const ADMIN_ONLY_TYPES = [
    { type: 'LEAD', label: '线索提醒', desc: '新销售线索、客户咨询' },
];

export const MessageSettingsModal: React.FC<MessageSettingsModalProps> = ({ isOpen, onClose }) => {
    const { isAdmin, isSuperAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<MessageSettings | null>(null);

    // Load settings when open
    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getMessageSettings();
            setSettings(data);
        } catch (error) {
            toast.error('获取设置失败');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const dto: UpdateMessageSettingsDTO = {
                emailEnabled: settings.emailEnabled,
                browserEnabled: settings.browserEnabled,
                preferences: settings.preferences,
            };
            const updated = await updateMessageSettings(dto);
            setSettings(updated);
            toast.success('设置已更新');
            onClose();
        } catch (error) {
            toast.error('保存设置失败');
        } finally {
            setSaving(false);
        }
    };

    const toggleGlobal = (key: 'emailEnabled' | 'browserEnabled') => {
        if (!settings) return;
        setSettings({ ...settings, [key]: !settings[key] });
    };

    const toggleType = (type: string, channel: 'email' | 'browser') => {
        if (!settings) return;
        const currentPrefs = settings.preferences || {};
        const typePref = currentPrefs[type] || { email: true, browser: true };

        const newPrefs = {
            ...currentPrefs,
            [type]: {
                ...typePref,
                [channel]: !typePref[channel]
            }
        };

        setSettings({ ...settings, preferences: newPrefs });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[61] pointer-events-none"
                    >
                        <div className="bg-white w-[90%] max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800">消息通知设置</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">管理您的接收方式和消息类型</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {loading ? (
                                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                                        <RefreshCw size={20} className="animate-spin" />
                                        加载配置中...
                                    </div>
                                ) : settings ? (
                                    <>
                                        {/* Global Switches */}
                                        <section className="bg-slate-50 rounded-xl p-5 border border-slate-200/60">
                                            <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                                <Globe size={16} className="text-violet-500" />
                                                全局通知开关
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <SwitchCard
                                                    icon={<Mail size={18} />}
                                                    label="邮件通知"
                                                    desc="接收重要消息到绑定邮箱"
                                                    checked={settings.emailEnabled}
                                                    onChange={() => toggleGlobal('emailEnabled')}
                                                    color="violet"
                                                />
                                                <SwitchCard
                                                    icon={<Bell size={18} />}
                                                    label="站内信/推送"
                                                    desc="接收浏览器推送和红点提醒"
                                                    checked={settings.browserEnabled}
                                                    onChange={() => toggleGlobal('browserEnabled')}
                                                    color="indigo"
                                                />
                                            </div>
                                        </section>

                                        {/* Granular Settings */}
                                        <section>
                                            <h3 className="text-sm font-bold text-slate-700 mb-4 px-1">消息类型管理</h3>
                                            <div className="space-y-3">
                                                {((isAdmin || isSuperAdmin) ? [...ADMIN_ONLY_TYPES, ...MESSAGE_TYPES] : MESSAGE_TYPES).map((item) => {
                                                    const prefs = settings.preferences?.[item.type] || { email: true, browser: true };
                                                    return (
                                                        <div key={item.type} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-colors shadow-sm hover:shadow-md">
                                                            <div className="flex-1 pr-4">
                                                                <div className="font-bold text-slate-700 text-sm">{item.label}</div>
                                                                <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <Checkbox
                                                                    label="邮件"
                                                                    checked={prefs.email}
                                                                    disabled={!settings.emailEnabled}
                                                                    onChange={() => toggleType(item.type, 'email')}
                                                                />
                                                                <div className="w-px h-4 bg-slate-200" />
                                                                <Checkbox
                                                                    label="站内推"
                                                                    checked={prefs.browser}
                                                                    disabled={!settings.browserEnabled}
                                                                    onChange={() => toggleType(item.type, 'browser')}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </>
                                ) : (
                                    <div className="text-center py-20 text-red-500">加载失败，请重试</div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 z-10">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium text-sm transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading || saving || !settings}
                                    className="px-6 py-2 rounded-lg bg-violet-600 text-white font-bold text-sm shadow-lg shadow-violet-200 hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-200/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                    保存设置
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// UI Helper Components
const SwitchCard = ({ icon, label, desc, checked, onChange, color }: any) => (
    <div
        onClick={onChange}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked
            ? `bg-${color}-50 border-${color}-500/30`
            : 'bg-white border-slate-100 hover:border-slate-200'
            }`}
    >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checked ? `bg-${color}-500 text-white shadow-md shadow-${color}-200` : 'bg-slate-100 text-slate-400'
            }`}>
            {icon}
        </div>
        <div className="flex-1">
            <div className={`font-bold text-sm ${checked ? `text-${color}-900` : 'text-slate-600'}`}>{label}</div>
            <div className="text-[10px] text-slate-400">{desc}</div>
        </div>
        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${checked ? `bg-${color}-500` : 'bg-slate-200'}`}>
            <motion.div
                className="w-4 h-4 bg-white rounded-full shadow-sm"
                animate={{ x: checked ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </div>
    </div>
);

const Checkbox = ({ label, checked, onChange, disabled }: any) => (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-violet-500 border-violet-500' : 'border-slate-300 bg-white hover:border-violet-400'
            }`}>
            {checked && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-white"><X size={10} className="rotate-45" /></motion.div>}
        </div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input type="checkbox" className="hidden" checked={checked} onChange={onChange} disabled={disabled} />
    </label>
);
