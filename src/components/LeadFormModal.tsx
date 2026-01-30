// src/components/LeadFormModal.tsx
// 销售线索表单弹窗：用于收集企业版咨询信息

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Building2, User, Phone, CheckCircle2, Loader2, Mail, Briefcase } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { client } from '../api/client';

interface LeadFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LeadFormData {
    name: string;
    phone: string;
    company: string;
    position: string;
    email: string;
    teamSize: string;
    industry: string;
    needs: string;
}

const INITIAL_DATA: LeadFormData = {
    name: '',
    phone: '',
    company: '',
    position: '',
    email: '',
    teamSize: '1-50',
    industry: '',
    needs: ''
};

export const LeadFormModal: React.FC<LeadFormModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState<LeadFormData>(INITIAL_DATA);
    const [submitted, setSubmitted] = useState(false);

    const submitMutation = useMutation({
        mutationFn: async (data: LeadFormData) => {
            const res = await client.post('/leads', data);
            return res.data;
        },
        onSuccess: () => {
            setSubmitted(true);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;
        submitMutation.mutate(formData);
    };

    const handleClose = () => {
        setSubmitted(false);
        setFormData(INITIAL_DATA);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Building2 size={120} />
                        </div>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors z-20"
                        >
                            <X size={20} />
                        </button>

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-indigo-50 text-xs font-bold mb-3">
                                <Building2 size={12} />
                                <span>企业定制服务</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">预约咨询顾问</h3>
                            <p className="text-indigo-100 text-sm">
                                请填写您的联系方式，我们的解决方案专家将在 24 小时内与您联系，为您定制专属方案。
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        {submitted ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center">
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 mb-2">提交成功</h4>
                                <p className="text-slate-500 max-w-xs mx-auto mb-8">
                                    感谢您的咨询！我们已收到您的信息，专员将尽快通过电话或邮件与您取得联系。
                                </p>
                                <button
                                    onClick={handleClose}
                                    className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                                >
                                    完成并关闭
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">联系人姓名 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="如何称呼您"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">联系电话 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="tel"
                                                required
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="手机号码"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">公司/组织名称</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="text"
                                            value={formData.company}
                                            onChange={e => setFormData({ ...formData, company: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="所属企业全称"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">职位</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                value={formData.position}
                                                onChange={e => setFormData({ ...formData, position: e.target.value })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="您的职务"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">团队规模</label>
                                        <select
                                            value={formData.teamSize}
                                            onChange={e => setFormData({ ...formData, teamSize: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                        >
                                            <option value="1-50">1-50 人</option>
                                            <option value="51-200">51-200 人</option>
                                            <option value="201-500">201-500 人</option>
                                            <option value="500+">500 人以上</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 ml-1">咨询需求</label>
                                    <textarea
                                        rows={3}
                                        value={formData.needs}
                                        onChange={e => setFormData({ ...formData, needs: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
                                        placeholder="请简述您的需求，例如：私有化部署、API 对接、企业账号批量采购等..."
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={submitMutation.isPending}
                                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {submitMutation.isPending ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                <span>提交中...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Send size={18} />
                                                <span>提交咨询申请</span>
                                            </>
                                        )}
                                    </button>
                                    <p className="text-center text-[10px] text-slate-400 mt-3">
                                        提交即表示同意《隐私与服务条款》，我们将严格保护您的信息安全
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
