import React from 'react';
import { Rocket, Zap, BookOpen, Presentation, Palette, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-slate-100 py-20 lg:py-32">
        <div className="max-w-[1480px] mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-100 rounded-full text-rose-600 text-sm font-semibold mb-2">
                <Sparkles size={14} /> m ZpfVtPcx(?AI HgmTYUZeZ0[0S
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight">
                BananaSlides <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500">
                  tA%Wcmn?mȓY]?                </span>
              </h1>
              <p className="text-xl text-slate-500 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                3lC~œ?XQV+hkYtUN|m:j[m^4U9pEx}TB%Yȓ$}bnÓ%1jn/uMPC%mq~zO`(R^Xi}`m^4deZRUZeZ0fpj?              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <button
                  onClick={onEnter}
                  className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95"
                >
                  k igmSRm}9p?                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-slate-400 text-sm flex items-center gap-2">
                  <ShieldCheck size={16} /> ~ Wfi"? "X]wEQ{
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-blue-400/10 blur-[120px] rounded-full"></div>
              <div className="relative bg-white/40 backdrop-blur-sm p-4 rounded-[40px] border border-white/50 shadow-2xl overflow-hidden group">
                <img 
                  src="/C:/Users/hangy/.gemini/antigravity/brain/e39b9da3-a6ed-4c26-81a4-92e1a0151b58/landing_hero_mockup_1768388743413.png" 
                  alt="BananaSlides Hero" 
                  className="rounded-[32px] w-full h-auto shadow-sm group-hover:scale-[1.02] transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-[1480px] mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold text-slate-900">mp{m-lw-lA_nmYT?/h2>
            <p className="text-slate-500">BananaSlides /uYm]`hUYq(RWcmn nT?mBi;jeffb0HgPcG?/p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AudienceCard 
              icon={<Palette className="text-rose-500" />}
              title="tPcx/u?
              desc="Q_v]2(Ri*a{PS[0}}\vǓQg?~`YfS͓?z>~RmpR(RX~#1 ?
            />
            <AudienceCard 
              icon={<Presentation className="text-blue-500" />}
              title="|mwO{YVYp?
              desc="f'1cigk[&1anPT}G qSe0a f}ZnTj}OKYt
Y}cmdkmd{YVY?
            />
            <AudienceCard 
              icon={<BookOpen className="text-indigo-500" />}
              title="k{kp?
              desc="ǓxNɓ`tnOpUgp@iG0~6FmV&hsɅDHgmTYtS](RKYt
Y[tS"k?
            />
            <AudienceCard 
              icon={<Rocket className="text-emerald-500" />}
              title="t(}p?
              desc="HgmTY˓R~@`md{͓VoV(R(}~pWok}ZnTj["XG^$i-W0m͓?z>~PmTᆒ?
            />
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-white">
        <div className="max-w-[1480px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-12">
              <h2 className="text-4xl font-bold tracking-tight">bnOk^e(RWcmnsrG?/h2>
              <div className="space-y-8">
                <ValueItem 
                  icon={<Zap size={24} className="text-amber-500" />}
                  title="o-lh+[jsɅ]cm?
                  desc="RC%dem]` AI Y3 7pf)1 f}m^4U9p{(R{!S}mpMP*a}ǓQg`UkdOVG0~ct ?
                />
                <ValueItem 
                  icon={<Sparkles size={24} className="text-blue-500" />}
                  title="YtUNhR~d|"
                  desc="PoTu_C~md{tQ/v(Rx^ɓ!S}tE%jotPcx\mTamqXQHgpWm w[kYtUNYQg?
                />
                <ValueItem 
                  icon={<ArrowRight size={24} className="text-rose-500" />}
                  title="~ Wf0#oTk[0}4Z?
                  desc="`m^gYHvRW.aX5pNqV}\VeYXQZ%XjP>i}Y0\UZeZ0QU,ep}ȓ]?
                />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="aspect-square bg-blue-50 rounded-3xl p-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-blue-600">80%</div>
                <div className="text-sm font-bold text-slate-500">cX"X]|m:j[</div>
              </div>
              <div className="aspect-square bg-indigo-50 rounded-3xl p-8 translate-y-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-indigo-600">Pure</div>
                <div className="text-sm font-bold text-slate-500">ccV(RKYtY0Hg?/div>
              </div>
              <div className="aspect-square bg-rose-50 rounded-3xl p-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-rose-600">Smart</div>
                <div className="text-sm font-bold text-slate-500">Z"X`(?AI HgmTY</div>
              </div>
              <div className="aspect-square bg-slate-50 rounded-3xl p-8 translate-y-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-slate-800">Seamless</div>
                <div className="text-sm font-bold text-slate-500">4ZzO`f(R0)x?/div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-20"></div>
        <div className="max-w-[1480px] mx-auto px-6 text-center space-y-8 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
            [ Z?m^g~o(R(}~TWcm?          </h2>
          <p className="text-blue-100 text-xl max-w-2xl mx-auto">
            TrS BananaSlides~\Y~`Y#k|o Q ?          </p>
          <button 
            onClick={onEnter}
            className="px-12 py-5 bg-white text-blue-600 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/20"
          >
            ~*[F]"2PRm}9p?          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-[1480px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg"></div>
            <span className="font-bold text-slate-900">BananaSlides</span>
          </div>
          <div className="text-slate-400 text-sm">
            o 2026 BananaSlides-GenAI. mof ȓYHoR?% ?          </div>
        </div>
      </footer>
    </div>
  );
};

const AudienceCard = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all hover:-translate-y-2 group shadow-sm hover:shadow-xl">
    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 group-hover:bg-white transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
  </div>
);

const ValueItem = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex gap-6 group">
    <div className="shrink-0 w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-blue-100 transition-all">
      {icon}
    </div>
    <div className="space-y-1">
      <h4 className="text-lg font-bold">{title}</h4>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);

export default LandingPage;
