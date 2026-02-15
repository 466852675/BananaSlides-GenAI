import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Presentation, FileText, Image as ImageIcon, Check, MousePointer2 } from 'lucide-react';

const DELIVERY_ITEMS = [
    {
        id: 'pptx',
        label: "PowerPoint 生态",
        title: "原生 .pptx 高保真导出",
        desc: "支持导出为标准的 PowerPoint 文件，完美还原排版布局，确保在不同设备上的显示效果一致。",
        icon: <Presentation size={20} />,
        src: "/assets/showcase/01-智能生产力链路/13-PPT导出-PowerPoint原生导出体验+支持二次编辑+确保演示万无一失.gif"
    },
    {
        id: 'pdf',
        label: "PDF 阅读器",
        title: "跨端矢量 PDF 展示",
        desc: "生成像素级精度的 PDF 文件，无论在平板还是大屏投影，都能保持极速流畅的翻页体验。",
        icon: <FileText size={20} />,
        src: "/assets/showcase/01-智能生产力链路/12-成果演示-PDF全屏演示预览+高保真视觉效果+让您的汇报更具感染力.png"
    },
    {
        id: 'image',
        label: "图片分发",
        title: "超高清图片包导出",
        desc: "一键打包所有幻灯片为超高清图片，适配社交媒体分享或快速离线查阅。",
        icon: <ImageIcon size={20} />,
        src: "/assets/showcase/01-智能生产力链路/11-图片包导出-超高清图片包导出+快速分享与分发+适配任何社交媒体终端.gif"
    }
];

export const DeliveryShowcase: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isBadgeHovered, setIsBadgeHovered] = useState(false);

    return (
        <section className="py-32 bg-[#0a0a1a] text-white overflow-hidden relative">
            {/* Background Decorative Blur */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row gap-16 items-center">

                    {/* LEFT: Visual Showcase with Floating Effects */}
                    <div className="w-full lg:w-1/2 relative group">
                        {/* Main Window */}
                        <motion.div
                            layout
                            className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-3xl p-2 shadow-2xl"
                        >
                            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeIndex}
                                        src={DELIVERY_ITEMS[activeIndex].src}
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.5, ease: "circOut" }}
                                        className="w-full h-full object-cover"
                                    />
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* Floating Badge (Floating Stack Animation) */}
                        <motion.div
                            onMouseEnter={() => setIsBadgeHovered(true)}
                            onMouseLeave={() => setIsBadgeHovered(false)}
                            animate={isBadgeHovered ? { scale: 1.1, rotate: 3 } : { y: [0, -15, 0], scale: 1, rotate: 0 }}
                            transition={{ duration: isBadgeHovered ? 0.3 : 4, repeat: isBadgeHovered ? 0 : Infinity, ease: "easeInOut" }}
                            className="absolute -top-8 -right-8 w-24 h-24 bg-blue-600 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-4 border border-blue-400/50 cursor-pointer"
                        >
                            <FileDown size={32} className="text-white mb-2" />
                            <span className="text-[10px] font-black uppercase">EXPORT</span>
                        </motion.div>
                    </div>

                    {/* RIGHT: Content & Accordion */}
                    <div className="w-full lg:w-1/2 space-y-10">
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest"
                            >
                                <Check size={12} /> 高端交付方案
                            </motion.div>
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                                交付，<br />
                                <span className="text-blue-500">从来不是</span> 创作的终点
                            </h2>
                            <p className="text-slate-400 text-lg">
                                YH-AI PPT 确保您的每一份努力都能以最高标准分发。从图片嵌入 PPTX 到高保真 PDF，满足各行各业的交付需求。
                            </p>
                        </div>

                        {/* Accordion List */}
                        <div className="space-y-4">
                            {DELIVERY_ITEMS.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveIndex(idx)}
                                    className={`w-full text-left p-6 rounded-2xl border transition-all duration-300 ${activeIndex === idx
                                        ? 'bg-white/5 border-blue-500/50 shadow-lg shadow-blue-500/5'
                                        : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeIndex === idx ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'
                                            }`}>
                                            {item.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-bold uppercase tracking-widest ${activeIndex === idx ? 'text-blue-400' : 'text-slate-600'
                                                    }`}>
                                                    {item.label}
                                                </span>
                                                {activeIndex === idx && <MousePointer2 size={12} className="text-blue-500" />}
                                            </div>
                                            <h4 className="text-lg font-black text-slate-100">{item.title}</h4>
                                            {activeIndex === idx && (
                                                <motion.p
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="text-sm text-slate-400 mt-2 leading-relaxed"
                                                >
                                                    {item.desc}
                                                </motion.p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
