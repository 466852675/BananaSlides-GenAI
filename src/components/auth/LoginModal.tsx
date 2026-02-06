// src/components/auth/LoginModal.tsx
// 登录/注册弹窗组件

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as AuthAPI from '../../api/auth';

// ============================================================
// 主组件
// ============================================================

export const LoginModal: React.FC = () => {
    const {
        showLoginModal,
        setShowLoginModal,
        loginModalTab,
        setLoginModalTab,
        login,
        register
    } = useAuth();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        if (!isLoading) {
            setShowLoginModal(false);
            setError('');
        }
    };

    return (
        <AnimatePresence>
            {showLoginModal && (
                <motion.div
                    key="login-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[400] flex items-center justify-center p-4"
                >
                    {/* 背景遮罩 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* 弹窗内容 */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md overflow-hidden"
                    >
                        {/* 玻璃卡片 */}
                        <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
                            {/* 顶部装饰渐变 */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500" />

                            {/* 关闭按钮 */}
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>

                            {/* 内容区域 */}
                            <div className="p-8">
                                {/* Logo 和标题 */}
                                <div className="text-center mb-6">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white mb-4 shadow-lg shadow-violet-500/30">
                                        <Sparkles size={28} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        {loginModalTab === 'signin' && '欢迎回来'}
                                        {loginModalTab === 'signup' && '创建账号'}
                                        {loginModalTab === 'forgot' && '重置密码'}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {loginModalTab === 'signin' && '登录以继续使用 智能PPT创作平台'}
                                        {loginModalTab === 'signup' && '免费注册，开启 AI 创作之旅'}
                                        {loginModalTab === 'forgot' && '输入邮箱接收重置链接'}
                                    </p>
                                </div>

                                {/* 错误提示 */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {/* 表单 */}
                                {loginModalTab === 'signin' && (
                                    <SignInForm
                                        onSubmit={async (identity, password) => {
                                            setIsLoading(true);
                                            setError('');
                                            try {
                                                await login(identity, password);
                                            } catch (err: any) {
                                                setError(err.message || '登录失败');
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                        isLoading={isLoading}
                                        onSwitchToSignUp={() => { setLoginModalTab('signup'); setError(''); }}
                                        onSwitchToForgot={() => { setLoginModalTab('forgot'); setError(''); }}
                                    />
                                )}

                                {loginModalTab === 'signup' && (
                                    <SignUpForm
                                        onSubmit={async (email, password, nickname) => {
                                            setIsLoading(true);
                                            setError('');
                                            try {
                                                await register(email, password, nickname);
                                            } catch (err: any) {
                                                setError(err.message || '注册失败');
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        }}
                                        isLoading={isLoading}
                                        onSwitchToSignIn={() => { setLoginModalTab('signin'); setError(''); }}
                                    />
                                )}

                                {loginModalTab === 'forgot' && (
                                    <ForgotPasswordForm
                                        isLoading={isLoading}
                                        setIsLoading={setIsLoading}
                                        setError={setError}
                                        onSwitchToSignIn={() => { setLoginModalTab('signin'); setError(''); }}
                                    />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// ============================================================
// 登录表单
// ============================================================

interface SignInFormProps {
    onSubmit: (identity: string, password: string) => Promise<void>;
    isLoading: boolean;
    onSwitchToSignUp: () => void;
    onSwitchToForgot: () => void;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSubmit, isLoading, onSwitchToSignUp, onSwitchToForgot }) => {
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (identity && password) {
            onSubmit(identity, password);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* 账号输入 */}
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="邮箱 / 手机号 / 用户名"
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                />
            </div>

            {/* 密码输入 */}
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {/* 忘记密码 */}
            <div className="text-right">
                <button
                    type="button"
                    onClick={onSwitchToForgot}
                    className="text-sm text-violet-600 hover:text-violet-700"
                >
                    忘记密码？
                </button>
            </div>

            {/* 登录按钮 */}
            <button
                type="submit"
                disabled={isLoading || !identity || !password}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        登录中...
                    </>
                ) : (
                    '登录'
                )}
            </button>

            {/* 切换到注册 */}
            <p className="text-center text-sm text-slate-500">
                还没有账号？{' '}
                <button
                    type="button"
                    onClick={onSwitchToSignUp}
                    className="text-violet-600 hover:text-violet-700 font-medium"
                >
                    立即注册
                </button>
            </p>
        </form>
    );
};

// ============================================================
// 注册表单
// ============================================================

interface SignUpFormProps {
    onSubmit: (email: string, password: string, nickname?: string) => Promise<void>;
    isLoading: boolean;
    onSwitchToSignIn: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, isLoading, onSwitchToSignIn }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (password !== confirmPassword) {
            setLocalError('两次输入的密码不一致');
            return;
        }

        if (password.length < 8) {
            setLocalError('密码至少需要8位');
            return;
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            setLocalError('密码需要包含字母和数字');
            return;
        }

        onSubmit(email, password, nickname || undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {localError && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-sm">
                    {localError}
                </div>
            )}

            {/* 邮箱 */}
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="email"
                    placeholder="邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />
            </div>

            {/* 昵称 */}
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="昵称（可选）"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />
            </div>

            {/* 密码 */}
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码（8位以上，含字母和数字）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            {/* 确认密码 */}
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="确认密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />
            </div>

            {/* 注册按钮 */}
            <button
                type="submit"
                disabled={isLoading || !email || !password || !confirmPassword}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        注册中...
                    </>
                ) : (
                    '注册'
                )}
            </button>

            {/* 切换到登录 */}
            <p className="text-center text-sm text-slate-500">
                已有账号？{' '}
                <button
                    type="button"
                    onClick={onSwitchToSignIn}
                    className="text-violet-600 hover:text-violet-700 font-medium"
                >
                    立即登录
                </button>
            </p>
        </form>
    );
};

// ============================================================
// 忘记密码表单
// ============================================================

interface ForgotPasswordFormProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string) => void;
    onSwitchToSignIn: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ isLoading, setIsLoading, setError, onSwitchToSignIn }) => {
    const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await AuthAPI.forgotPassword(email);
            setStep('code');
        } catch (err: any) {
            setError(err.message || '发送验证码失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');

        if (newPassword !== confirmPassword) {
            setLocalError('两次输入的密码不一致');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await AuthAPI.resetPassword(email, code, newPassword);
            setStep('done');
        } catch (err: any) {
            setError(err.message || '重置密码失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-500 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">密码重置成功</h3>
                <p className="text-sm text-slate-500 mb-4">请使用新密码登录</p>
                <button
                    onClick={onSwitchToSignIn}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium"
                >
                    返回登录
                </button>
            </div>
        );
    }

    if (step === 'code') {
        return (
            <form onSubmit={handleResetPassword} className="space-y-4">
                {localError && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-sm">
                        {localError}
                    </div>
                )}

                <p className="text-sm text-slate-500 text-center">
                    验证码已发送至 <span className="font-medium text-slate-700">{email}</span>
                </p>

                <input
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                    maxLength={6}
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />

                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="新密码"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="确认新密码"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !code || !newPassword || !confirmPassword}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            重置中...
                        </>
                    ) : (
                        '重置密码'
                    )}
                </button>
            </form>
        );
    }

    return (
        <form onSubmit={handleSendCode} className="space-y-4">
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="email"
                    placeholder="注册邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        发送中...
                    </>
                ) : (
                    '发送验证码'
                )}
            </button>

            <button
                type="button"
                onClick={onSwitchToSignIn}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1"
            >
                <ArrowLeft size={16} />
                返回登录
            </button>
        </form>
    );
};

export default LoginModal;
