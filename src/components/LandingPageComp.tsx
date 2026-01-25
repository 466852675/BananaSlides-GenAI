import React, { useState, useEffect } from 'react';
import {
    Rocket,
    Zap,
    BookOpen,
    Presentation,
    Palette,
    ArrowRight,
    ShieldCheck,
    Sparkles,
    ChevronRight,
    Globe,
    Layout,
    Download,
    Check,
    MousePointer2,
    BarChart3,
    Users,
    Star,
    Quote,
    Clock,
    History as HistoryIcon
} from 'lucide-react';
import { motion, useScroll, useSpring, AnimatePresence, Variants } from 'framer-motion';
import '../styles/landing.css';
import { ShowcaseTabs } from './ShowcaseTabs'; // Import new component
import { DeliveryShowcase } from './DeliveryShowcase';
import { MagneticButton } from './MagneticButton';
import { MacWindowHeader } from './MacWindowHeader';
import { UserWidget } from './auth';

const TESTIMONIALS = [
    { name: "Alex Chen", role: "科技博主", comment: "BananaSlides 是我见过的最懂'结构'的 PPT 工具。它不是在堆砌素材，而是在帮你梳理逻辑。Router-Adapter 架构让我在不同模型间切换自如。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { name: "Sarah Wu", role: "投资经理", comment: "以前做 Pitch Deck 需要一周，现在只要半天。'灵感演化论'的工作流非常符合人类直觉，从大纲到成品的每一步都由我掌控。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { name: "David Li", role: "大学教授", comment: "它的'智算底座'不仅仅是营销词汇。处理长篇学术论文时，它对结构的拆解能力远超通用 LLM，生成的图表也非常专业。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David" },
    { name: "Emily Zhao", role: "创意总监", comment: "通常我不相信 AI 的审美，但 BananaSlides 的深色模式和排版算法让我意外。它生成的页面有种高级的秩序感，这是很多设计师都难做到的。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily" },
    { name: "Michael Wang", role: "SaaS 创始人", comment: "批量生成功能救了我的命。我们要给 50 个客户做定制方案，用它的一键并发渲染，原本一个月的工作量压缩到了 3 小时。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" },
    { name: "Lisa Zhang", role: "活动策划", comment: "Delivery 交付板块的设计非常贴心。原生 PPTX 导出完美复刻了设计稿的每一处细节，让我在现场可以直接演示，这才是真正的生产力工具。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa" }
];

interface LandingPageProps {
    onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [navCursor, setNavCursor] = useState({ left: 0, width: 0, opacity: 0 });
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
    const [heroInput, setHeroInput] = useState("");
    const [isPrimePreviewActive, setIsPrimePreviewActive] = useState(false); // Prime 预览状态
    const [isScanComplete, setIsScanComplete] = useState(false);

    useEffect(() => {
        // Scanline Persistence Logic
        const hasVisited = sessionStorage.getItem('hasVisitedLanding');
        if (hasVisited) {
            setIsScanComplete(true);
        } else {
            const timer = setTimeout(() => {
                setIsScanComplete(true);
                sessionStorage.setItem('hasVisitedLanding', 'true');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleNavHover = (e: React.MouseEvent<HTMLElement>) => {
        const { offsetLeft, offsetWidth } = e.currentTarget;
        setNavCursor({ left: offsetLeft, width: offsetWidth, opacity: 1 });
    };

    const handleNavLeave = () => {
        setNavCursor(prev => ({ ...prev, opacity: 0 }));
    };

    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress as any, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    // --- Fullscreen & Scroll Logic ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Scroll Effect for Navbar & BackToTop ---
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


    const handleHeroSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!heroInput.trim()) return;
        setIsPrimePreviewActive(true);
        // 模拟 4.5 秒后的跳转给用户看预览
        setTimeout(() => {
            onEnter();
        }, 4500);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.3
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.6,
                ease: "easeOut"
            }
        }
    };

    // --- Hero Asset Sequence (Steps 0-3) ---
    const HERO_ASSETS = [
        { title: "输入灵感", desc: "智能修饰描述", src: "/assets/showcase/01-智能生产力链路/00-开启大纲-输入一句话描述+AI修饰生成主题+让您的PPT标题更有专业深度.gif" },
        { title: "大纲预览", desc: "结构清晰可见", src: "/assets/showcase/01-智能生产力链路/01-开启大纲-结构化大纲预览+节点清晰可见+确保演示逻辑严丝合缝.png" },
        { title: "内容扩写", desc: "AI 深度润色", src: "/assets/showcase/01-智能生产力链路/02-生成描述-AI内容批量扩写+深度语境润色+助您打造专业级演讲文稿.gif" },
        { title: "极简启动", desc: "瞬间开启生产", src: "/assets/showcase/01-智能生产力链路/03-导入任务-任务一键批量导入+极简启动流程+让您的想法瞬间转化为生产力.gif" },
    ];

    const [heroStepIndex, setHeroStepIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setHeroStepIndex((prev) => (prev + 1) % HERO_ASSETS.length);
        }, 4500);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="landing-root bg-white min-h-screen font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden noise-bg">
            {/* 滚动进度条 */}
            <motion.div className="scroll-progress-bar" style={{ scaleX }} />

            {/* 加载仪式扫描线 */}
            {!isScanComplete && (
                <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="scanline"
                />
            )}

            {/* 交互式预览弹窗 (Playground) */}
            <AnimatePresence>
                {isPrimePreviewActive && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-white/20"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="playground-preview max-w-2xl w-full p-8 rounded-[2.5rem] bg-white border border-blue-500 shadow-2xl overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">AI 正在捕捉灵感...</h3>
                                    <p className="text-sm text-slate-500 font-medium">主题: “{heroInput}”</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">正在提取关键词</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["市场趋势", "核心竞品", "年度增长", "策略解析"].map((k, i) => (
                                            <motion.span
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.4 }}
                                                className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200"
                                            >
                                                #{k}
                                            </motion.span>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">深度大纲生成中</p>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                        {[
                                            "1. 全球市场宏观背景概览",
                                            "2. 2026年核心驱动因素深度拆解",
                                            "3. 典型用户画像与需求池分析"
                                        ].map((line, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 1.2 + (i * 0.8) }}
                                                className="flex items-center gap-3"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                <span className="text-sm font-medium text-slate-700">{line}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-center pt-4">
                                    <div className="flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-tighter">
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                                        即将进入设计工作台...
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 1. 全球导航 (Adaptive Header) */}
            <header className={`fixed top-0 left-0 right-0 z-50 nav-capsule px-6 ${isScrolled ? 'scrolled' : 'bg-transparent py-5'}`}>
                <div className="w-full h-full flex items-center justify-between">
                    <div className="flex items-center gap-10">
                        {/* Logo */}
                        <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                                <div className="relative flex items-center justify-center w-5.5 h-5.5">
                                    <div className="absolute w-3.5 h-2.5 bg-white/20 rounded-sm -rotate-12 translate-x-1 -translate-y-1" />
                                    <div className="absolute w-3.5 h-2.5 bg-white/40 rounded-sm rotate-12 -translate-x-1" />
                                    <div className="relative w-4 h-3 bg-white rounded-[2px] shadow-sm flex items-center justify-center z-10">
                                        <Presentation size={8} className="text-blue-600" />
                                    </div>
                                    <Sparkles size={7} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse z-20" />
                                    <Sparkles size={5} className="absolute -bottom-0.5 -left-0.5 text-white/80 animate-bounce delay-75 z-20" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">BananaSlides</h1>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 block">GenAI PPT</span>
                            </div>
                        </div>

                        {/* Nav Menu - Capsule Style Hover with Mouse Follow Gradient */}
                        <nav className="hidden md:flex items-center gap-1 relative" onMouseLeave={handleNavLeave}>
                            <div
                                className="absolute bg-slate-100/80 rounded-full z-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]"
                                style={{
                                    left: navCursor.left,
                                    width: navCursor.width,
                                    height: '100%',
                                    opacity: navCursor.opacity
                                }}
                            />
                            {[
                                { name: '核心能力', id: 'features' },
                                { name: '交付结果', id: 'delivery' },
                                { name: '解决方案', id: 'solutions' },
                                { name: '用户评价', id: 'testimonials' },
                                { name: '价格方案', id: 'pricing' },
                                { name: '常见问题', id: 'faq' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onMouseEnter={handleNavHover}
                                    onClick={() => {
                                        const el = document.getElementById(item.id);
                                        if (el) {
                                            const offset = 80; // Navbar height
                                            const bodyRect = document.body.getBoundingClientRect().top;
                                            const elementRect = el.getBoundingClientRect().top;
                                            const elementPosition = elementRect - bodyRect;
                                            const offsetPosition = elementPosition - offset;
                                            window.scrollTo({
                                                top: offsetPosition,
                                                behavior: 'smooth'
                                            });
                                        }
                                    }}
                                    className="relative z-10 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    {item.name}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Navbar Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all hidden md:block"
                                title="全屏模式"
                            >
                                <Layout size={20} />
                            </button>
                            <div className="hidden md:block">
                                <UserWidget compact onEnterApp={onEnter} />
                            </div>
                            <button
                                onClick={onEnter}
                                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-full hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                免费开始 <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Floating Back to Top Button */}
            <AnimatePresence>
                {isScrolled && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-600 hover:text-white hover:-translate-y-1 transition-all group"
                        title="回到顶部"
                    >
                        <ArrowRight size={20} className="-rotate-90 group-hover:-translate-y-0.5 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* 2. Hero Section */}
            <section className="pt-40 pb-24 md:pt-48 md:pb-32 px-6">
                <motion.div
                    className="max-w-4xl mx-auto text-center space-y-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-600 text-xs font-bold uppercase tracking-wider">
                        <Sparkles size={14} /> AI 驱动的演示文稿之美
                    </motion.div>

                    <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1]">
                        设计感十足的 <br />
                        <span className="text-blue-600">PowerPoint</span> 几分钟内生成
                    </motion.h1>

                    <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        BananaSlides 把繁琐的排版留给 AI，让您专注于故事本身。通过 1:1 精准复刻的高级质感，重定义您的演示体验。
                    </motion.p>

                    <motion.div variants={itemVariants} className="pt-6">
                        <div className="relative max-w-xl mx-auto group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                            <form onSubmit={handleHeroSubmit} className="relative flex items-center bg-white border border-slate-200 p-2 rounded-2xl shadow-xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                                <div className="pl-4 text-slate-400">
                                    <Sparkles size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={heroInput}
                                    onChange={(e) => setHeroInput(e.target.value)}
                                    placeholder="输入 PPT 主题，如“2026年电动汽车市场分析报告”..."
                                    className="flex-1 px-4 py-3 outline-none text-slate-700 placeholder:text-slate-400"
                                />
                                <MagneticButton
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all group/btn"
                                >
                                    免费开始 <ArrowRight size={16} />
                                </MagneticButton>
                            </form>
                        </div>
                        <p className="mt-4 text-xs text-slate-400 flex items-center justify-center gap-4">
                            <span>无需信用卡</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>导出至 PPT/PDF</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>智能协作</span>
                        </p>
                    </motion.div>
                </motion.div>

                {/* 🖼️ Hero Media - Mac Window Style with Sequential Display (Steps 0-3) */}
                <motion.div
                    className="max-w-6xl mx-auto mt-20 relative px-4 md:px-0"
                    initial={{ opacity: 0, y: 40, rotateX: 10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: 0.6, duration: 0.8, type: "spring", stiffness: 50 }}
                    style={{ perspective: 1000 }}
                >
                    {/* Main Window Container */}
                    <div className="relative rounded-2xl md:rounded-[2.5rem] bg-slate-900 border border-slate-700/50 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden group">
                        {/* Mac Header - Unified Component */}
                        <MacWindowHeader
                            title={
                                <>
                                    <Sparkles size={12} className="text-blue-400" />
                                    Step 0{heroStepIndex + 1}: {HERO_ASSETS[heroStepIndex].title}
                                </>
                            }
                        />

                        {/* Content Container with AnimatePresence */}
                        <div className="aspect-video bg-slate-950 relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={heroStepIndex}
                                    src={HERO_ASSETS[heroStepIndex].src}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.6, ease: "easeInOut" }}
                                    className="w-full h-full object-cover"
                                    alt={`Step ${heroStepIndex + 1}`}
                                />
                            </AnimatePresence>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />

                            {/* Sequential Progress UI / Step Indicator */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 z-20">
                                {HERO_ASSETS.map((asset, idx) => (
                                    <div key={idx} className="flex items-center">
                                        <button
                                            onClick={() => setHeroStepIndex(idx)}
                                            className="group flex items-center gap-2 transition-all"
                                        >
                                            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${idx === heroStepIndex ? 'bg-blue-500 w-8' : 'bg-white/20'}`} />
                                            {idx === heroStepIndex && (
                                                <span className="text-[10px] font-black text-white uppercase tracking-tighter animate-in fade-in slide-in-from-left-1">
                                                    {asset.title}
                                                </span>
                                            )}
                                        </button>
                                        {idx < HERO_ASSETS.length - 1 && (
                                            <div className="w-1 h-px bg-white/5 mx-1" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 blur-[80px] rounded-full animate-pulse" />
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-500/20 blur-[80px] rounded-full animate-pulse delay-700" />
                </motion.div>
            </section>

            {/* 3. Bento Grid Section - AI Production Engine (Steps 4-8) */}
            <section id="features" className="py-32 bg-[#fafafa]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-16 text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight">AI 创作引擎：从初稿到完美成品</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">不只是生成，更是全链路的智能陪伴。每一次点击，都是在重新定义生产力。</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[320px]">
                        {/* 卡片 1 (Step 5): 批量生成 - 大卡片 (8 cols) */}
                        <div className="md:col-span-8 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-0 flex flex-col md:flex-row shadow-sm hover:shadow-2xl transition-all hover:border-blue-500 overflow-hidden relative group">
                            <div className="p-10 flex flex-col justify-between relative z-10 md:w-[40%]">
                                <div>
                                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:rotate-12 transition-transform">
                                        <Zap size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4 tracking-tighter">并发加速引擎</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">支持单页与全量多任务并行渲染，将 PPT 生产效率推向工业级巅峰。</p>
                                </div>
                                <div className="mt-8">
                                    <span className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-black text-blue-600 uppercase">Step 05: 批量量产</span>
                                </div>
                            </div>

                            <div className="absolute top-0 right-0 w-full md:w-[60%] h-full bg-slate-50 border-l border-slate-100 overflow-hidden">
                                <img
                                    src="/assets/showcase/01-智能生产力链路/05-批量生成-单页批量生成切换+按需定制生产+为您节省每一秒创作时间.gif"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms]"
                                    alt="Batch Generation"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent opacity-90" />
                            </div>
                        </div>

                        {/* 卡片 2 (Step 6): 历史时光机 - (4 cols) */}
                        <div className="md:col-span-4 bg-[#0a0a1a] rounded-[2.5rem] p-10 flex flex-col justify-between text-white group hover:scale-[1.02] transition-transform overflow-hidden relative">
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                                        <HistoryIcon size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4">版本时光回溯</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">自由撤销与恢复，为每一份创意买一份后悔药。创作从此无压力。</p>
                                </div>
                                <div className="bg-white/10 p-3 rounded-xl border border-white/5">
                                    <img src="/assets/showcase/01-智能生产力链路/06-历史回滚-版本时光回溯+自由撤销与恢复+给您的创作买一份后悔药.gif" className="rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </div>

                        {/* 卡片 3 (Step 4): 内容精修 - (4 cols) */}
                        <div className="md:col-span-4 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:border-slate-300 transition-colors shadow-sm">
                            <div>
                                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
                                    <Sparkles size={24} />
                                </div>
                                <h3 className="text-2xl font-black mb-4">AI 智能修饰</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">人机协作细节打磨，根据语境自动优化排版与配图，让表达更有张力。</p>
                            </div>
                            <div className="relative h-24 mt-4 rounded-xl overflow-hidden border border-slate-100">
                                <img src="/assets/showcase/01-智能生产力链路/04-编辑修饰-AI生成智能内容修饰+人机协作细节打磨+赋予内容更强的说服力.gif" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                            </div>
                        </div>

                        {/* 卡片 4 (Step 7/8): 资产循环 - (8 cols) */}
                        <div className="md:col-span-8 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[2.5rem] p-0 flex flex-col md:flex-row shadow-sm hover:shadow-2xl transition-all hover:border-indigo-500 overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-full md:w-[60%] h-full bg-slate-50 overflow-hidden">
                                <img
                                    src="/assets/showcase/01-智能生产力链路/08-二次创作-归档项目二次加工+旧资产焕发新生+让经典方案实现循环利用.gif"
                                    className="w-full h-full object-cover"
                                    alt="Asset Recycyle"
                                />
                                <div className="absolute inset-0 bg-gradient-to-l from-white via-transparent to-transparent opacity-90" />
                            </div>
                            <div className="ml-auto p-10 flex flex-col justify-between relative z-10 md:w-[40%] text-right items-end text-right">
                                <div>
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:rotate-12 transition-transform">
                                        <Rocket size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black mb-4">资产循环复用</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed">项目自动归档入库，支持对旧资产的二次创作，让每一份经典方案持续产生价值。</p>
                                </div>
                                <div className="mt-8 flex gap-2">
                                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">#智能归档</div>
                                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">#二次加工</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Delivery Showcase Section - The Payload (Steps 9-13) */}
            <div id="delivery">
                <DeliveryShowcase />
            </div>

            {/* --- NEW: Core Feature Showcase Tabs --- */}
            <div id="solutions">
                <ShowcaseTabs />
            </div>

            {/* --- Social Proof Section --- */}
            <section id="testimonials" className="py-24 border-y border-slate-100 overflow-hidden bg-slate-50/30">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Section Title for Testimonials */}
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">聆听创作者的声音</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">不仅仅是工具，更是他们职业生涯的加速器。</p>
                    </div>

                    {/* Trust Numbers */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 text-center">
                        {/* ...existing trust numbers... */}
                        {[
                            { icon: <Presentation size={24} />, label: "已生成幻灯片", value: "857,402", color: "text-blue-600" },
                            { icon: <Users size={24} />, label: "活跃创作者", value: "124,530", color: "text-indigo-600" },
                            { icon: <Star size={24} />, label: "用户好评率", value: "99.8%", color: "text-amber-500" },
                            { icon: <Globe size={24} />, label: "覆盖国家/地区", value: "45+", color: "text-emerald-600" }
                        ].map((stat, i) => (
                            <div key={i} className="trust-number">
                                <div className={`mb-3 flex justify-center ${stat.color}`}>{stat.icon}</div>
                                <div className="text-3xl font-black text-slate-900 mb-1">{stat.value}</div>
                                <div className="text-sm font-bold text-slate-400 tracking-wider uppercase">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Logo Cloud */}
                    <div className="logo-cloud">
                        <p className="text-center text-sm font-black text-slate-300 uppercase tracking-[0.2em] mb-12">深受全球顶级团队信赖</p>
                        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                            {["Google", "Microsoft", "Tencent", "ByteDance", "Alibaba", "OpenAI"].map(logo => (
                                <span key={logo} className="text-2xl font-black text-slate-800 tracking-tighter hover:text-blue-600 cursor-default transition-colors">{logo}</span>
                            ))}
                        </div>
                    </div>

                    {/* Testimonials Marquee */}
                    <div className="mt-32 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                        <div className="flex overflow-hidden -mx-6">
                            <motion.div
                                className="flex gap-6 pl-6"
                                animate={{ x: "-50%" }}
                                transition={{
                                    duration: 40,
                                    ease: "linear",
                                    repeat: Infinity
                                }}
                            >
                                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                                    <div key={i} className="testimonial-card w-[400px] flex-shrink-0">
                                        <Quote className="text-blue-600/20 mb-6" size={40} />
                                        <p className="text-slate-600 text-sm leading-relaxed mb-8 font-medium italic line-clamp-4">“{t.comment}”</p>
                                        <div className="flex items-center gap-4 mt-auto">
                                            <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-2xl bg-slate-100 border-2 border-white shadow-sm" />
                                            <div>
                                                <div className="text-sm font-black text-slate-800">{t.name}</div>
                                                <div className="text-xs font-bold text-slate-400">{t.role}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Pricing Matrix Section */}
            <section id="pricing" className="py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">选择最适合您的方案</h2>
                        <p className="text-slate-500">从个人创意到企业级生产力，总有一个方案完美契合。</p>

                        {/* 价格切换器 */}
                        <div className="mt-12 inline-flex items-center p-1 bg-slate-100 rounded-2xl">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                月付
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                年付 <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[10px] rounded-md font-black italic">省 25%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        <PricingCard
                            title="基础版"
                            price={billingCycle === 'yearly' ? '0' : '0'}
                            description="适合个人初次体验 AI 创作"
                            features={["赠送 30 积分/月", "使用标准版 AI 模型", "支持 .pptx / PDF 导出", "基础社区技术支持"]}
                            cta="免费开始"
                            onCta={onEnter}
                        />
                        <PricingCard
                            title="专业版"
                            price={billingCycle === 'yearly' ? '39' : '49'}
                            description="高频创作，解锁旗舰级 AI 能力"
                            features={["赠送 600 积分/月", "优先使用旗舰级 AI 模型", "更精准的逻辑生成与美化", "支持全量格式高清导出", "1对1 专家技术支持"]}
                            popular
                            cta="立即升级"
                            onCta={onEnter}
                        />
                        <PricingCard
                            title="团队版"
                            price={billingCycle === 'yearly' ? '99' : '129'}
                            description="为规模化演示生产量身定制"
                            features={["赠送 2000 积分/月 (共享)", "全员享用旗舰级 AI 模型", "团队协作空间与权限管理", "专属品牌风格模版定制", "API 访问与自动化支持"]}
                            cta="联系销售"
                            onCta={onEnter}
                        />
                    </div>
                </div>
            </section>


            {/* --- FAQ Section --- */}
            <section id="faq" className="py-24 bg-slate-50/50">
                <div className="max-w-3xl mx-auto px-6">
                    <h2 className="text-4xl font-black text-center mb-16 tracking-tight text-slate-900">常见问题</h2>
                    <div className="space-y-4">
                        {[
                            { q: "AI 生成的 PPT 会造成版权问题吗？", a: "绝对不会。BananaSlides 的所有内容均为实时原创，且导出的素材均拥有商用授权。" },
                            { q: "我可以导出为 PowerPoint 格式吗？", a: "是的，我们支持高保真导出为 .pptx、PDF 以及图片格式，方便您在不同设备上进行演示。" },
                            { q: "数据安全性如何保证？", a: "我们采用企业级加密，您的所有输入信息和生成的文档仅您可见，绝不用于公有模型训练。" },
                            { q: "支持自定义企业模版吗？", a: "支持。在团队版中，您可以上传企业的 VI 规范（Logo、配色、字体），系统会自动生成符合您品牌调性的专属模版。" },
                            { q: "订阅后可以退款吗？", a: "我们支持 7 天无理由退款。如果您对服务不满意，随时可以联系客服取消订阅并申请全额退款。" }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="text-lg font-bold text-slate-800 mb-2 truncate">{item.q}</h4>
                                <p className="text-slate-500 text-sm leading-relaxed">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Final CTA */}
            <section className="py-32 px-6 relative group overflow-hidden">
                <div className="max-w-6xl mx-auto bg-blue-600 rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
                    {/* Background Image Fused */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="/assets/showcase/01-智能生产力链路/12-成果演示-PDF全屏演示预览+高保真视觉效果+让您的汇报更具感染力.png"
                            className="w-full h-full object-cover opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000"
                            alt="CTA Background"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-600/90 to-blue-600/80" />
                    </div>

                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative z-10"
                    >
                        <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">准备好在下场会议中 <br /> 脱颖而出了吗？</h2>
                        <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">加入全球 120,000+ 高端创作者，开启您的 AI 演讲新时代。</p>
                        <MagneticButton
                            onClick={onEnter}
                            className="px-12 py-6 bg-white text-blue-600 rounded-full text-xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
                        >
                            立刻免费体验
                            <ArrowRight size={24} />
                        </MagneticButton>
                    </motion.div>
                </div>
            </section>

            {/* 6. Advanced Footer */}
            <footer className="py-20 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
                        <div className="col-span-2">
                            <div className="flex items-center gap-2.5 mb-6 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                                    <div className="relative flex items-center justify-center w-5.5 h-5.5">
                                        <div className="absolute w-3.5 h-2.5 bg-white/20 rounded-sm -rotate-12 translate-x-1 -translate-y-1" />
                                        <div className="absolute w-3.5 h-2.5 bg-white/40 rounded-sm rotate-12 -translate-x-1" />
                                        <div className="relative w-4 h-3 bg-white rounded-[2px] shadow-sm flex items-center justify-center z-10">
                                            <Presentation size={8} className="text-blue-600" />
                                        </div>
                                        <Sparkles size={7} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse z-20" />
                                        <Sparkles size={5} className="absolute -bottom-0.5 -left-0.5 text-white/80 animate-bounce delay-75 z-20" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">BananaSlides</h1>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 block">GenAI PPT</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                                利用最先进的生成式 AI 技术，重新定义演示文稿的创作标准。专为追求极致效率与商业审美的专业人士打造。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">产品</h4>
                            <ul className="space-y-4 text-sm text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">核心功能</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">模板库</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">更新日志</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">支持</h4>
                            <ul className="space-y-4 text-sm text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">帮助中心</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">开发者 API</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">状态查询</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">公司</h4>
                            <ul className="space-y-4 text-sm text-slate-500 font-bold">
                                <li><a href="#" className="hover:text-blue-600 transition-colors">关于我们</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">隐私政策</a></li>
                                <li><a href="#" className="hover:text-blue-600 transition-colors">服务条款</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 mb-6 uppercase text-xs tracking-widest">社交连接</h4>
                            <div className="flex gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 bg-slate-100 rounded-full hover:bg-blue-600 transition-colors cursor-pointer" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="pt-10 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-slate-400 text-xs font-bold">
                            © 2026 BananaSlides AI Inc. 保留所有权利。
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><ShieldCheck size={14} /> 数据安全认证</span>
                            <span className="flex items-center gap-1 text-slate-300">|</span>
                            <span>Made with ❤️ for Presenters</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const PricingCard = ({ title, price, description, features, cta, onCta, popular = false }: any) => (
    <div className={`relative p-10 rounded-[2.5rem] border transition-all ${popular
        ? 'bg-[#0a0a1a] text-white border-blue-500 shadow-2xl shadow-blue-500/10 scale-105 z-10'
        : 'bg-white border-slate-100 text-slate-900 group hover:border-slate-200'
        }`}>
        {popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                最受欢迎
            </div>
        )}
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className={`text-sm mb-8 ${popular ? 'text-white/50' : 'text-slate-500'}`}>{description}</p>
        <div className="flex items-baseline gap-1 mb-8">
            <span className="text-4xl font-black">{price === '定制' ? '' : '¥'}{price}</span>
            {price !== '定制' && <span className={`text-sm ${popular ? 'text-white/40' : 'text-slate-400'}`}>/月</span>}
        </div>
        <button className={`w-full py-4 rounded-xl font-bold mb-10 transition-all ${popular
            ? 'bg-blue-600 text-white hover:bg-white hover:text-black'
            : 'bg-slate-50 text-slate-900 hover:bg-black hover:text-white'
            }`}>
            {price === '定制' ? '联系我们' : (cta || '立即订阅')}
        </button>
        <ul className="space-y-4">
            {features.map((f: string) => (
                <li key={f} className="flex items-center gap-3 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${popular ? 'bg-white/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <Check size={12} strokeWidth={3} />
                    </div>
                    <span className={popular ? 'text-white/80' : 'text-slate-600'}>{f}</span>
                </li>
            ))}
        </ul>
    </div>
);

// End of LandingPage
