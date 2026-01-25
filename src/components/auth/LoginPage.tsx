// src/components/auth/LoginPage.tsx
// 独立登录页面 (Option A: Modern Capsule Overhaul)

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    Loader2,
    Sparkles,
    ArrowRight,
    AlertTriangle,
    Phone,
    ShieldCheck,
    Github,
    Chrome, // For Google
    MessageCircle, // For Wechat
    MessageSquare, // For DingTalk
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { MagneticButton } from '../MagneticButton';

// ============================================================
// 动态流体背景组件 (Fluid Background)
// ============================================================
const FluidBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-slate-50">
            {/* 动态网格渐变 */}
            <div className="absolute inset-0 opacity-30">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-violet-400/30 rounded-full blur-[120px] animate-blob mix-blend-multiply filter" />
                <div className="absolute top-[-10%] right-[-20%] w-[60vw] h-[60vw] bg-fuchsia-400/30 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply filter" />
                <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-400/30 rounded-full blur-[120px] animate-blob animation-delay-4000 mix-blend-multiply filter" />
            </div>

            {/* 网格纹理 */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />
        </div>
    );
};

// ============================================================
// 社交登录图标组
// ============================================================
const SocialLoginGroup: React.FC = () => {
    const socials = [
        { icon: <MessageCircle size={20} />, name: 'WeChat', color: 'hover:text-green-500 hover:bg-green-50' },
        { icon: <MessageSquare size={20} />, name: 'DingTalk', color: 'hover:text-blue-500 hover:bg-blue-50' },
        { icon: <Chrome size={20} />, name: 'Google', color: 'hover:text-red-500 hover:bg-red-50' },
        { icon: <Github size={20} />, name: 'GitHub', color: 'hover:text-slate-900 hover:bg-slate-100' },
    ];

    return (
        <div className="mt-8">
            <div className="relative flex items-center justify-center mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100"></div>
                </div>
                <span className="relative px-4 bg-white/0 backdrop-blur-3xl text-xs font-bold text-slate-400 uppercase tracking-widest">
                    或通过快捷方式登录
                </span>
            </div>
            <div className="flex items-center justify-center gap-4">
                {socials.map((s) => (
                    <motion.button
                        key={s.name}
                        whileHover={{ y: -3, scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-12 h-12 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-center text-slate-400 transition-all ${s.color}`}
                        title={s.name}
                    >
                        {s.icon}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// 主组件
// ============================================================

export const LoginPage: React.FC = () => {
    const { login, register, loginWithPhone, sendPhoneCode, loginModalTab, setLoginModalTab } = useAuth();
    const [loginMethod, setLoginMethod] = useState<'account' | 'phone'>('account');
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [sessionExpired, setSessionExpired] = useState(false);

    // 视差效果处理
    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        const x = (clientX / window.innerWidth - 0.5) * 20;
        const y = (clientY / window.innerHeight - 0.5) * 20;
        setMousePosition({ x, y });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('expired') === 'true') {
            setSessionExpired(true);
            setError('您的会话已过期，请重新登录');
        }
    }, []);

    const handleSuccess = (msg: string) => {
        setSuccessMessage(msg);
    };

    return (
        <div
            className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans selection:bg-violet-200 selection:text-violet-900"
            onMouseMove={handleMouseMove}
        >
            <FluidBackground />

            {/* 顶栏 (Logo) - 按 LandingPage 风格对齐 */}
            <div className="absolute top-8 left-8 z-20 flex items-center gap-2.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                    <div className="relative flex items-center justify-center w-6 h-6">
                        <div className="absolute w-4 h-3 bg-white/20 rounded-sm -rotate-12 translate-x-1 -translate-y-1" />
                        <div className="absolute w-4 h-3 bg-white/40 rounded-sm rotate-12 -translate-x-1" />
                        <div className="relative w-4.5 h-3.5 bg-white rounded-[2px] shadow-sm flex items-center justify-center z-10">
                            <Sparkles size={10} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div>
                    <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">BananaSlides</h1>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 block">GenAI PPT</span>
                </div>
            </div>

            {/* 主要卡片容器 */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: mousePosition.x * -1,
                    rotateX: mousePosition.y * -0.05,
                    rotateY: mousePosition.x * 0.05
                }}
                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                className="relative z-10 w-full max-w-[440px] mx-4"
                style={{ perspective: 1000 }}
            >
                {/* 磨砂玻璃卡片 */}
                <div className="relative bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/40 overflow-hidden">
                    <div className="p-8 md:p-12 relative z-10">
                        {/* 标题区 */}
                        <div className="text-center mb-8 space-y-2">
                            <h1 className="text-4xl font-black bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent tracking-tight">
                                {loginModalTab === 'signin' && '欢迎回来'}
                                {loginModalTab === 'signup' && '创建账号'}
                                {loginModalTab === 'forgot' && '找回密码'}
                            </h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                {loginModalTab === 'signin' && '登录以继续您的 AI 创作之旅'}
                                {loginModalTab === 'signup' && '免费注册，开启演示文稿新航点'}
                                {loginModalTab === 'forgot' && '请输入您的注册信息'}
                            </p>
                        </div>

                        {/* 分段控制器 (Login Methods) */}
                        {loginModalTab === 'signin' && (
                            <div className="mb-8 p-1.5 bg-slate-100/80 rounded-2xl flex relative overflow-hidden">
                                <motion.div
                                    className="absolute inset-1.5 bg-white rounded-xl shadow-sm z-0"
                                    initial={false}
                                    animate={{
                                        x: loginMethod === 'account' ? '0%' : '100%',
                                        width: 'calc(50% - 3px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                                <button
                                    onClick={() => setLoginMethod('account')}
                                    className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors ${loginMethod === 'account' ? 'text-slate-800' : 'text-slate-500'}`}
                                >
                                    账号登录
                                </button>
                                <button
                                    onClick={() => setLoginMethod('phone')}
                                    className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors ${loginMethod === 'phone' ? 'text-slate-800' : 'text-slate-500'}`}
                                >
                                    手机登录
                                </button>
                            </div>
                        )}

                        {/* 会话过期/错误提示 */}
                        <AnimatePresence mode="wait">
                            {error && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-600 text-[13px] font-bold"
                                >
                                    <AlertTriangle size={16} className="shrink-0" />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* 表单区域 */}
                        <div className="relative">
                            <AnimatePresence mode="wait">
                                {loginModalTab === 'signin' && (
                                    <motion.div
                                        key={loginMethod}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {loginMethod === 'account' ? (
                                            <AccountLoginForm
                                                onSubmit={async (identity, password) => {
                                                    setIsLoading(true); setError('');
                                                    try {
                                                        await login(identity, password);
                                                        handleSuccess('登录成功');
                                                    } catch (err: any) {
                                                        setError(err.message || '登录失败');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                isLoading={isLoading}
                                                onSwitch={() => { setLoginModalTab('signup'); setError(''); }}
                                                onForgot={() => { setLoginModalTab('forgot'); setError(''); }}
                                            />
                                        ) : (
                                            <PhoneLoginForm
                                                onSubmit={async (phone, code) => {
                                                    setIsLoading(true); setError('');
                                                    try {
                                                        await loginWithPhone(phone, code);
                                                        handleSuccess('登录成功');
                                                    } catch (err: any) {
                                                        setError(err.message || '登录失败');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                onSendCode={async (phone) => {
                                                    setIsSendingCode(true); setError('');
                                                    try {
                                                        await sendPhoneCode(phone);
                                                        return true;
                                                    } catch (err: any) {
                                                        setError(err.message || '验证码发送失败');
                                                        return false;
                                                    } finally {
                                                        setIsSendingCode(false);
                                                    }
                                                }}
                                                isLoading={isLoading}
                                                isSendingCode={isSendingCode}
                                            />
                                        )}
                                    </motion.div>
                                )}

                                {loginModalTab === 'signup' && (
                                    <motion.div
                                        key="signup"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                    >
                                        <SignUpForm
                                            onSubmit={async (email, password, nickname) => {
                                                setIsLoading(true); setError('');
                                                try {
                                                    await register(email, password, nickname);
                                                    handleSuccess('注册成功');
                                                } catch (err: any) {
                                                    setError(err.message || '注册失败');
                                                } finally {
                                                    setIsLoading(false);
                                                }
                                            }}
                                            isLoading={isLoading}
                                            onSwitch={() => { setLoginModalTab('signin'); setError(''); }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* 社交登录区 */}
                        {loginModalTab === 'signin' && <SocialLoginGroup />}
                    </div>
                </div>

                {/* 底部版权 */}
                <div className="mt-8 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-40">
                        BananaSlides GenAI Engine v3.0
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

// ============================================================
// 子组件：账号登录表单
// ============================================================

const AccountLoginForm: React.FC<{
    onSubmit: (i: string, p: string) => Promise<void>;
    isLoading: boolean;
    onSwitch: () => void;
    onForgot: () => void;
}> = ({ onSubmit, isLoading, onSwitch, onForgot }) => {
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    return (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(identity, password); }}>
            <div className="space-y-4">
                <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="用户名 / 电子邮箱 / 手机号"
                        value={identity}
                        onChange={e => setIdentity(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                </div>
                <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="登录密码"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onForgot}
                    className="text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors"
                >
                    忘记密码？
                </button>
            </div>

            <MagneticButton className="w-full">
                <div
                    className={`relative w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-xl shadow-violet-500/20 flex items-center justify-center transition-all ${isLoading ? 'opacity-70' : 'hover:shadow-violet-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={22} /> : "立即登录"}
                </div>
            </MagneticButton>

            <div className="text-center pt-2">
                <p className="text-xs font-bold text-slate-400">
                    新用户？{' '}
                    <button
                        type="button"
                        onClick={onSwitch}
                        className="text-violet-600 hover:underline underline-offset-4"
                    >
                        立即创建账号
                    </button>
                </p>
            </div>
        </form>
    );
};

// ============================================================
// 子组件：手机号登录表单
// ============================================================

const PhoneLoginForm: React.FC<{
    onSubmit: (phone: string, code: string) => Promise<void>;
    onSendCode: (phone: string) => Promise<boolean>;
    isLoading: boolean;
    isSendingCode: boolean;
}> = ({ onSubmit, onSendCode, isLoading, isSendingCode }) => {
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [countdown, setCountdown] = useState(0);

    const handleSendCode = async () => {
        if (!/^1[3-9]\d{9}$/.test(phone)) return;
        const success = await onSendCode(phone);
        if (success) {
            setCountdown(60);
        }
    };

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    return (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(phone, code); }}>
            <div className="space-y-4">
                <div className="group relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="tel"
                        placeholder="手机号码"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                </div>
                <div className="group relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="验证码"
                        value={code}
                        onChange={e => setCode(e.target.value)}
                        className="w-full pl-12 pr-32 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                    <button
                        type="button"
                        disabled={countdown > 0 || isSendingCode || !/^1[3-9]\d{9}$/.test(phone)}
                        onClick={handleSendCode}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-violet-600 hover:text-violet-700 disabled:text-slate-400 transition-colors"
                    >
                        {isSendingCode ? "正在发送..." : countdown > 0 ? `${countdown}s 后重新发送` : "获取验证码"}
                    </button>
                </div>
            </div>

            <MagneticButton className="w-full">
                <div
                    className={`relative w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/20 flex items-center justify-center transition-all ${isLoading ? 'opacity-70' : 'hover:shadow-slate-900/40 hover:-translate-y-0.5 active:translate-y-0'}`}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={22} /> : "进入系统"}
                </div>
            </MagneticButton>

            <div className="text-center pt-2">
                <p className="text-xs font-bold text-slate-400">
                    免注册：验证后将自动创建账号
                </p>
            </div>
        </form>
    );
};

// ============================================================
// 子组件：注册表单
// ============================================================

const SignUpForm: React.FC<{
    onSubmit: (e: string, p: string, n?: string) => Promise<void>;
    isLoading: boolean;
    onSwitch: () => void;
}> = ({ onSubmit, isLoading, onSwitch }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(email, password, nickname); }} className="space-y-6">
            <div className="space-y-4">
                <div className="group relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="您的昵称"
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                </div>
                <div className="group relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="email"
                        placeholder="电子邮箱"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                </div>
                <div className="group relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors" size={20} />
                    <input
                        type="password"
                        placeholder="设置密码"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-slate-200 focus:bg-white focus:border-violet-500 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-700 text-sm"
                    />
                </div>
            </div>

            <MagneticButton className="w-full">
                <div
                    className={`relative w-full py-4 rounded-2xl bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10 flex items-center justify-center transition-all ${isLoading ? 'opacity-70' : 'hover:shadow-slate-900/30 hover:-translate-y-0.5'}`}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={22} /> : "确认创建"}
                </div>
            </MagneticButton>

            <div className="text-center pt-2">
                <p className="text-xs font-bold text-slate-400">
                    已有账号？{' '}
                    <button
                        type="button"
                        onClick={onSwitch}
                        className="text-violet-600 hover:underline underline-offset-4"
                    >
                        直接登录
                    </button>
                </p>
            </div>
        </form>
    );
};
