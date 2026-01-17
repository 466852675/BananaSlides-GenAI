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
                <Sparkles size={14} /> 涓€娆炬噦璁捐鐨?AI 杈呭姪婕旂ず宸ュ叿
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight">
                BananaSlides <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500">
                  璁╁垱浣滄洿鏈夎川鎰?                </span>
              </h1>
              <p className="text-xl text-slate-500 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                閫氳繃鏅鸿兘鍖栫殑瑙嗚浼樺寲涓庡唴瀹硅緟鍔╂妧鏈紝鎴戜滑鏃ㄥ湪甯偍缂╃煭绻佺悙鐨勬帓鐗堟椂闂达紝浠庡搴斿鍚勭被婕旂ず鍦烘櫙銆?              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
                <button
                  onClick={onEnter}
                  className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:scale-95"
                >
                  馃殌 杩涘叆鍒涗綔瀹?                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="text-slate-400 text-sm flex items-center gap-2">
                  <ShieldCheck size={16} /> 绠€鍗曟槗鐢?路 鏁堢巼鑷充笂
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
            <h2 className="text-3xl font-bold text-slate-900">涓轰笓涓氭矡閫氭彁渚涘姪鍔?/h2>
            <p className="text-slate-500">BananaSlides 甯姪涓嶅悓棰嗗煙鐨勫垱浣滆€呮洿楂樻晥鍦拌〃杈捐鐐?/p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AudienceCard 
              icon={<Palette className="text-rose-500" />}
              title="璁捐甯?
              desc="鍑忓皯閲嶅鐨勫榻愪笌閫傞厤宸ヤ綔锛屽皢鏇村绮惧姏鎶曞叆鏍稿績鍒涙剰鐨勬墦纾ㄣ€?
            />
            <AudienceCard 
              icon={<Presentation className="text-blue-500" />}
              title="浼佷笟姹囨姤鑰?
              desc="鍦ㄧ揣杩殑鍛ㄦ湡鍐咃紝蹇€熺敓鎴愰€昏緫娓呮櫚銆佽瑙夊緱浣撶殑涓撲笟姹囨姤銆?
            />
            <AudienceCard 
              icon={<BookOpen className="text-indigo-500" />}
              title="鏁欏笀鏁欏鑰?
              desc="鏇磋交鏉惧湴灏嗘枃瀛楀ぇ绾茶浆鍖栦负鑳藉杈呭姪璁叉巿鐨勮瑙夊寲璇句欢銆?
            />
            <AudienceCard 
              icon={<Rocket className="text-emerald-500" />}
              title="璺紨鑰?
              desc="杈呭姪鏋勫缓绗﹀悎涓撲笟鏍囧噯鐨勬紨绀烘潗鏂欙紝娓呮櫚鍛堢幇椤圭洰鏍稿績鍐呭銆?
            />
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-24 bg-white">
        <div className="max-w-[1480px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-20">
            <div className="flex-1 space-y-12">
              <h2 className="text-4xl font-bold tracking-tight">鎴戜滑鍏虫敞鐨勫垱浣滄牳蹇?/h2>
              <div className="space-y-8">
                <ValueItem 
                  icon={<Zap size={24} className="text-amber-500" />}
                  title="澶氭ā鍨嬫櫤鑳藉崗浣?
                  desc="鍒╃敤涓嶅悓 AI 妯″瀷鍦ㄩ€昏緫涓庡唴瀹逛笂鐨勪笓闀匡紝涓烘偍鎻愪緵鏇村悎鐞嗙殑骞荤伅鐗囧ぇ绾插缓璁€?
                />
                <ValueItem 
                  icon={<Sparkles size={24} className="text-blue-500" />}
                  title="瑙嗚棰勮绯荤粺"
                  desc="鍐呯疆缁忚繃涓撲笟璋冭瘯鐨勫缇庢ā鏉匡紝璁╅潪璁捐浜哄憳涔熻兘杈炬垚涓€鑷寸殑瑙嗚姘村钩銆?
                />
                <ValueItem 
                  icon={<ArrowRight size={24} className="text-rose-500" />}
                  title="绠€鍗曢『鐣呯殑宸ヤ綔娴?
                  desc="浠庢枃妗ｈ瘑鍒埌鎴愮墖瀵煎嚭锛屽敖鍙兘娑堥櫎鍐椾綑姝ラ锛岃婕旂ず鍑嗗鍥炲綊鏈川銆?
                />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="aspect-square bg-blue-50 rounded-3xl p-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-blue-600">80%</div>
                <div className="text-sm font-bold text-slate-500">鎺掔増鏁堢巼浼樺寲</div>
              </div>
              <div className="aspect-square bg-indigo-50 rounded-3xl p-8 translate-y-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-indigo-600">Pure</div>
                <div className="text-sm font-bold text-slate-500">骞插噣鐨勮瑙夎〃杈?/div>
              </div>
              <div className="aspect-square bg-rose-50 rounded-3xl p-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-rose-600">Smart</div>
                <div className="text-sm font-bold text-slate-500">鍚堢悊鐨?AI 杈呭姪</div>
              </div>
              <div className="aspect-square bg-slate-50 rounded-3xl p-8 translate-y-8 flex flex-col justify-end gap-4 shadow-sm">
                <div className="text-4xl font-black text-slate-800">Seamless</div>
                <div className="text-sm font-bold text-slate-500">娴佺晠鐨勯」鐩鐞?/div>
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
            寮€鍚洿杞绘澗鐨勬紨绀哄垱浣?          </h2>
          <p className="text-blue-100 text-xl max-w-2xl mx-auto">
            鍔犲叆 BananaSlides锛屾妸绮惧姏鐣欑粰鎬濊€冦€?          </p>
          <button 
            onClick={onEnter}
            className="px-12 py-5 bg-white text-blue-600 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/20"
          >
            绔嬪嵆鎺㈢储鍒涗綔瀹?          </button>
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
            漏 2026 BananaSlides-GenAI. 淇濈暀鎵€鏈夋潈鍒┿€?          </div>
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
