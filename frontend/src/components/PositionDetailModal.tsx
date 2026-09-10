import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  LogOut,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { Position, OrderSide } from '../lib/types';

interface PositionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: Position | null;
  onExitPosition: (symbol: string, productType: 'CNC' | 'MIS') => Promise<any>;
  onOpenOrderModal?: (symbol: string, side: OrderSide) => void;
}

export const PositionDetailModal: React.FC<PositionDetailModalProps> = ({
  isOpen,
  onClose,
  position,
  onExitPosition,
  onOpenOrderModal,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);

  if (!isOpen || !position) return null;

  const isLong = position.quantity > 0;
  const absQty = Math.abs(position.quantity);
  const ltp = position.ltp || position.average_price;
  const isProfit = (position.unrealized_pnl || 0) >= 0;
  const isRealizedProfit = (position.realized_pnl || 0) >= 0;

  const investedValue = absQty * position.average_price;
  const currentValue = absQty * ltp;
  const priceDiffPerShare = ltp - position.average_price;
  const effectiveChangePerShare = isLong ? priceDiffPerShare : -priceDiffPerShare;

  const marginRequired = position.product_type === 'MIS' ? investedValue / 5.0 : investedValue;

  const handleExit = async () => {
    setIsExiting(true);
    setExitError(null);
    try {
      await onExitPosition(position.symbol, position.product_type);
      onClose();
    } catch (err: any) {
      setExitError(err.message || 'Failed to exit position');
    } finally {
      setIsExiting(false);
    }
  };

  const handleBuyMore = () => {
    onClose();
    if (onOpenOrderModal) {
      onOpenOrderModal(position.symbol, 'BUY');
    }
  };

  const handleSellReduce = () => {
    onClose();
    if (onOpenOrderModal) {
      onOpenOrderModal(position.symbol, 'SELL');
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className={`w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-obsidian-850 rounded-t-2xl sm:rounded-2xl border ${
          isProfit ? 'border-emerald-500/40 glow-emerald' : 'border-rose-500/40 glow-crimson'
        } shadow-2xl overflow-hidden transition-all duration-150`}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-obsidian-700/70 bg-gradient-to-b from-obsidian-800 to-obsidian-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-2.5 h-10 rounded-full ${
                isLong ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight leading-tight">
                  {position.symbol}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-obsidian-950 text-slate-300 border border-obsidian-700">
                  NSE EQ
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    position.product_type === 'MIS'
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                      : 'bg-brand-blue/20 text-brand-cyan border border-brand-blue/30'
                  }`}
                >
                  {position.product_type === 'MIS' ? 'INTRADAY MIS (5x)' : 'DELIVERY CNC'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-tabular mt-1">
                <span
                  className={`font-extrabold px-1.5 py-0.2 rounded text-[10px] ${
                    isLong ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isLong ? 'LONG POSITION' : 'SHORT POSITION'}
                </span>
                <span className="text-slate-400">
                  Quantity: <strong className="text-white font-bold">{absQty} Shares</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-obsidian-700 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Main P&L Hero Card */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isProfit
                ? 'bg-gradient-to-br from-emerald-950/50 via-obsidian-900 to-obsidian-950 border-emerald-500/30'
                : 'bg-gradient-to-br from-rose-950/50 via-obsidian-900 to-obsidian-950 border-rose-500/30'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Unrealized P&L</span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black font-tabular flex items-center gap-1.5 mt-1 ${
                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isProfit ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
                <span>
                  {isProfit ? '+' : ''}₹{(position.unrealized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-full font-tabular ${
                    isProfit ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
                  }`}
                >
                  {isProfit ? '+' : ''}{(position.pnl_percent || 0).toFixed(2)}% ROI
                </span>
                <span className="text-[11px] text-slate-400 font-tabular">
                  ({effectiveChangePerShare >= 0 ? '+' : ''}₹{effectiveChangePerShare.toFixed(2)}/share)
                </span>
              </div>
            </div>

            {/* Realized P&L Badge */}
            <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-obsidian-700/60 pt-3 sm:pt-0 sm:pl-4">
              <div className="text-[11px] font-semibold text-slate-400">Realized P&L (Booked)</div>
              <div className={`text-base font-bold font-tabular mt-0.5 ${isRealizedProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isRealizedProfit ? '+' : ''}₹{(position.realized_pnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Net of brokerage & taxes</div>
            </div>
          </div>

          {/* Detailed Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-tabular">
            {/* Average Buy Price */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Average Price
              </div>
              <div className="text-base font-extrabold text-white mt-1">
                ₹{position.average_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Current Market Price (LTP) */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Current LTP</span>
                {effectiveChangePerShare >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <div className={`text-base font-extrabold mt-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Quantity */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quantity
              </div>
              <div className="text-base font-extrabold text-white mt-1">
                {absQty} <span className="text-xs text-slate-400 font-normal">Shares</span>
              </div>
            </div>

            {/* Invested Capital */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Invested Value
              </div>
              <div className="text-base font-extrabold text-slate-200 mt-1">
                ₹{investedValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Current Position Value */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Value
              </div>
              <div className="text-base font-extrabold text-white mt-1">
                ₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Margin Blocked */}
            <div className="p-3 rounded-xl bg-obsidian-900/90 border border-obsidian-700/70">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Margin Used</span>
                {position.product_type === 'MIS' ? (
                  <Zap className="w-3 h-3 text-brand-cyan" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-indigo-400" />
                )}
              </div>
              <div className="text-base font-extrabold text-brand-cyan mt-1">
                ₹{marginRequired.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Product Type Explanation Strip */}
          <div className="p-3 rounded-xl bg-obsidian-950/60 border border-obsidian-700/60 text-xs flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              {position.product_type === 'MIS' ? (
                <>
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Intraday MIS (5x Margin):</strong> Auto square-off at 03:15 PM IST.
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    <strong>Delivery CNC:</strong> 100% upfront delivery holding, can be held overnight.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Error Message if Exit Fails */}
          {exitError && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
              {exitError}
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 border-t border-obsidian-700/70 bg-obsidian-900/90 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={handleBuyMore}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buy More</span>
            </button>

            <button
              onClick={handleSellReduce}
              className="flex-1 py-2 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <MinusCircle className="w-4 h-4" />
              <span>Sell / Reduce</span>
            </button>
          </div>

          <button
            onClick={handleExit}
            disabled={isExiting}
            className="py-2 px-4 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-500/50 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isExiting ? 'Exiting...' : 'Square Off Position'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
