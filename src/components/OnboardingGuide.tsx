import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, Layout, Zap, History, MousePointer2 } from 'lucide-react';

interface GuideStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const STEPS: GuideStep[] = [
  {
    title: "欢迎来到多项目工作台",
    description: "现在您可以同时管理多个 PPT 创作任务，支持随时启动或暂停，灵活性大大提升。",
    icon: <Sparkles className="text-blue-500" size={32} />
  },
  {
    title: "效能数据实时监控",
    description: "顶部看板为您展示累计产出、节省工时等核心指标，直观量化 AI 带来的价值提升。",
    icon: <Zap className="text-amber-500" size={32} />
  },
  {
    title: "快捷置顶与检索",
    description: "点击卡片上的图钉即可置顶关键任务，通过搜索框快速在几十个项目中定位目标。",
    icon: <MousePointer2 className="text-emerald-500" size={32} />
  },
  {
    title: "风格模板一键复用",
    description: "右上角新增风格模板库，您可以挑选预设风格，或创建属于自己的高级配置模板。",
    icon: <Layout className="text-purple-500" size={32} />
  }
];

export const OnboardingGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="p-8 space-y-8 flex-1">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
            {step.icon}
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{step.title}</h3>
            <p className="text-slate-500 leading-relaxed">{step.description}</p>
          </div>

          <div className="flex gap-2">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-blue-600' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-8 bg-slate-50 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            跳过引导
          </button>
          
          <button 
            onClick={() => {
              if (currentStep < STEPS.length - 1) {
                setCurrentStep(prev => prev + 1);
              } else {
                onClose();
              }
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 group"
          >
            {currentStep === STEPS.length - 1 ? '立即开启' : '下一步'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
