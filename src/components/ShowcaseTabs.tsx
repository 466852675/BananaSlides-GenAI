import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Layout, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import { MacWindowHeader } from './MacWindowHeader';

const TABS = [
  {
    id: 'system',
    label: '全局看板',
    icon: <Layout size={16} />,
    title: "多任务并行管理，进度尽在掌握",
    desc: "像指挥官一样管理您的所有 PPT 项目。卡片式设计让每个任务的状态一目了然，甚至支持上百个任务的并行调度。",
    color: "from-blue-500 to-indigo-600",
    images: [
      {
        src: "/assets/showcase/02-敏捷协作矩阵/01-系统概览-项目卡片式看板+多任务并行管理+为您呈现工业级的生产效率.gif",
        alt: "卡片看板"
      },
      {
        src: "/assets/showcase/02-敏捷协作矩阵/02-实时状态-动态任务实时播报+项目状态看板+帮您实时掌控全局生产进度.gif",
        alt: "实时状态"
      }
    ]
  },
  {
    id: 'dispatch',
    label: '敏捷调度',
    icon: <Zap size={16} />,
    title: "优先级动态调整，核心任务永远在线",
    desc: "工作台一键锁定重要项目，AI 资源根据您的需求动态分配，确保关键汇报永远获得最高的生产优先级。",
    color: "from-amber-400 to-orange-500",
    images: [
      {
        src: "/assets/showcase/02-敏捷协作矩阵/03-优先级定义-核心项目一键置顶+优先级动态调整+让您的重要任务永远在线.gif",
        alt: "优先级定义"
      },
      {
        src: "/assets/showcase/02-敏捷协作矩阵/04-快速调度-工作台快捷调度+进度可视化监控+让PPT批量生产变得井然有序.gif",
        alt: "快速调度"
      }
    ]
  },
  {
    id: 'design',
    label: '设计智库',
    icon: <Sparkles size={16} />,
    title: "小白也能拥有一线大厂的设计水准",
    desc: "内置千万级精品模版广场，秒级产出全套视觉定义。不仅是美学，更是品牌视觉规范的智能守护者。",
    color: "from-rose-500 to-purple-600",
    images: [
      {
        src: "/assets/showcase/03-设计资产智库/02-规范生成-设计方案AI秒级产出+全套视觉定义+小白也能拥有专业级设计水准.gif",
        alt: "规范生成"
      },
      {
        src: "/assets/showcase/03-设计资产智库/01-灵感选择-精品模版广场+多风格一键引用+为您提供取之不尽的设计灵感.png",
        alt: "灵感模版"
      },
      {
        src: "/assets/showcase/03-设计资产智库/04-规则注入-样式规则一键注入+视觉规范同传+确保多项目间品质的一致性.gif",
        alt: "规则注入"
      }
    ]
  },
  {
    id: 'engine',
    label: '智算底座',
    icon: <Settings size={16} />,
    title: "顶级 AI 引擎，性能与成本的平衡大师",
    desc: "支持模型自由切换与参数极致调优。根据任务难度自动适配计算资源，让 AI 的每一份算力都花在刀刃上。",
    color: "from-emerald-500 to-teal-500",
    images: [
      {
        src: "/assets/showcase/04-智算管理底座/01-引擎配置-全协议AI模型配置+模型自由自由切换+助您整合全球最顶尖智力资源.gif",
        alt: "引擎配置"
      },
      {
        src: "/assets/showcase/04-智算管理底座/02-参数调优-高性能参数自定义+极致生成效率调优+让您的AI引擎完美适配硬件实力.png",
        alt: "参数调优"
      }
    ]
  }
];

export const ShowcaseTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const activeData = TABS.find(t => t.id === activeTab) || TABS[0];
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // 预加载所有图片
  useEffect(() => {
    TABS.forEach(tab => {
      tab.images.forEach(imgData => {
        const img = new Image();
        img.src = imgData.src;
      });
    });
  }, []);

  // 切换 Tab 时重置图片索引
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [activeTab]);

  // 自动轮播逻辑
  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [activeTab, currentImageIndex]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayRef.current = setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % activeData.images.length);
    }, 4000); // 4秒切换一次，给GIF足够的播放时间
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const handleManualSwitch = (index: number) => {
    setCurrentImageIndex(index);
    stopAutoPlay(); // 手动切换后暂停一下自动播放，体验更好 (useEffect dependency will restart it)
  };

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 -right-64 w-[800px] h-[800px] bg-gradient-to-br ${activeData.color} opacity-[0.03] blur-[120px] rounded-full transition-colors duration-1000`} />
        <div className={`absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-gradient-to-tr ${activeData.color} opacity-[0.03] blur-[100px] rounded-full transition-colors duration-1000`} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">核心能力全景</h2>
          <p className="text-slate-500 max-w-2xl mx-auto">四大核心模块，构建您的超级演示工作流。</p>
        </div>

        {/* Tab 导航 */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-3 rounded-full text-sm font-bold flex items-center gap-2 transition-all duration-300 ${activeTab === tab.id
                ? 'text-white shadow-lg scale-105'
                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabBg"
                  className={`absolute inset-0 rounded-full bg-gradient-to-r ${tab.color}`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon} {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* 内容展示区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 左侧：文案 */}
          <motion.div
            key={`text-${activeTab}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeData.color} flex items-center justify-center text-white shadow-2xl shadow-blue-500/10`}>
              {activeData.icon}
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-6 leading-tight">
                {activeData.title}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed">
                {activeData.desc}
              </p>
            </div>

            {/* 当前展示图片的描述 */}
            <motion.div
              key={`desc-${currentImageIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${activeData.color}`} />
              <span className="text-sm font-bold text-slate-700">
                正在演示: {activeData.images[currentImageIndex]?.alt || activeData.title}
              </span>
            </motion.div>

            <button className="group flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors pt-4">
              深入了解
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:translate-x-1 transition-all">
                <Layout size={14} />
              </div>
            </button>
          </motion.div>

          {/* 右侧：Mac Window 演示容器 + 垂直导航 */}
          <div className="flex gap-6 items-center">

            {/* 主展示区 */}
            <motion.div
              layout
              className="relative flex-1"
            >
              {/* 装饰性背景光晕 */}
              <div className={`absolute -inset-4 bg-gradient-to-r ${activeData.color} opacity-20 blur-2xl -z-10 rounded-full`} />

              <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden group aspect-video">
                {/* Mac Window Header */}
                <MacWindowHeader
                  className="rounded-t-2xl"
                  title={
                    <>
                      <Sparkles size={10} /> banana_slides_pro_v2.0
                    </>
                  }
                />

                {/* 媒体内容 - 使用 AnimatePresence 实现平滑切换 */}
                <div className="w-full h-full relative overflow-hidden bg-slate-950">
                  <AnimatePresence mode="wait">
                    {activeData.images[currentImageIndex] && (
                      <motion.img
                        key={`${activeTab}-${currentImageIndex}`}
                        src={activeData.images[currentImageIndex].src}
                        alt={activeData.images[currentImageIndex].alt}
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }} // Crossfade
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </AnimatePresence>

                  {/* 底部渐变遮罩 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent pointer-events-none z-10" />
                </div>
              </div>

              {/* 倒影效果 */}
              <div className="absolute -bottom-8 left-4 right-4 h-8 bg-gradient-to-b from-black/10 to-transparent blur-xl transform scale-x-90 opacity-50" />
            </motion.div>

            {/* 垂直导航栏 (Vertical Dots) */}
            <div className="flex flex-col gap-3 items-center py-2 px-1 bg-white/50 backdrop-blur-sm rounded-full border border-white/60 shadow-sm">
              {activeData.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleManualSwitch(index)}
                  className="relative group p-1"
                  aria-label={`Switch to image ${index + 1}`}
                >
                  {/* 选中态：长条 */}
                  {index === currentImageIndex ? (
                    <motion.div
                      layoutId="activeDot"
                      className="w-1.5 h-6 rounded-full bg-slate-800"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  ) : (
                    /* 未选中态：圆点 */
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
                  )}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

