import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator } from 'lucide-react';
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

  useEffect(() => {
    if (defaultPrice > 0) {
      setBuyPrice(defaultPrice);
      setSellPrice(parseFloat((defaultPrice * 1.01).toFixed(2)));
    }
  }, [defaultPrice]);

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-obsidian-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-blue/20 text-brand-cyan border border-brand-blue/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Indian Brokerage & Taxes Calculator
              </h3>
              <p className="text-xs text-slate-400">
                Standard NSE / SEBI Regulatory & Discount Broker Schedule
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-obsidian-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="mt-4 space-y-4">
          {/* Product Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setProductType('MIS')}
              className={`py-2 rounded-xl border text-xs font-bold transition ${
                productType === 'MIS'
                  ? 'bg-brand-blue/20 border-brand-blue text-brand-cyan'
                  : 'bg-obsidian-900 border-obsidian-700 text-slate-400'
              }`}
            >
              Intraday (MIS)
            </button>
            <button
              onClick={() => setProductType('CNC')}
              className={`py-2 rounded-xl border text-xs font-bold transition ${
                productType === 'CNC'
                  ? 'bg-brand-blue/20 border-brand-blue text-brand-cyan'
                  : 'bg-obsidian-900 border-obsidian-700 text-slate-400'
              }`}
            >
              Delivery (CNC)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Quantity with quick steppers */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quantity
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, (prev || 0) + 25))}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-obsidian-900 hover:bg-obsidian-700 text-slate-300 border border-obsidian-700 transition"
                  >
                    +25
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, (prev || 0) + 50))}
                    className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-obsidian-900 hover:bg-obsidian-700 text-slate-300 border border-obsidian-700 transition"
                  >
                    +50
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, (prev || 1) - 1))}
                  className="w-8 h-8 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-300 hover:text-white hover:bg-obsidian-800 flex items-center justify-center font-bold text-sm active:scale-95 transition shrink-0"
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
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-2.5 py-1.5 text-center text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => (prev || 0) + 1)}
                  className="w-8 h-8 rounded-lg bg-obsidian-900 border border-obsidian-700 text-slate-300 hover:text-white hover:bg-obsidian-800 flex items-center justify-center font-bold text-sm active:scale-95 transition shrink-0"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buy Price */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Buy Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={buyPrice === 0 ? '' : buyPrice}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setBuyPrice(isNaN(val) ? 0 : Math.max(0, val));
                }}
                placeholder="0.00"
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            {/* Sell Price */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Sell Price (₹)
              </label>
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
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>
        </div>

        {/* Results & Breakdown */}
        {estimate && (
          <div className="mt-5 space-y-3 font-tabular">
            {/* PnL Highlight Card */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isNetProfit ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/40'
            }`}>
              <div>
                <div className="text-xs text-slate-400 font-sans">Net P&L (After Charges)</div>
                <div className={`text-xl font-extrabold ${isNetProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isNetProfit ? '+' : ''}₹{estimate.net_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Gross P&L: ₹{estimate.gross_pnl.toFixed(2)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400 font-sans">Points to Breakeven</div>
                <div className="text-base font-bold text-brand-cyan">
                  +₹{estimate.breakeven_points.toFixed(2)} / sh
                </div>
                <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Total Friction: ₹{estimate.total_charges.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="bg-obsidian-900/80 border border-obsidian-700 rounded-xl p-3 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Turnover:</span>
                <span className="font-semibold text-white">₹{estimate.total_turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Brokerage (Buy + Sell):</span>
                <span>₹{estimate.brokerage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">STT / CTT:</span>
                <span>₹{estimate.stt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exchange Turnover Charges (0.00297%):</span>
                <span>₹{estimate.exchange_charges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SEBI Charges (₹10/Cr):</span>
                <span>₹{estimate.sebi_charges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stamp Duty:</span>
                <span>₹{estimate.stamp_duty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GST (18% on Brokerage + Exch + SEBI):</span>
                <span>₹{estimate.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold pt-1.5 border-t border-obsidian-700">
                <span>Total Taxes & Charges:</span>
                <span>₹{estimate.total_charges.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
