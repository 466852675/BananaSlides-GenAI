import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as AdminApi from '../../api/admin';
import { Settings2, Save, Rocket, UserPlus, Info, CheckCircle2 } from 'lucide-react';

export const ReferralConfig: React.FC = () => {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState({
        NEW_USER_POINTS: '30',
        REFERRAL_POINTS: '200',
        BIND_PHONE_POINTS: '50'
    });

    const { data: remoteSettings, isLoading } = useQuery({
        queryKey: ['admin-settings'],
        queryFn: AdminApi.getSettings
    });

    useEffect(() => {
        if (remoteSettings) {
            setSettings({
                NEW_USER_POINTS: remoteSettings.NEW_USER_POINTS || '30',
                REFERRAL_POINTS: remoteSettings.REFERRAL_POINTS || '200',
                BIND_PHONE_POINTS: remoteSettings.BIND_PHONE_POINTS || '50'
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(settings);
    };

    if (isLoading) return <div className="p-12 text-center text-slate-400">加载中...</div>;

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Rocket size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">拉新激励配置</h3>
                    <p className="text-sm text-slate-500 font-medium italic">配置增长黑客裂变算法的核心权重</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* New User Reward */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <UserPlus size={18} className="text-emerald-500" />
                            <label className="text-sm font-black text-slate-700 uppercase tracking-wider">新注册用户初始积分</label>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono font-bold text-lg text-slate-700"
                                value={settings.NEW_USER_POINTS}
                                onChange={e => setSettings({ ...settings, NEW_USER_POINTS: e.target.value })}
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">PTS</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                            用户在系统完成第一次注册时（或接受邀请时）获得的起始启动资金。
                        </p>
                    </div>

                    {/* Referrer Reward */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Rocket size={18} className="text-indigo-500" />
                            <label className="text-sm font-black text-slate-700 uppercase tracking-wider">推荐人成功拉新奖励</label>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.25rem] focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono font-bold text-lg text-slate-700"
                                value={settings.REFERRAL_POINTS}
                                onChange={e => setSettings({ ...settings, REFERRAL_POINTS: e.target.value })}
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">PTS</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                            当被邀请人成功注册并绑定推荐人代码后，推荐人账户即刻到账的积分值。
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-sm">
                    <Info className="shrink-0 mt-0.5" size={20} />
                    <div className="space-y-1">
                        <p className="font-bold">风控提示：系统防刷机制已开启</p>
                        <p className="opacity-80">修改以上数值后，系统将自动调整对应的经济算法。请注意高额奖励可能引来的恶意注册行为。</p>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                    >
                        <Save size={20} />
                        {mutation.isPending ? '保存中...' : '提交永久生效配置'}
                    </button>
                </div>
            </form>
        </div>
    );
};
