import {
  Activity,
  Calculator,
  ChevronDown,
  LogOut,
  PieChart,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User,
  Wallet
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { UserProfile } from '../hooks/useAuth'
import { PortfolioSummary } from '../lib/types'

interface HeaderProps {
  portfolio: PortfolioSummary | null
  onResetPortfolio: () => Promise<any>
  onOpenChargesCalc: () => void
  isConnected: boolean
  userProfile: UserProfile | null
  onSignInWithGoogle: () => Promise<any>
  onSignOut: () => Promise<any>
}

export const Header: React.FC<HeaderProps> = ({
  portfolio,
  onResetPortfolio,
  onOpenChargesCalc,
  isConnected,
  userProfile,
  onSignInWithGoogle,
  onSignOut
}) => {
  const [isResetting, setIsResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [isMarketOpen, setIsMarketOpen] = useState(false)
  const [istTimeStr, setIstTimeStr] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showUserMenu])

  // Check IST Market Hours (Mon-Fri 09:15 AM to 03:30 PM IST)
  useEffect(() => {
    function updateMarketStatus() {
      const now = new Date()
      // Format to IST
      const istOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }
      setIstTimeStr(now.toLocaleTimeString('en-IN', istOptions))

      const istHoursStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit'
      })
      const istMinutesStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        minute: '2-digit'
      })
      const day = now.getDay() // 0 = Sun, 6 = Sat

      const totalMinutes =
        parseInt(istHoursStr, 10) * 60 + parseInt(istMinutesStr, 10)
      const isWeekday = day >= 1 && day <= 5
      const isOpen =
        isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30
      setIsMarketOpen(isOpen)
    }

    updateMarketStatus()
    const interval = setInterval(updateMarketStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  // Truncate long names to 15 chars max for the header pill
  const truncateName = (name: string, max = 15) =>
    name.length > max ? name.slice(0, max).trimEnd() + '…' : name;

  const virtualCash = portfolio?.virtual_cash ?? 1000000
  const usedMargin = portfolio?.used_margin ?? 0
  const availableMargin = portfolio?.available_margin ?? virtualCash
  const unrealizedPnl = portfolio?.total_unrealized_pnl ?? 0
  const realizedPnl = portfolio?.total_realized_pnl ?? 0
  const totalPnl = unrealizedPnl + realizedPnl
  const totalEquity = portfolio?.total_equity ?? virtualCash

  const isProfit = totalPnl >= 0

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await onResetPortfolio()
      setShowResetConfirm(false)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <header className="bg-obsidian-800/90 backdrop-blur-md border-b border-obsidian-700 sticky top-0 z-30 px-3 sm:px-4 lg:px-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Market Hours Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-blue/20">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Abhyas<span className="text-emerald-400">Trade</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-cyan border border-brand-blue/30">
                  NSE PWA
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-tabular">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}
                ></span>
                <span
                  className={
                    isMarketOpen
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-400'
                  }
                >
                  {isMarketOpen
                    ? 'NSE Live (09:15 - 15:30 IST)'
                    : 'Market Closed (15:30 IST)'}
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                  &bull; {istTimeStr} IST
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto py-0.5">
          {/* Total Capital / Equity */}
          <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-cyan hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Total Capital
              </div>
              <div className="font-tabular text-xs sm:text-sm font-bold text-slate-100">
                ₹
                {totalEquity.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          {/* Available Margin */}
          <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400 hidden sm:block" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Available Margin
              </div>
              <div className="font-tabular text-xs sm:text-sm font-bold text-emerald-400">
                ₹
                {availableMargin.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          {/* Used Margin */}
          <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-lg px-3 py-1.5 hidden md:flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Used Margin
              </div>
              <div className="font-tabular text-xs sm:text-sm font-semibold text-slate-300">
                ₹
                {usedMargin.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>
          </div>

          {/* Today's Total PnL (Unrealized + Realized) */}
          <div
            className={`border rounded-lg px-3 py-1.5 flex items-center gap-2 transition-all ${
              isProfit
                ? 'bg-emerald-950/30 border-emerald-500/30 glow-emerald text-emerald-400'
                : 'bg-rose-950/30 border-rose-500/30 glow-crimson text-rose-400'
            }`}
          >
            {isProfit ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Today&apos;s P&L
              </div>
              <div className="font-tabular text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                <span>
                  {isProfit ? '+' : ''}₹
                  {totalPnl.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
                <span className="text-[10px] opacity-80">
                  (
                  {portfolio?.day_pnl_percent
                    ? portfolio.day_pnl_percent >= 0
                      ? `+${portfolio.day_pnl_percent}%`
                      : `${portfolio.day_pnl_percent}%`
                    : '0.00%'}
                  )
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-obsidian-700/60 hover:bg-obsidian-700 text-slate-300 hover:text-white text-xs font-medium border border-obsidian-600 transition-colors"
            title="Brokerage & Regulatory Charges Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-brand-cyan" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          {/* Reset Capital Button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-obsidian-700/60 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-medium border border-obsidian-600 hover:border-rose-500/40 transition-colors"
            title="Reset Virtual Balance to ₹10,00,000"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset ₹10L</span>
          </button>

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-obsidian-900 border border-obsidian-700 hover:border-brand-blue/60 transition shadow-md"
              title="Account Menu"
            >
              {userProfile?.avatarUrl && !avatarFailed ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setAvatarFailed(true)}
                  className="w-7 h-7 rounded-lg object-cover border border-obsidian-700 shadow-sm"
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
              <span className="text-xs font-bold text-slate-200 hidden md:inline">
                {truncateName(userProfile?.name || 'Trader')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180 text-white' : ''}`}
              />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-obsidian-800/95 backdrop-blur-xl border border-obsidian-700 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                <div className="pb-2.5 mb-2.5 border-b border-obsidian-700">
                  <div className="font-extrabold text-sm text-white truncate">
                    {userProfile?.name || 'Trader'}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {userProfile?.email || ''}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    onSignOut()
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold border border-rose-500/30 transition flex items-center justify-between group active:scale-95"
                >
                  <span>Log Out</span>
                  <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">
                Reset Virtual Capital?
              </h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              This will restore your portfolio to the default{' '}
              <span className="text-emerald-400 font-bold font-tabular">
                ₹10,00,000.00
              </span>{' '}
              virtual capital and clear all open positions, pending orders, and
              trade history for this account.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-obsidian-700 hover:bg-obsidian-600 text-slate-200 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition flex items-center gap-2"
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
    </header>
  )
}
