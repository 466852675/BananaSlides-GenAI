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
  Clock
} from 'lucide-react';
import { motion, useScroll, useSpring, AnimatePresence, Variants } from 'framer-motion';
import '../styles/landing.css';

const TESTIMONIALS = [
  { name: "张明", role: "市场总监", comment: "BananaSlides 彻底改变了我的工作流。以前需要熬夜做的商业方案，现在喝杯咖啡的功夫就搞定了，而且设计感比我手做的强百倍！", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
  { name: "Sarah Chen", role: "独立开发者", comment: "作为一个没受过专业设计训练的程序员，这款工具简直是救星。它生成的卡片式布局和配色非常专业，很有科技感。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  { name: "李华", role: "在读大学生", comment: "大纲生成功能太赞了！我只需要输入论文标题，它就能帮我理顺逻辑并生成精美的展示文稿，强烈推荐给所有同学。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leo" },
  { name: "王伟", role: "产品经理", comment: "它的 AI 自动配色引擎非常惊艳，能自动提取品牌色并应用到所有幻灯片中，省去了大量的微调时间。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Simba" },
  { name: "Emily White", role: "商务咨询", comment: "导出的 PDF 质量非常高，排版整洁大方，直接发给客户非常体面。这是我用过最高效的幻灯片生成工具。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly" },
  { name: "陈思进", role: "大学教师", comment: "课件制作变得非常轻松。我只需要把讲课大纲贴进去，AI 就能帮我拆解成逻辑清晰的幻灯片，极大地丰富了教学形式。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" },
  { name: "James Wilson", role: "创业者", comment: "Pitch Deck 制作时间从 3 天缩短到了 3 小时。它的大纲模式让我能更专注于逻辑梳理，而不是纠结像素对齐。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Coby" },
  { name: "刘洋", role: "新媒体运营", comment: "Banner 和海报布局也很不错。虽然主要是个 PPT 工具，但我经常用它来快速搭建活动演示方案，非常灵活。", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Oreo" }
];

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [navCursor, setNavCursor] = useState({ left: 0, width: 0, opacity: 0 });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [heroInput, setHeroInput] = useState("");
  const [isPrimePreviewActive, setIsPrimePreviewActive] = useState(false);
  const [isScanComplete, setIsScanComplete] = useState(false);

  const handleNavHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
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

  useEffect(() => {
    // 模拟首页加载扫描仪式
    const timer = setTimeout(() => setIsScanComplete(true), 1500);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
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
              {['产品', '解决方案', '资源', '价格'].map((item) => (
                <a
                  key={item}
                  href="#"
                  onMouseEnter={handleNavHover}
                  className="relative z-10 px-4 py-2 rounded-full text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all" onClick={onEnter}>
              登录
            </button>
            <button
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              onClick={onEnter}
            >
              免费开始 <ArrowRight size={14} className="opacity-50" />
            </button>
          </div>
        </div>
      </header>

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
              <form onSubmit={handleHeroSubmit} className="relative flex items-center bg-white border border-slate-200 p-2 rounded-2xl shadow-xl overflow-hidden">
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
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all group/btn"
                >
                  立即生成
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
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

        {/* 🖼️ Hero Media Placeholder */}
        <motion.div
          className="max-w-6xl mx-auto mt-20 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="aspect-video bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
            <div className="text-center group cursor-pointer">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <ArrowRight className="text-white" size={32} />
              </div>
              <p className="font-bold text-slate-400">[HERO_DEMO_VIDEO]</p>
              <p className="text-sm text-slate-300 mt-2">点击放置预览视频或核心工作流截图</p>
            </div>
          </div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-400/10 blur-[80px] rounded-full"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-400/10 blur-[80px] rounded-full"></div>
        </motion.div>
      </section>

      {/* 3. Bento Grid Section */}
      <section className="py-32 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">超越传统的 AI 设计引擎</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">不只是生成，更是重塑。每一页幻灯片都经过像素级微调。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px]">
            {/* 卡片 1: 自动布局 */}
            <div className="md:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:shadow-2xl transition-all hover:border-blue-500 overflow-hidden relative">
              <div className="max-w-xs relative z-10">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:rotate-12 transition-transform">
                  <Layout size={24} />
                </div>
                <h3 className="text-2xl font-black mb-4">魔法自动排版</h3>
                <p className="text-slate-500 text-sm leading-relaxed">基于认知心理学的自动构图引擎，确保每一页信息传递效率最大化。</p>
              </div>
              <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50 p-6 flex items-center justify-center border-l border-slate-100">
                <p className="text-slate-300 font-bold text-sm">[SCREENSHOT_AUTO_LAYOUT]</p>
              </div>
            </div>

            {/* 卡片 2: 一键导出 */}
            <div className="md:col-span-4 bg-blue-600 rounded-[2.5rem] p-10 flex flex-col justify-between text-white group hover:scale-[1.02] transition-transform">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <Download size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-4">多格式高清导出</h3>
                <p className="text-white/70 text-sm leading-relaxed">支持导出为标准 .pptx、PDF 及高清图片格式，无缝适配各种演示场景。</p>
              </div>
            </div>

            {/* 卡片 3: 工作台预览 */}
            <div className="md:col-span-4 bg-[#0a0a1a] rounded-[2.5rem] p-10 flex flex-col justify-between text-white group hover:shadow-indigo-500/10 shadow-2xl overflow-hidden relative">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6">
                  <Palette size={24} />
                </div>
                <h3 className="text-2xl font-black mb-4">极致创作体验</h3>
                <p className="text-white/40 text-sm leading-relaxed">沉浸式编辑器，像刷短视频一样刷 PPT 样式。</p>
              </div>
              <div className="mt-8 bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="w-full h-px bg-white/10 mb-2"></div>
                <p className="text-[10px] text-indigo-400 font-mono">EXPORTING_STATUS: 98%...</p>
              </div>
            </div>

            {/* 卡片 4: 多场景适配 */}
            <div className="md:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] p-10 flex items-center gap-10 group hover:border-slate-300 transition-colors">
              <div className="flex-1">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} />
                </div>
                <h3 className="text-2xl font-black mb-4">全行业覆盖</h3>
                <p className="text-slate-500 text-sm leading-relaxed">无论是商业计划书、学术报告还是产品发布，BananaSlides 都能精准适配行业调性。</p>
              </div>
              <div className="hidden lg:flex flex-1 items-center justify-center">
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-20 h-24 bg-slate-50 rounded-xl border border-slate-100" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Social Proof Section --- */}
      <section className="py-24 border-y border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          {/* Trust Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20 text-center">
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
      <section className="py-32 bg-white">
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
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center mb-16 tracking-tight text-slate-900">常见问题</h2>
          <div className="space-y-4">
            {[
              { q: "AI 生成的 PPT 会造成版权问题吗？", a: "绝对不会。BananaSlides 的所有内容均为实时原创，且导出的素材均拥有商用授权。" },
              { q: "我可以导出为 PowerPoint 格式吗？", a: "是的，我们支持高保真导出为 .pptx、PDF 以及图片格式，方便您在不同设备上进行演示。" },
              { q: "数据安全性如何保证？", a: "我们采用企业级加密，您的所有输入信息和生成的文档仅您可见，绝不用于公有模型训练。" }
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
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto bg-blue-600 rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative z-10"
          >
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">准备好在下场会议中 <br /> 脱颖而出了吗？</h2>
            <p className="text-xl text-white/80 mb-12 max-w-2xl mx-auto">加入全球 120,000+ 高端创作者，开启您的 AI 演讲新时代。</p>
            <button
              onClick={onEnter}
              className="px-12 py-6 bg-white text-blue-600 rounded-full text-xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              立刻免费体验
              <ArrowRight size={24} />
            </button>
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

export default LandingPage;
