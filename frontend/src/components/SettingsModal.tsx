import {
  ExternalLink,
  RotateCcw,
  Settings,
  ShieldCheck,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPortfolio?: () => Promise<any>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetPortfolio,
}) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('abhyastrade_sound_enabled') !== 'false';
  });
  const [flashingEnabled, setFlashingEnabled] = useState<boolean>(() => {
    return localStorage.getItem('abhyastrade_tick_flashing') !== 'false';
  });
  const [defaultProductType, setDefaultProductType] = useState<'MIS' | 'CNC'>(() => {
    return (localStorage.getItem('abhyastrade_default_product') as 'MIS' | 'CNC') || 'MIS';
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('abhyastrade_sound_enabled', next.toString());
      return next;
    });
  };

  const handleToggleFlashing = () => {
    setFlashingEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('abhyastrade_tick_flashing', next.toString());
      return next;
    });
  };

  const handleChangeProductType = (type: 'MIS' | 'CNC') => {
    setDefaultProductType(type);
    localStorage.setItem('abhyastrade_default_product', type);
  };

  const handleReset = async () => {
    if (!onResetPortfolio) return;
    setIsResetting(true);
    try {
      await onResetPortfolio();
      setShowResetConfirm(false);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white dark:bg-obsidian-850 border border-slate-200 dark:border-obsidian-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-obsidian-700/80 bg-slate-50 dark:bg-obsidian-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-blue/15 border border-brand-blue/30 flex items-center justify-center text-brand-blue dark:text-brand-cyan">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Terminal Settings
              </h2>
              <p className="text-xs text-slate-500">Trading preferences & account controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-obsidian-700/60 transition cursor-pointer"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Trading & Interface Preferences */}
          <div className="space-y-4">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
              Trading Preferences
            </span>

            {/* Default Product Type (MIS vs CNC) */}
            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Default Product Type
                </div>
                <div className="text-xs text-slate-500">
                  Pre-selected product type on order tickets
                </div>
              </div>
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-obsidian-950/80 border border-slate-200 dark:border-obsidian-700/80">
                <button
                  type="button"
                  onClick={() => handleChangeProductType('MIS')}
                  className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    defaultProductType === 'MIS'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  MIS (Intraday)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeProductType('CNC')}
                  className={`py-1 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    defaultProductType === 'CNC'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  CNC (Delivery)
                </button>
              </div>
            </div>

            {/* Real-time Tick Flashes */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Live Tick Flashing
                  </div>
                  <div className="text-xs text-slate-500">
                    Flash green/red animations when prices update
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleFlashing}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  flashingEnabled ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-obsidian-700'
                }`}
                aria-label="Toggle tick flashing"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    flashingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Sound & Haptic Effects */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Order Audio Effects
                  </div>
                  <div className="text-xs text-slate-500">
                    Audible confirmation on order placement & execution
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                  soundEnabled ? 'bg-brand-blue' : 'bg-slate-300 dark:bg-obsidian-700'
                }`}
                aria-label="Toggle order sound effects"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-obsidian-700/60" />

          {/* Account & Capital Management */}
          {onResetPortfolio && (
            <div className="space-y-3">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400">
                Portfolio Controls
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-900/80 border border-slate-200 dark:border-obsidian-700/80 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Virtual Starting Capital
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Reset portfolio balance back to ₹10,00,000.00
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset (₹10L)</span>
                </button>
              </div>
            </div>
          )}

          {/* Legal & App Details */}
          <div className="pt-2 text-center text-xs text-slate-500 space-y-1.5">
            <div className="flex items-center justify-center gap-4">
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-blue dark:hover:text-brand-cyan transition inline-flex items-center gap-1"
              >
                Privacy Policy <ExternalLink className="w-3 h-3" />
              </a>
              <span>&bull;</span>
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-blue dark:hover:text-brand-cyan transition inline-flex items-center gap-1"
              >
                Terms of Service <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-600">
              AbhyasTrade Terminal v1.0 • Real-Time NSE Paper Trading
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-obsidian-700/80 bg-slate-50 dark:bg-obsidian-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-600 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-obsidian-850 border border-slate-200 dark:border-obsidian-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500 mb-3">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Reset Virtual Capital?
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
              This will restore your portfolio to the default{' '}
              <strong className="text-emerald-500 font-tabular">₹10,00,000.00</strong> virtual
              capital and clear all open positions, pending orders, and trade history for this
              account.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-obsidian-700 dark:hover:bg-obsidian-600 dark:text-slate-200 text-sm font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  'Confirm Reset'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
