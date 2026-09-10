import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calculator,
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ProductType } from '../lib/types';
import { calculateRoundtripCharges } from '../lib/charges';

interface ChargesCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  defaultPrice?: number;
}

export const ChargesCalculatorModal: React.FC<ChargesCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'RELIANCE',
  defaultPrice = 3000,
}) => {
  const [productType, setProductType] = useState<ProductType>('MIS');
  const [quantity, setQuantity] = useState<number>(100);
  const [buyPrice, setBuyPrice] = useState<number>(defaultPrice);
  const [sellPrice, setSellPrice] = useState<number>(parseFloat((defaultPrice * 1.01).toFixed(2)));
  const [isManualPrice, setIsManualPrice] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Initialize once on modal open or if not manually edited yet
  useEffect(() => {
    if (isOpen && !isManualPrice && defaultPrice > 0) {
      setBuyPrice(defaultPrice);
      setSellPrice(parseFloat((defaultPrice * 1.01).toFixed(2)));
    }
  }, [isOpen]);

  const handleUseMarketPrice = () => {
    if (defaultPrice > 0) {
      setBuyPrice(defaultPrice);
      setSellPrice(parseFloat((defaultPrice * 1.01).toFixed(2)));
      setIsManualPrice(false);
    }
  };

  const handleSetTargetPercent = (percent: number) => {
    if (buyPrice > 0) {
      const target = buyPrice * (1 + percent / 100);
      setSellPrice(parseFloat(target.toFixed(2)));
    }
  };

  // Instant 0ms deterministic calculation across state changes
  const estimate = useMemo(() => {
    if (quantity > 0 && buyPrice > 0 && sellPrice > 0) {
      return calculateRoundtripCharges(defaultSymbol, productType, quantity, buyPrice, sellPrice);
    }
    return null;
  }, [defaultSymbol, productType, quantity, buyPrice, sellPrice]);

  if (!isOpen) return null;

  const isNetProfit = (estimate?.net_pnl || 0) >= 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-obsidian-850 border border-obsidian-700/80 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-obsidian-700/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/20 text-brand-cyan border border-brand-blue/30 shadow-sm shadow-brand-blue/10">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                  Brokerage & Charges Calculator
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-obsidian-900 border border-obsidian-700 text-brand-cyan">
                  {defaultSymbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                NSE Equity &bull; Zero Brokerage for Delivery &bull; Standard SEBI Schedule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-obsidian-700/80 text-slate-400 hover:text-white transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="mt-4 space-y-4 overflow-y-auto flex-1 pr-1 overscroll-contain">
          {/* Segment Type Selector */}
          <div className="grid grid-cols-2 gap-2 bg-obsidian-950/80 p-1 rounded-xl border border-obsidian-700/80">
            <button
              type="button"
              onClick={() => setProductType('MIS')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                productType === 'MIS'
                  ? 'bg-brand-blue text-white shadow-md glow-blue'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Intraday (MIS)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${productType === 'MIS' ? 'bg-obsidian-900/60 text-sky-200' : 'bg-obsidian-900 text-slate-500'}`}>
                5x Margin
              </span>
            </button>

            <button
              type="button"
              onClick={() => setProductType('CNC')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                productType === 'CNC'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-obsidian-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Delivery (CNC)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${productType === 'CNC' ? 'bg-indigo-950/80 text-indigo-200' : 'bg-obsidian-900 text-slate-500'}`}>
                ₹0 Brokerage
              </span>
            </button>
          </div>

          {/* Three Compact Input Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quantity Input Card */}
            <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quantity
                </span>
                <span className="text-[10px] text-slate-500 font-tabular font-semibold">
                  Shares
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, (prev || 1) - 1))}
                  className="w-8 h-9 rounded-lg bg-obsidian-950 border border-obsidian-700 hover:bg-obsidian-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition active:scale-95 shrink-0"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  placeholder="1"
                  className="w-full h-9 bg-obsidian-950 border border-obsidian-700 rounded-lg text-center text-sm font-tabular font-extrabold text-white focus:outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => (prev || 0) + 1)}
                  className="w-8 h-9 rounded-lg bg-obsidian-950 border border-obsidian-700 hover:bg-obsidian-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm transition active:scale-95 shrink-0"
                >
                  +
                </button>
              </div>

              {/* Quick Qty Presets */}
              <div className="flex items-center gap-1 mt-2">
                {[25, 50, 100, 500].map((add) => (
                  <button
                    key={add}
                    type="button"
                    onClick={() => setQuantity((prev) => (prev || 0) + add)}
                    className="flex-1 py-0.5 text-[9px] font-bold rounded bg-obsidian-950 hover:bg-obsidian-800 text-slate-300 border border-obsidian-800 hover:border-obsidian-600 transition font-tabular"
                  >
                    +{add}
                  </button>
                ))}
              </div>
            </div>

            {/* Buy Price Input Card */}
            <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Buy Price (₹)
                </span>
                <button
                  type="button"
                  onClick={handleUseMarketPrice}
                  className="px-1.5 py-0.5 rounded bg-brand-blue/20 hover:bg-brand-blue/30 border border-brand-blue/40 text-[10px] font-bold text-brand-cyan transition active:scale-95"
                  title="Fill live market LTP"
                >
                  Market
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={buyPrice === 0 ? '' : buyPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBuyPrice(isNaN(val) ? 0 : Math.max(0, val));
                    setIsManualPrice(true);
                  }}
                  placeholder="0.00"
                  className="w-full h-9 bg-obsidian-950 border border-obsidian-700 rounded-lg pl-6 pr-2.5 text-sm font-tabular font-extrabold text-white focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between font-tabular">
                <span>LTP: ₹{defaultPrice.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setBuyPrice(defaultPrice);
                    setIsManualPrice(true);
                  }}
                  className="text-brand-cyan hover:underline font-semibold"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Sell Price Input Card */}
            <div className="bg-obsidian-900/80 border border-obsidian-700/80 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Sell Price (₹)
                </span>
                <button
                  type="button"
                  onClick={() => setSellPrice(defaultPrice)}
                  className="px-1.5 py-0.5 rounded bg-brand-blue/20 hover:bg-brand-blue/30 border border-brand-blue/40 text-[10px] font-bold text-brand-cyan transition active:scale-95"
                  title="Fill live market LTP"
                >
                  Market
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={sellPrice === 0 ? '' : sellPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSellPrice(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  placeholder="0.00"
                  className="w-full h-9 bg-obsidian-950 border border-obsidian-700 rounded-lg pl-6 pr-2.5 text-sm font-tabular font-extrabold text-white focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Target % chips */}
              <div className="flex items-center gap-1 mt-2">
                {[0.5, 1, 2, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleSetTargetPercent(pct)}
                    className="flex-1 py-0.5 text-[9px] font-bold rounded bg-obsidian-950 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-obsidian-800 hover:border-emerald-500/30 transition font-tabular"
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Analysis Hero Card */}
          {estimate && (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-tabular ${
                isNetProfit
                  ? 'bg-gradient-to-br from-emerald-950/40 via-obsidian-900 to-obsidian-950 border-emerald-500/40'
                  : 'bg-gradient-to-br from-rose-950/40 via-obsidian-900 to-obsidian-950 border-rose-500/40'
              }`}
            >
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>Net P&L (After All Charges)</span>
                </div>
                <div
                  className={`text-lg sm:text-xl font-extrabold flex items-center gap-1.5 mt-0.5 ${
                    isNetProfit ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isNetProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  <span>
                    {isNetProfit ? '+' : ''}₹{estimate.net_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-tabular sm:border-l border-obsidian-700/60 sm:pl-4">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">Gross P&L</div>
                  <div className={`font-bold mt-0.5 ${estimate.gross_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {estimate.gross_pnl >= 0 ? '+' : ''}₹{estimate.gross_pnl.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">Total Taxes</div>
                  <div className="font-bold text-amber-300 mt-0.5">
                    ₹{estimate.total_charges.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">Return (ROI)</div>
                  <div className={`font-bold mt-0.5 ${isNetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {((estimate.net_pnl / (quantity * buyPrice)) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expandable Itemized Fee Breakdown Accordion */}
          {estimate && (
            <div className="border border-obsidian-700/70 rounded-xl overflow-hidden bg-obsidian-900/60">
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-white transition bg-obsidian-900/90 hover:bg-obsidian-800/80"
              >
                <div className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                  <span className="font-semibold text-slate-300">Fee Breakdown ({productType}):</span>
                  <strong className="text-amber-300 font-tabular font-bold">₹{estimate.total_charges.toFixed(2)}</strong>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <span className="text-[10px] text-slate-400 font-tabular">Turnover: ₹{estimate.total_turnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  {showBreakdown ? <ChevronUp className="w-4 h-4 text-brand-cyan" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showBreakdown && (
                <div className="p-3.5 border-t border-obsidian-700/70 text-xs font-tabular space-y-2 bg-obsidian-950/80 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-obsidian-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <span>Component</span>
                    <span>Amount (₹)</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">Total Turnover (Buy + Sell):</span>
                    <span className="font-bold text-white">
                      ₹{estimate.total_turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span>Brokerage Fees</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-obsidian-950 border border-obsidian-800 text-slate-500">
                        {productType === 'CNC' ? 'Zero Delivery' : '₹20/Order'}
                      </span>
                    </div>
                    <span className="font-semibold text-slate-200">₹{estimate.brokerage.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">Securities Transaction Tax (STT / CTT):</span>
                    <span className="font-semibold text-slate-200">₹{estimate.stt.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">Exchange Turnover Charges (NSE 0.00297%):</span>
                    <span className="font-semibold text-slate-200">₹{estimate.exchange_charges.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">SEBI Regulatory Charges (₹10/Crore):</span>
                    <span className="font-semibold text-slate-200">₹{estimate.sebi_charges.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">Stamp Duty (State):</span>
                    <span className="font-semibold text-slate-200">₹{estimate.stamp_duty.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300 hover:text-white transition-colors py-0.5">
                    <span className="text-slate-400">GST (18% on Brokerage + Exch + SEBI):</span>
                    <span className="font-semibold text-slate-200">₹{estimate.gst.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-obsidian-700 text-amber-300 font-extrabold text-sm">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Total Friction &amp; Taxes:</span>
                    </div>
                    <span className="text-base text-amber-400">₹{estimate.total_charges.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

