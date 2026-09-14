import React from 'react';
import { ArrowLeft, BookOpen, AlertTriangle, ShieldCheck, Mail } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-200 font-sans p-6 sm:p-12 selection:bg-brand-blue/30 selection:text-white">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:text-emerald-400 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to AbhyasTrade Terminal</span>
        </a>

        <div className="bg-obsidian-900 border border-obsidian-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8">
          {/* Header */}
          <div className="border-b border-obsidian-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Terms of Service for AbhyasTrade
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              1. Educational Simulation Disclaimer
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              AbhyasTrade is strictly a <strong>virtual paper trading simulation platform</strong> built for learning and practicing stock market trading. All currency, cash balances (₹10,00,000), profits, losses, and order executions are entirely simulated with virtual money. No real funds or financial transactions occur on this platform.
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              2. Not Financial Advice
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              The market information, price charts, regulatory charge calculations, and analytics presented on AbhyasTrade are for educational and simulation purposes only. None of the content provided constitutes investment, financial, or trading advice.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">3. User Accounts & Authenticity</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Users authenticate via Google Sign-In to preserve their personal simulation state. You agree to use the service responsibly and not to attempt any unauthorized access or abuse of the infrastructure.
            </p>
          </div>

          {/* Section 4 */}
          <div className="border-t border-obsidian-800 pt-6 space-y-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-cyan" />
              4. Contact Information
            </h2>
            <p className="text-sm text-slate-300">
              For any questions regarding these Terms of Service, contact:
            </p>
            <a
              href="mailto:sudhanshudengra.tdc@gmail.com"
              className="inline-block text-brand-cyan hover:underline font-mono text-sm font-semibold"
            >
              sudhanshudengra.tdc@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
