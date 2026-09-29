import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Compass,
  TrendingUp,
  Target,
} from 'lucide-react';

interface AbhyasLearningScreenProps {
  onSelectSymbol?: (symbol: string) => void;
  onOpenChargesCalc?: () => void;
}

export const AbhyasLearningScreen: React.FC<AbhyasLearningScreenProps> = () => {
  return (
    <div className="w-full h-full overflow-y-auto bg-obsidian-950/90 text-slate-100 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-12 flex flex-col items-center justify-start relative select-none scrollbar-thin scrollbar-thumb-obsidian-700">
      {/* Ambient Glowing Background Lights */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[400px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content Wrapper */}
      <div className="w-full max-w-4xl flex flex-col items-center relative z-10 space-y-4 sm:space-y-6">
        
        {/* Sacred Sanskrit Shloka Hero Card */}
        <div className="w-full bg-gradient-to-b from-obsidian-800/90 via-obsidian-900/90 to-obsidian-950/95 border border-amber-500/25 rounded-3xl p-5 sm:p-6 pt-5 sm:pt-6 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center group">
          {/* Subtle Golden Glow Accents */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-10 bg-amber-400/15 blur-xl rounded-full pointer-events-none" />

          {/* The Devanagari Shloka */}
          <div className="my-0.5 sm:my-1">
            <h2 className="text-2xl sm:text-3xl md:text-[32px] font-bold text-amber-300 py-1.5 px-2 leading-[1.6] sm:leading-[1.7] tracking-normal drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
              अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ।
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-amber-300/80 tracking-widest uppercase mt-1 font-mono">
              &ldquo;Abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate&rdquo;
            </p>
          </div>

          {/* Translation & Trading Essence */}
          <div className="mt-5 pt-5 border-t border-obsidian-700/60 text-center max-w-2xl mx-auto space-y-2">
            <p className="text-sm sm:text-base font-semibold text-slate-200 leading-relaxed">
              &ldquo;Through continuous, disciplined practice (<span className="text-amber-300 font-bold">अभ्यास</span>) and emotional detachment (<span className="text-emerald-400 font-bold">वैराग्य</span>), even the most volatile mind and complex mastery are conquered.&rdquo;
            </p>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              Trading success is 80% emotional psychology and 20% technical strategy. AbhyasTrade gives you the sacred, zero-risk arena to build trader discipline, master risk management, and sharpen instincts before risking real capital.
            </p>
          </div>
        </div>

        {/* Ready to Learn & Grow: 3 Pillars of Abhyasa in Trading */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                Ready to Learn &amp; Grow • 3 Pillars of Abhyāsa (त्रिरत्न)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Select any stock from the watchlist to trade
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: Anushasan */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-emerald-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Pillar 1</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">१. अनुशासन (Discipline)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Protect your capital first. Always define your Stop-Loss trigger before entering. Never risk more than 1–2% of portfolio per trade.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                <span>Risk Management</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30">Stop-Loss Rules</span>
              </div>
            </div>

            {/* Pillar 2: Dhairya */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pillar 2</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">२. धैर्य (Patience)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Eliminate FOMO and emotional chasing. Wait for price confirmation at key support &amp; resistance levels with steady mental composure.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                <span>Trader Psychology</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/30">Zero FOMO</span>
              </div>
            </div>

            {/* Pillar 3: Abhyasa */}
            <div className="bg-obsidian-900/80 hover:bg-obsidian-800/80 border border-obsidian-700/70 hover:border-brand-blue/40 rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group shadow-lg">
              <div>
                <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-cyan mb-3 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">Pillar 3</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-sm font-extrabold text-white">३. अभ्यास (Practice)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Test intraday (5x MIS) and delivery (CNC) strategies on live NSE ticks with ₹10,00,000 simulated capital and exact brokerage calculations.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-obsidian-800 flex items-center justify-between text-[11px] text-brand-cyan font-semibold">
                <span>Execution Mastery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 border border-brand-blue/30">₹10L Virtual Capital</span>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Subhashitam Reflection */}
        <div className="text-center text-[11px] sm:text-xs text-slate-500 max-w-lg pt-2 pb-2">
          <p className="italic font-serif text-slate-400">
            &ldquo;करत करत अभ्यास के जड़मति होत सुजान । रसरी आवत जात ते सिल पर परत निसान ॥&rdquo;
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            AbhyasTrade • Cultivating disciplined, confident Indian traders through deliberate practice.
          </p>
        </div>

      </div>
    </div>
  );
};
