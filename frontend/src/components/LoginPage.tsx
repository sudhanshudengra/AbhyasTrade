import React, { useState } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Sparkles,
  Compass,
  CheckCircle2,
} from 'lucide-react';

interface LoginPageProps {
  onSignInWithGoogle: () => Promise<any>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSignInWithGoogle }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onSignInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMessage(err?.message || 'Could not connect to Google. Please check your Supabase OAuth setup.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-obsidian-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-[-10%] left-[20%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-brand-blue/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e2638_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-blue/20">
            <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white">
              Abhyas<span className="text-emerald-400">Trade</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-brand-blue/15 text-brand-cyan border border-brand-blue/30">
              NSE Terminal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-obsidian-900 border border-obsidian-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NSE Equity Live</span>
          </span>
        </div>
      </header>

      {/* Hero & Login Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8 relative z-10 max-w-4xl mx-auto text-center">
        
        {/* Sacred Sanskrit Shloka Banner */}
        <div className="w-full max-w-3xl bg-gradient-to-b from-obsidian-800/90 via-obsidian-900/90 to-obsidian-950/95 border border-amber-500/25 rounded-3xl p-5 sm:p-7 pt-7 sm:pt-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-8 group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-amber-300 py-2 px-2 leading-[1.8] sm:leading-[1.9] tracking-normal drop-shadow-[0_2px_12px_rgba(251,191,36,0.35)]">
            अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते ।
          </h2>
          <p className="text-[11px] sm:text-xs font-semibold text-amber-300/80 tracking-widest uppercase mt-1 font-mono">
            &ldquo;Abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate&rdquo;
          </p>

          <p className="text-xs sm:text-sm text-slate-300 mt-3 max-w-xl mx-auto font-medium leading-relaxed">
            &ldquo;Through continuous, disciplined practice (<span className="text-amber-300 font-bold">अभ्यास</span>) and emotional detachment (<span className="text-emerald-400 font-bold">वैराग्य</span>), market mastery is attained.&rdquo;
          </p>
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white max-w-3xl leading-[1.15] mb-4">
          Master NSE Trading with{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-brand-cyan bg-clip-text text-transparent">
            ₹10,00,000
          </span>{' '}
          Virtual Capital
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mb-8 leading-relaxed">
          Cultivate emotional discipline and test intraday (5x MIS) &amp; delivery (CNC) strategies in a high-fidelity virtual terminal with real-time NSE prices and exact SEBI regulatory charge calculations.
        </p>

        {/* Primary Auth Action Card */}
        <div className="w-full max-w-md bg-obsidian-900/90 border border-obsidian-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative group">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-brand-blue/10 to-transparent pointer-events-none" />

          {/* Continue with Google Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-white hover:bg-slate-100 text-obsidian-950 font-black text-sm shadow-xl hover:shadow-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-obsidian-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium text-left">
              {errorMessage}
            </div>
          )}

          {/* Value Props Pills */}
          <div className="mt-6 pt-6 border-t border-obsidian-800/80 flex items-center justify-around text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>1-Click OAuth</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero Financial Risk</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>₹10L Virtual Capital</span>
            </span>
          </div>
        </div>

        {/* 3 Pillars of Abhyasa in Trading Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 w-full max-w-4xl text-left">
          {/* Pillar 1 */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-obsidian-800/80 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-white">१. अनुशासन (Discipline)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Define your Stop-Loss on every trade. Enforce strict capital protection and 1-2% position sizing.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-obsidian-800/80 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-amber-950 text-amber-400">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-white">२. धैर्य (Patience)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Conquer emotional impulses and FOMO. Wait patiently for high-probability setups at key levels.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-2xl bg-obsidian-900/60 border border-obsidian-800/80 hover:border-brand-blue/30 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-1.5 rounded-lg bg-brand-blue/20 text-brand-cyan">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-extrabold text-white">३. अभ्यास (Practice)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hone strategies risk-free on real-time NSE ticks with ₹10,00,000 virtual balance and exact charges.
            </p>
          </div>
        </div>

        {/* Google OAuth & Data Usage Disclosure (Required by Google Trust & Safety) */}
        <div className="mt-8 w-full max-w-4xl p-6 rounded-2xl bg-obsidian-900/70 border border-obsidian-800 text-left">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Why We Request Your Google User Data &amp; How It Is Used
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            AbhyasTrade is an educational, zero-risk virtual stock trading terminal designed for learning Indian Equity markets. When you sign in with Google, we only request standard, non-sensitive profile permissions (<span className="text-slate-200 font-semibold">email, name, and profile picture</span>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-300">
            <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800/80">
              <span className="font-bold text-emerald-400 block mb-1">1. Purpose of Data Collection</span>
              Your email is used solely to authenticate your session and create a private, isolated virtual paper trading account with ₹10,00,000 virtual balance.
            </div>
            <div className="p-3 rounded-xl bg-obsidian-950/80 border border-obsidian-800/80">
              <span className="font-bold text-brand-cyan block mb-1">2. Strict Privacy &amp; Non-Disclosure</span>
              We never access passwords, contacts, or Google Drive files. We never sell, share, or monetize user information. You can delete your account and data anytime.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-6 text-center text-xs text-slate-500 border-t border-obsidian-900 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <div>
          AbhyasTrade &copy; {new Date().getFullYear()} &bull; Built for Indian Equity Traders &bull; Educational Virtual Trading Environment
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
          <a href="/privacy" className="hover:text-brand-cyan transition-colors">
            Privacy Policy
          </a>
          <span>&bull;</span>
          <a href="/terms" className="hover:text-emerald-400 transition-colors">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
};
