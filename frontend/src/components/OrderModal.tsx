import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Percent,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StockQuote, ProductType, OrderType, OrderSide, ChargeBreakdown } from '../lib/types';
import { estimateSingleLeg } from '../lib/api';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockQuote | null;
  initialSide: OrderSide;
  availableMargin: number;
  onPlaceOrder: (payload: {
    symbol: string;
    side: OrderSide;
    product_type: ProductType;
    order_type: OrderType;
    quantity: number;
    price?: number | null;
    trigger_price?: number | null;
  }) => Promise<any>;
}

const QUICK_QTY_ADDERS = [25, 50, 100, 250];
const MARGIN_PCT_CHIPS = [10, 25, 50, 100];

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  stock,
  initialSide,
  availableMargin,
  onPlaceOrder,
}) => {
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [productType, setProductType] = useState<ProductType>('MIS');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<number>(50);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [triggerPrice, setTriggerPrice] = useState<number>(0);
  
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(false);
  const [taxBreakdown, setTaxBreakdown] = useState<ChargeBreakdown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setSide(initialSide);
    if (stock) {
      setLimitPrice(stock.ltp);
      setTriggerPrice(stock.ltp);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialSide, stock, isOpen]);

  // Determine effective price
  const ltp = stock?.ltp || 100;
  const effectivePrice = orderType === 'LIMIT' && limitPrice > 0 ? limitPrice : ltp;
  
  // Calculate Required Margin
  const totalTurnover = quantity * effectivePrice;
  const requiredMargin = productType === 'MIS' ? totalTurnover / 5.0 : totalTurnover;
  const hasInsufficientMargin = requiredMargin > availableMargin;

  // Live itemized charges calculation
  useEffect(() => {
    if (!stock || quantity <= 0) return;
    
    estimateSingleLeg({
      symbol: stock.symbol,
      side,
      product_type: productType,
      quantity,
      price: effectivePrice,
    })
      .then((data) => setTaxBreakdown(data))
      .catch(() => setTaxBreakdown(null));
  }, [stock?.symbol, side, productType, quantity, effectivePrice]);

  if (!isOpen || !stock) return null;

  const isBuy = side === 'BUY';

  const handleMarginPctClick = (pct: number) => {
    const targetCapital = availableMargin * (pct / 100);
    const leverage = productType === 'MIS' ? 5 : 1;
    const calculatedQty = Math.max(1, Math.floor((targetCapital * leverage) / effectivePrice));
    setQuantity(calculatedQty);
  };

  const handleAddQty = (adder: number) => {
    setQuantity((prev) => prev + adder);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (quantity <= 0) {
      setErrorMessage('Please enter a valid quantity');
      return;
    }

    if (orderType === 'LIMIT' && limitPrice <= 0) {
      setErrorMessage('Please enter a valid limit price');
      return;
    }

    if (orderType === 'SL_M' && triggerPrice <= 0) {
      setErrorMessage('Please enter a valid trigger price');
      return;
    }

    if (hasInsufficientMargin && !(productType === 'CNC' && side === 'SELL')) {
      setErrorMessage(`Insufficient margin. Required ₹${requiredMargin.toFixed(2)}, Available: ₹${availableMargin.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onPlaceOrder({
        symbol: stock.symbol,
        side,
        product_type: productType,
        order_type: orderType,
        quantity,
        price: orderType === 'LIMIT' ? limitPrice : null,
        trigger_price: orderType === 'SL_M' ? triggerPrice : null,
      });

      if (res.status === 'REJECTED') {
        setErrorMessage(res.rejection_reason || 'Order was rejected');
      } else {
        // Confetti effect on execution
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: isBuy ? ['#10b981', '#34d399', '#0ea5e9'] : ['#ef4444', '#f87171', '#f59e0b'],
        });

        setSuccessMessage(`Order ${res.status}: ${side} ${quantity} ${stock.symbol} @ ₹${res.execution_price || effectivePrice}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`w-full sm:max-w-lg bg-obsidian-800 rounded-t-3xl sm:rounded-2xl border ${
          isBuy ? 'border-emerald-500/40 glow-emerald' : 'border-rose-500/40 glow-crimson'
        } shadow-2xl overflow-hidden transition-all duration-200 animate-in fade-in`}
      >
        {/* Modal Header Strip */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between border-b ${
            isBuy
              ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Side Tabs */}
            <div className="flex items-center bg-obsidian-900/80 p-0.5 rounded-lg border border-obsidian-700">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`px-4 py-1 text-xs font-bold rounded-md transition ${
                  isBuy
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`px-4 py-1 text-xs font-bold rounded-md transition ${
                  !isBuy
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SELL
              </button>
            </div>

            <div>
              <div className="font-extrabold text-white text-base tracking-tight">{stock.symbol}</div>
              <div className="text-[11px] font-tabular text-slate-300">
                LTP: ₹{stock.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-obsidian-700/60 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Product Type (MIS vs CNC) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setProductType('MIS')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center ${
                productType === 'MIS'
                  ? 'bg-brand-blue/15 border-brand-blue text-brand-cyan shadow-sm'
                  : 'bg-obsidian-900 border-obsidian-700 text-slate-400 hover:border-obsidian-600'
              }`}
            >
              <span>Intraday MIS</span>
              <span className="text-[10px] font-medium opacity-80 mt-0.5">5x Leverage (Auto 3:15 PM)</span>
            </button>

            <button
              type="button"
              onClick={() => setProductType('CNC')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center ${
                productType === 'CNC'
                  ? 'bg-brand-blue/15 border-brand-blue text-brand-cyan shadow-sm'
                  : 'bg-obsidian-900 border-obsidian-700 text-slate-400 hover:border-obsidian-600'
              }`}
            >
              <span>Longterm CNC</span>
              <span className="text-[10px] font-medium opacity-80 mt-0.5">100% Upfront Margin</span>
            </button>
          </div>

          {/* Order Type (MARKET / LIMIT / SL_M) */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Order Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['MARKET', 'LIMIT', 'SL_M'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                    orderType === type
                      ? 'bg-obsidian-700 border-slate-400 text-white'
                      : 'bg-obsidian-900 border-obsidian-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'SL_M' ? 'SL-M' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Quick Steppers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quantity (Shares)
              </label>
              <div className="flex items-center gap-1">
                {QUICK_QTY_ADDERS.map((adder) => (
                  <button
                    key={adder}
                    type="button"
                    onClick={() => handleAddQty(adder)}
                    className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-obsidian-700/60 hover:bg-obsidian-700 text-slate-300 border border-obsidian-600 transition"
                  >
                    +{adder}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                Qty
              </span>
            </div>

            {/* Quick Margin % Allocators */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Percent className="w-3 h-3 text-brand-cyan" /> Use Margin %:
              </span>
              <div className="flex items-center gap-1.5">
                {MARGIN_PCT_CHIPS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleMarginPctClick(pct)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-obsidian-900 hover:bg-obsidian-700 text-slate-300 border border-obsidian-700 transition"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conditional Limit / Trigger Price Inputs */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Limit Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>
          )}

          {orderType === 'SL_M' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Trigger Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-4 py-2 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
              />
            </div>
          )}

          {/* Margin & Available Summary Strip */}
          <div className="bg-obsidian-900/90 rounded-xl p-3 border border-obsidian-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Margin Required:</span>
              <span className={`font-tabular font-bold ${hasInsufficientMargin ? 'text-rose-400' : 'text-slate-200'}`}>
                ₹{requiredMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Available Margin:</span>
              <span className="font-tabular font-bold text-emerald-400">
                ₹{availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {hasInsufficientMargin && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 pt-1 border-t border-obsidian-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Insufficient margin to execute order</span>
              </div>
            )}
          </div>

          {/* Expandable Charges Breakdown */}
          <div className="border border-obsidian-700 rounded-xl overflow-hidden bg-obsidian-900/50">
            <button
              type="button"
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-300 hover:text-white transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                Charges & Taxes: <strong className="text-white font-tabular">₹{taxBreakdown?.total_charges?.toFixed(2) || '0.00'}</strong>
              </span>
              {showTaxBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTaxBreakdown && taxBreakdown && (
              <div className="p-3 border-t border-obsidian-700 text-[11px] space-y-1 bg-obsidian-950/60 font-tabular">
                <div className="flex justify-between text-slate-400">
                  <span>Brokerage ({productType}):</span>
                  <span className="text-slate-200">₹{taxBreakdown.brokerage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>STT / CTT:</span>
                  <span className="text-slate-200">₹{taxBreakdown.stt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Exchange Turnover Charges:</span>
                  <span className="text-slate-200">₹{taxBreakdown.exchange_charges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>SEBI Charges:</span>
                  <span className="text-slate-200">₹{taxBreakdown.sebi_charges.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Stamp Duty:</span>
                  <span className="text-slate-200">₹{taxBreakdown.stamp_duty.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>GST (18% on Brokerage + Exch + SEBI):</span>
                  <span className="text-slate-200">₹{taxBreakdown.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-1 border-t border-obsidian-800 font-bold">
                  <span>Breakeven per share:</span>
                  <span>+₹{taxBreakdown.breakeven_pnl.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || (hasInsufficientMargin && !(productType === 'CNC' && side === 'SELL'))}
            className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide shadow-xl transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              isBuy
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
            }`}
          >
            {isSubmitting ? 'Placing Order...' : `${side} ${quantity} ${stock.symbol} (${productType})`}
          </button>
        </form>
      </div>
    </div>
  );
};
