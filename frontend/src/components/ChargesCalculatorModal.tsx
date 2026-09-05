import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import { ProductType, RoundtripEstimate } from '../lib/types';
import { estimateRoundtrip } from '../lib/api';

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
  const [sellPrice, setSellPrice] = useState<number>(defaultPrice * 1.01);
  const [estimate, setEstimate] = useState<RoundtripEstimate | null>(null);

  useEffect(() => {
    if (defaultPrice > 0) {
      setBuyPrice(defaultPrice);
      setSellPrice(parseFloat((defaultPrice * 1.01).toFixed(2)));
    }
  }, [defaultPrice]);

  useEffect(() => {
    if (quantity > 0 && buyPrice > 0 && sellPrice > 0) {
      estimateRoundtrip({
        symbol: defaultSymbol,
        product_type: productType,
        quantity,
        buy_price: buyPrice,
        sell_price: sellPrice,
      })
        .then((res) => setEstimate(res))
        .catch(() => setEstimate(null));
    }
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
                100% Deterministic Zerodha / NSE Schedule Friction
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Buy Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={buyPrice}
                onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Sell Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
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
