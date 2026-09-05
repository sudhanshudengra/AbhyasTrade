import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Percent,
  Award,
  Receipt,
  Scale
} from 'lucide-react';
import { PortfolioSummary as IPortfolioSummary, Trade } from '../lib/types';

interface PortfolioSummaryProps {
  portfolio: IPortfolioSummary | null;
  trades: Trade[];
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ portfolio, trades }) => {
  const initialCap = portfolio?.initial_capital ?? 1000000;
  const equity = portfolio?.total_equity ?? initialCap;
  const netReturn = equity - initialCap;
  const netReturnPct = ((netReturn / initialCap) * 100).toFixed(2);
  const isOverallProfitable = netReturn >= 0;

  // Compute trade stats
  const totalTrades = trades.length;
  const totalCharges = portfolio?.total_charges_paid ?? 0;

  return (
    <div className="flex flex-col h-full bg-obsidian-900 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-obsidian-800 via-obsidian-800 to-obsidian-700/80 border border-obsidian-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Account Value / Net Worth
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-tabular mt-1">
              ₹{equity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isOverallProfitable ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
              }`}>
                {isOverallProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isOverallProfitable ? '+' : ''}₹{netReturn.toFixed(2)} ({isOverallProfitable ? '+' : ''}{netReturnPct}%)</span>
              </span>
              <span className="text-xs text-slate-400">Since inception</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-obsidian-900/90 border border-obsidian-700 rounded-xl p-3 text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Baseline Capital</div>
              <div className="font-tabular text-sm font-bold text-slate-200">
                ₹{initialCap.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Margin */}
        <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available Margin</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-extrabold text-emerald-400 font-tabular">
            ₹{portfolio?.available_margin?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Free cash for new positions
          </div>
        </div>

        {/* Used Margin */}
        <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Used Margin</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-extrabold text-slate-200 font-tabular">
            ₹{portfolio?.used_margin?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Locked in active holdings
          </div>
        </div>

        {/* Realized PnL */}
        <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Realized P&L</span>
            <Award className="w-4 h-4 text-brand-cyan" />
          </div>
          <div className={`text-lg font-extrabold font-tabular ${
            (portfolio?.total_realized_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(portfolio?.total_realized_pnl ?? 0) >= 0 ? '+' : ''}₹{portfolio?.total_realized_pnl?.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Booked profits/losses
          </div>
        </div>

        {/* Total Charges Paid */}
        <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Taxes & Charges</span>
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-extrabold text-rose-400 font-tabular">
            ₹{totalCharges.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-tabular">
            Friction over {totalTrades} executed legs
          </div>
        </div>
      </div>

      {/* Psychology & Rules Reminder Card */}
      <div className="bg-obsidian-800/80 border border-obsidian-700 rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-brand-blue" />
          Virtual Trading Rules & Risk Discipline
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-obsidian-900 p-3 rounded-xl border border-obsidian-700/60">
            <div className="font-bold text-brand-cyan mb-1">Intraday MIS (5x)</div>
            <p className="text-slate-400 leading-relaxed">
              Provides 5x leverage. All open MIS positions are automatically squared off at 3:15 PM IST.
            </p>
          </div>
          <div className="bg-obsidian-900 p-3 rounded-xl border border-obsidian-700/60">
            <div className="font-bold text-emerald-400 mb-1">Delivery CNC (100%)</div>
            <p className="text-slate-400 leading-relaxed">
              100% upfront cash required. No overnight squareoff. Short selling restricted.
            </p>
          </div>
          <div className="bg-obsidian-900 p-3 rounded-xl border border-obsidian-700/60">
            <div className="font-bold text-amber-400 mb-1">Realistic Friction</div>
            <p className="text-slate-400 leading-relaxed">
              Includes STT, Exchange fee, SEBI fee, Stamp duty, Brokerage, and GST to test real edge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
