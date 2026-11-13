import {
  Activity,
  Award,
  Calculator,
  ChevronDown,
  LogOut,
  PieChart,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { UserProfile } from '../hooks/useAuth';
import { PortfolioSummary } from '../lib/types';
import { ThemeSwitch } from './ThemeSwitch';

interface HeaderProps {
  portfolio: PortfolioSummary | null;
  onResetPortfolio?: () => Promise<any>;
  onOpenChargesCalc: () => void;
  onOpenSettings?: () => void;
  isConnected: boolean;
  userProfile: UserProfile | null;
  onSignInWithGoogle: () => Promise<any>;
  onSignOut: () => Promise<any>;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  onOpenChargesCalc,
  onOpenSettings,
  isConnected,
  userProfile,
  onSignInWithGoogle,
  onSignOut,
  onGoHome,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [istTimeStr, setIstTimeStr] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu]);

  // Check IST Market Hours (Mon-Fri 09:15 AM to 03:30 PM IST)
  useEffect(() => {
    function updateMarketStatus() {
      const now = new Date();
      // Format to IST
      const istOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setIstTimeStr(now.toLocaleTimeString('en-IN', istOptions));

      const istHoursStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
      });
      const istMinutesStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        minute: '2-digit',
      });
      const day = now.getDay(); // 0 = Sun, 6 = Sat

      const totalMinutes = parseInt(istHoursStr, 10) * 60 + parseInt(istMinutesStr, 10);
      const isWeekday = day >= 1 && day <= 5;
      const isOpen = isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
      setIsMarketOpen(isOpen);
    }

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Truncate long names to 15 chars max for the header pill
  const truncateName = (name: string, max = 15) =>
    name.length > max ? name.slice(0, max).trimEnd() + '…' : name;

  const initialCap = portfolio?.initial_capital ?? 1000000;
  const virtualCash = portfolio?.virtual_cash ?? 1000000;
  const deployedCapital = portfolio?.used_margin ?? 0;
  const availableCapital = portfolio?.available_margin ?? virtualCash;
  const totalEquity = portfolio?.total_equity ?? virtualCash;

  // Overall Net P&L = Current Total Account Equity - Base Starting Capital (10 Lakhs)
  const overallPnl = totalEquity - initialCap;
  const overallPnlPercent = ((overallPnl / initialCap) * 100).toFixed(2);
  const isProfit = overallPnl >= 0;

  return (
    <header className="bg-obsidian-800/90 backdrop-blur-md border-b border-obsidian-700 sticky top-0 z-30 px-3 sm:px-4 lg:px-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Market Hours Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group transition-all hover:opacity-90 active:scale-95 cursor-pointer focus:outline-none"
            title="Go to AbhyasTrade Home"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-blue/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-brand-cyan transition-colors">
                  Abhyas<span className="text-emerald-400">Trade</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-cyan border border-brand-blue/30">
                  NSE PWA
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-tabular">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                ></span>
                <span
                  className={isMarketOpen ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'}
                >
                  {isMarketOpen ? 'NSE Live (09:15 - 15:30 IST)' : 'Market Closed (15:30 IST)'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  &bull; {istTimeStr} IST
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Financial Metrics Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto py-0.5">
          {/* Total Capital */}
          <div className="bg-white dark:bg-obsidian-900/80 border border-slate-200/90 dark:border-obsidian-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <Wallet className="w-4 h-4 text-brand-blue dark:text-brand-cyan hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Total Capital
              </div>
              <div className="font-tabular text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                ₹
                {initialCap.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Available Capital */}
          <div className="bg-white dark:bg-obsidian-900/80 border border-slate-200/90 dark:border-obsidian-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <PieChart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Available Capital
              </div>
              <div className="font-tabular text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                ₹
                {availableCapital.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Deployed Capital */}
          <div className="bg-white dark:bg-obsidian-900/80 border border-slate-200/90 dark:border-obsidian-700/80 rounded-lg px-3 py-1.5 hidden md:flex items-center gap-2 shadow-sm">
            <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Deployed Capital
              </div>
              <div className="font-tabular text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                ₹
                {deployedCapital.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Overall Total PnL (Unrealized + Realized) */}
          <div
            className={`border rounded-lg px-3 py-1.5 flex items-center gap-2 transition-all shadow-sm ${
              isProfit
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 dark:glow-emerald'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 dark:glow-crimson'
            }`}
          >
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400 stroke-[2.2]" />
            )}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Overall P&L
              </div>
              <div className="font-tabular text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                <span>
                  {isProfit ? '+' : ''}₹
                  {overallPnl.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] opacity-90 font-bold">
                  ({isProfit ? '+' : ''}
                  {overallPnlPercent}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Google OAuth Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Charges Calculator Button */}
          <button
            onClick={onOpenChargesCalc}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-700/60 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-obsidian-600 transition-colors shadow-sm cursor-pointer"
            title="Brokerage & Regulatory Charges Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-brand-blue dark:text-brand-cyan" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          {/* Terminal Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-obsidian-700/60 hover:bg-slate-200 dark:hover:bg-obsidian-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-obsidian-600 transition-colors shadow-sm cursor-pointer"
            title="Terminal Settings & Theme"
          >
            <Settings className="w-3.5 h-3.5 text-brand-blue dark:text-brand-cyan" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-white dark:bg-obsidian-900 border border-slate-200/90 dark:border-obsidian-700 hover:border-brand-blue/60 transition shadow-sm cursor-pointer"
              title="Account Menu"
            >
              {userProfile?.avatarUrl && !avatarFailed ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setAvatarFailed(true)}
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-obsidian-700 shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-blue to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  {userProfile?.name ? (
                    userProfile.name[0]?.toUpperCase()
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
              )}
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 hidden md:inline">
                {truncateName(userProfile?.name || 'Trader')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-brand-blue dark:text-white' : ''}`}
              />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-obsidian-850 backdrop-blur-xl border border-slate-200 dark:border-obsidian-700 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-2.5">
                <div className="pb-2.5 border-b border-slate-200 dark:border-obsidian-700">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {userProfile?.name || 'Trader'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {userProfile?.email || ''}
                  </div>
                </div>

                {/* Appearance / Theme Switcher Single-liner */}
                <div className="space-y-1.5 pb-1 border-b border-slate-200 dark:border-obsidian-700/70">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400 px-0.5">
                    <span>Appearance</span>
                  </div>
                  <ThemeSwitch compact className="w-full justify-between" />
                </div>

                {/* Trader Rank & XP Progression Card */}
                {(() => {
                  const rank = portfolio?.trader_rank || {
                    level: portfolio?.trader_level || 1,
                    title: 'Jigyasu',
                    current_xp: portfolio?.trader_xp || 0,
                    next_level_xp: 250,
                    progress_percent: 0,
                  };

                  return (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-obsidian-900/90 border border-slate-200 dark:border-brand-cyan/25 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                          <span>Level {rank.level} • {rank.title}</span>
                        </span>
                        <span className="text-[10px] font-mono text-brand-blue dark:text-brand-cyan font-bold">
                          {rank.current_xp} XP
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-obsidian-950 rounded-full h-1.5 overflow-hidden border border-slate-300 dark:border-obsidian-700">
                        <div
                          className="bg-gradient-to-r from-brand-cyan to-brand-blue h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, rank.progress_percent))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Target: {rank.next_level_xp} XP</span>
                        <span>{rank.progress_percent}%</span>
                      </div>

                      {/* Take Daily Quiz Button */}
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onGoHome?.();
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-brand-blue/15 hover:bg-brand-blue/25 border border-brand-blue/30 text-brand-blue dark:text-brand-cyan text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-brand-blue dark:text-brand-cyan" />
                        <span>Take Daily Quiz (+50 XP)</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Settings Modal Button */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenSettings?.();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold border border-slate-200 dark:bg-obsidian-700/60 dark:hover:bg-obsidian-700 dark:text-slate-200 dark:hover:text-white dark:border-obsidian-600 transition flex items-center justify-between group active:scale-95 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-brand-blue dark:text-brand-cyan group-hover:rotate-45 transition-transform" />
                    <span>Terminal Settings</span>
                  </span>
                </button>

                {/* Logout Option */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onSignOut();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-500/30 transition flex items-center justify-between group active:scale-95 cursor-pointer"
                >
                  <span>Log Out</span>
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
