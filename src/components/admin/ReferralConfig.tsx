
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { Settings2, Save, Rocket, UserPlus, Info, Share2, Smartphone, RefreshCcw, AlertTriangle } from 'lucide-react';

interface SettingsData {
    NEW_USER_POINTS: string;
    REFERRAL_POINTS: string;
    BIND_PHONE_POINTS: string;
    WARN_THRESHOLD: string;
}

export const ReferralConfig: React.FC = () => {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<SettingsData>({
        NEW_USER_POINTS: '30',
        REFERRAL_POINTS: '200',
        BIND_PHONE_POINTS: '50',
        WARN_THRESHOLD: '100'
    });

    const { data: remoteSettings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: AdminApi.getSettings
    });

    useEffect(() => {
        if (remoteSettings) {
            setSettings({
                NEW_USER_POINTS: String(remoteSettings.NEW_USER_POINTS || '30'),
                REFERRAL_POINTS: String(remoteSettings.REFERRAL_POINTS || '200'),
                BIND_PHONE_POINTS: String(remoteSettings.BIND_PHONE_POINTS || '50'),
                WARN_THRESHOLD: String(remoteSettings.WARN_THRESHOLD || '100')
            });
        }
    }, [remoteSettings]);

    const mutation = useMutation({
        mutationFn: AdminApi.updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
            alert('配置更新成功');
        },
        onError: (err: any) => alert(err.message)
    });

    const handleSettingChange = (key: keyof SettingsData, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value } as SettingsData));
    };

    const handleSave = () => {
        if (remoteSettings) {
            const payload = { ...remoteSettings, ...settings };
            mutation.mutate(payload as unknown as AdminApi.GlobalSettings);
        }
    };

    return (
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-200/20 rounded-full blur-[100px] pointer-events-none -mr-48 -mt-48" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-200/10 rounded-full blur-[80px] pointer-events-none -ml-32 -mb-32" />

            <div className="relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Rocket className="text-violet-600" /> 增长引擎配置
                        </h2>
                        <p className="text-slate-500 mt-1 font-medium">调整核心增长参数，实时影响新用户的获取与留存策略</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSave}
                            disabled={!remoteSettings || isLoading || mutation.isPending}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-50 transition-all font-bold group"
                        >
                            {mutation.isPending ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} className="group-hover:scale-110 transition-transform" />}
                            <span>保存增长策略</span>
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-600 border-t-transparent" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-2">
                        <SettingCard
                            icon={<UserPlus size={24} />}
                            title="新用户赠送"
                            value={settings.NEW_USER_POINTS}
                            onChange={(val: string) => handleSettingChange('NEW_USER_POINTS', val)}
                            suffix="Points"
                            description="用户注册成功后立即获得的初始积分奖励"
                            colorScheme="rose"
                        />

                        <SettingCard
                            icon={<Share2 size={24} />}
                            title="邀请奖励 (双方)"
                            value={settings.REFERRAL_POINTS}
                            onChange={(val: string) => handleSettingChange('REFERRAL_POINTS', val)}
                            suffix="Points"
                            description="用户通过邀请码注册，邀请人与受邀人各得奖励"
                            colorScheme="indigo"
                        />

                        <SettingCard
                            icon={<Smartphone size={24} />}
                            title="绑定手机号"
                            value={settings.BIND_PHONE_POINTS}
                            onChange={(val: string) => handleSettingChange('BIND_PHONE_POINTS', val)}
                            suffix="Points"
                            description="完成手机号验证后发放的一次性奖励"
                            colorScheme="cyan"
                        />

                        <SettingCard
                            icon={<AlertTriangle size={24} />}
                            title="余额预警阈值"
                            value={settings.WARN_THRESHOLD}
                            onChange={(val: string) => handleSettingChange('WARN_THRESHOLD', val)}
                            suffix="Points"
                            description="通过Guard系统触发余额不足提醒的临界值"
                            colorScheme="amber"
                        />
                    </div>
                )}

                <div className="mt-8 flex items-start gap-3 bg-violet-50/50 p-4 rounded-2xl border border-violet-100 text-violet-700 text-sm font-medium">
                    <Info size={18} className="mt-0.5 shrink-0" />
                    <p>
                        配置修改将实时生效。所有积分变更都会记录在审计日志中。调整 "新用户赠送" 不会影响已注册用户的余额。
                    </p>
                </div>
            </div>
        </div>
    );
};

const SettingCard = ({ icon, title, value, onChange, suffix, description, colorScheme }: any) => {
    const config: any = {
        rose: {
            bg: 'bg-rose-50/50',
            text: 'text-rose-600',
            iconBg: 'bg-rose-500/10',
            border: 'hover:border-rose-500/30'
        },
        indigo: {
            bg: 'bg-indigo-50/50',
            text: 'text-indigo-600',
            iconBg: 'bg-indigo-500/10',
            border: 'hover:border-indigo-500/30'
        },
        cyan: {
            bg: 'bg-cyan-50/50',
            text: 'text-cyan-600',
            iconBg: 'bg-cyan-500/10',
            border: 'hover:border-cyan-500/30'
        },
        amber: {
            bg: 'bg-amber-50/50',
            text: 'text-amber-600',
            iconBg: 'bg-amber-500/10',
            border: 'hover:border-amber-500/30'
        }
    };

    const scheme = config[colorScheme] || config.indigo;

    return (
        <div className={`group p-6 rounded-[2rem] border border-slate-200/60 bg-white/40 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/20 hover:bg-white ${scheme.border}`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${scheme.iconBg} ${scheme.text} transition-transform group-hover:scale-110 duration-500`}>
                        {icon}
                    </div>
                    <div className="space-y-0.5">
                        <h3 className="font-black text-slate-800 tracking-tight">{title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{suffix} CONFIG</p>
                    </div>
                </div>
            </div>

            <div className="relative group/input">
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 outline-none transition-all placeholder:text-slate-200 focus:bg-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 group-hover/input:bg-white"
                    placeholder="0"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{suffix}</span>
                </div>
            </div>

            <p className="mt-4 text-xs text-slate-500 leading-relaxed font-medium px-1">
                {description}
            </p>
        </div>
    );
};
