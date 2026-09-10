import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StockQuote, ProductType, OrderType, OrderSide, Position } from '../lib/types';
import { calculateSingleLegCharges } from '../lib/charges';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockQuote | null;
  initialSide: OrderSide;
  availableMargin: number;
  positions?: Position[];
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

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  stock,
  initialSide,
  availableMargin,
  positions = [],
  onPlaceOrder,
}) => {
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [productType, setProductType] = useState<ProductType>('CNC');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');

  // Calculate available holding quantity for the selected symbol and product type
  const availableHoldingQty = useMemo(() => {
    if (!stock || !positions) return 0;
    const targetPos = positions.find(
      (p) => p.symbol.toUpperCase() === stock.symbol.toUpperCase() && p.product_type === productType
    );
    return targetPos && targetPos.quantity > 0 ? targetPos.quantity : 0;
  }, [stock, positions, productType]);

  const [quantity, setQuantity] = useState<number>(() => {
    if (initialSide === 'SELL' && availableHoldingQty > 0) {
      return availableHoldingQty;
    }
    return 50;
  });

  const [limitPrice, setLimitPrice] = useState<number>(stock?.ltp || 0);
  const [triggerPrice, setTriggerPrice] = useState<number>(() => {
    const defaultLtp = stock?.ltp || 100;
    return parseFloat((defaultLtp * 0.99).toFixed(2));
  });
  
  const [showTaxBreakdown, setShowTaxBreakdown] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  // Update default quantity when side is changed to SELL
  const handleSideChange = (newSide: OrderSide) => {
    setSide(newSide);
    setErrorMessage(null);
    if (newSide === 'SELL' && availableHoldingQty > 0 && quantity > availableHoldingQty) {
      setQuantity(availableHoldingQty);
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollTop = 0;
    }
  }, []);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine effective price
  const ltp = stock?.ltp || 100;
  const effectivePrice = orderType === 'LIMIT' && limitPrice > 0 ? limitPrice : ltp;
  
  // Calculate Required Margin & Turnover
  const totalTurnover = (quantity > 0 ? quantity : 0) * effectivePrice;
  const requiredMargin = productType === 'MIS' ? totalTurnover / 5.0 : totalTurnover;
  const hasInsufficientMargin = requiredMargin > availableMargin;

  // CNC Sell holding validation state
  const isCncSellExceeded = side === 'SELL' && productType === 'CNC' && (availableHoldingQty === 0 || quantity > availableHoldingQty);

  // Live itemized charges calculation (0ms instant)
  const taxBreakdown = useMemo(() => {
    if (!stock || quantity <= 0) return null;
    return calculateSingleLegCharges(
      stock.symbol,
      side,
      productType,
      quantity,
      effectivePrice
    );
  }, [stock?.symbol, side, productType, quantity, effectivePrice]);

  // Determine if Indian Equity Market (NSE) is currently open (Mon-Fri 09:15 - 15:30 IST)
  const isMarketOpen = useMemo(() => {
    const now = new Date();
    const istHoursStr = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit'
    });
    const istMinutesStr = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      minute: '2-digit'
    });
    const day = now.getDay();
    const totalMinutes = parseInt(istHoursStr, 10) * 60 + parseInt(istMinutesStr, 10);
    const isWeekday = day >= 1 && day <= 5;
    return isWeekday && totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  const isBuy = side === 'BUY';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (quantity <= 0) {
      setErrorMessage('Please enter a valid quantity');
      return;
    }

    if (side === 'SELL' && productType === 'CNC') {
      if (availableHoldingQty <= 0) {
        setErrorMessage(`No CNC holdings available to sell for ${stock.symbol}. Delivery short selling is not permitted on NSE.`);
        return;
      }
      if (quantity > availableHoldingQty) {
        setErrorMessage(`Sell quantity (${quantity}) exceeds available holdings (${availableHoldingQty} shares). Sell amount cannot be greater than what you have.`);
        return;
      }
    }

    if (orderType === 'LIMIT' && limitPrice <= 0) {
      setErrorMessage('Please enter a valid limit price');
      return;
    }

    if (orderType === 'SL_M' && triggerPrice <= 0) {
      setErrorMessage('Please enter a valid stoploss trigger price');
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
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: isBuy ? ['#10b981', '#34d399', '#0ea5e9'] : ['#ef4444', '#f87171', '#f59e0b'],
        });

        if (orderType === 'SL_M') {
          if (isBuy && triggerPrice < stock.ltp) {
            setSuccessMessage(`Order ${res.status}: BUY ${quantity} ${stock.symbol} @ ₹${res.execution_price || effectivePrice} • Protective Stoploss placed @ ₹${triggerPrice.toFixed(2)}`);
          } else {
            setSuccessMessage(`Stoploss Order Placed: ${side} ${quantity} ${stock.symbol} @ Trigger ₹${triggerPrice.toFixed(2)}`);
          }
        } else {
          setSuccessMessage(`Order ${res.status}: ${side} ${quantity} ${stock.symbol} @ ₹${res.execution_price || effectivePrice}`);
        }

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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className={`w-full sm:max-w-md max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-obsidian-850 rounded-t-2xl sm:rounded-2xl border ${
          isBuy ? 'border-emerald-500/40 glow-emerald' : 'border-rose-500/40 glow-crimson'
        } shadow-2xl overflow-hidden transition-all duration-150`}
      >
        {/* Compact Integrated Header Bar */}
        <div className="px-4 py-3 border-b border-obsidian-700/60 bg-gradient-to-b from-obsidian-800 to-obsidian-900/90 shrink-0 flex items-center justify-between gap-2">
          {/* Symbol & Price Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white tracking-tight leading-tight">{stock.symbol}</span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-obsidian-700 text-slate-300 border border-obsidian-600">
                  NSE
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-tabular mt-0.5">
                <span className="font-bold text-white">₹{stock.ltp.toFixed(2)}</span>
                <span
                  className={`text-[11px] font-semibold ${
                    (stock.change ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(stock.change ?? 0) >= 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)} ({(stock.pChange ?? 0) >= 0 ? '+' : ''}{(stock.pChange ?? 0).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Header Controls: BUY/SELL Mode + Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-obsidian-950/90 p-0.5 rounded-lg border border-obsidian-700/80">
              <button
                type="button"
                onClick={() => handleSideChange('BUY')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  isBuy
                    ? 'bg-emerald-600 text-white shadow-sm glow-emerald'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => handleSideChange('SELL')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                  !isBuy
                    ? 'bg-rose-600 text-white shadow-sm glow-crimson'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                SELL
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-obsidian-700 text-slate-400 hover:text-white transition"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Form Body */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 overscroll-contain">
          {/* Off-Market Hours Notice (Compact 1-line tag) */}
          {!isMarketOpen && (
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="truncate">
                <strong>NSE Closed:</strong> AMO order placed at ₹{stock.ltp.toFixed(2)}
              </span>
            </div>
          )}

          {/* Product Type (CNC vs MIS - Longterm Delivery by default) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProductType('CNC')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                  productType === 'CNC'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-obsidian-900 border-obsidian-700 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <span>Longterm CNC</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-200">
                  Delivery
                </span>
              </button>

              <button
                type="button"
                onClick={() => setProductType('MIS')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                  productType === 'MIS'
                    ? 'bg-brand-blue/20 border-brand-blue text-brand-cyan shadow-sm glow-blue'
                    : 'bg-obsidian-900 border-obsidian-700 text-slate-400 hover:border-obsidian-600'
                }`}
              >
                <span>Intraday MIS</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-brand-blue/30 text-sky-200">
                  5x Margin
                </span>
              </button>
            </div>

            {/* Dynamic Leverage / Cost Note (Concise 1-Line Strip) */}
            {productType === 'CNC' ? (
              <div className="px-2.5 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/25 text-[11px] flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  Delivery CNC
                </span>
                <span className="text-indigo-300 font-bold font-tabular">
                  100% Upfront (₹{requiredMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                </span>
              </div>
            ) : (
              <div className="px-2.5 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/25 text-[11px] flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-brand-cyan font-medium">
                  <Zap className="w-3.5 h-3.5 text-brand-cyan shrink-0" />
                  Trade: ₹{totalTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-emerald-400 font-bold font-tabular">
                  You pay 1/5th (₹{requiredMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                </span>
              </div>
            )}
          </div>

          {/* Order Type (MARKET / LIMIT / SL_M) */}
          <div>
            <div className="grid grid-cols-3 gap-1.5 bg-obsidian-950/70 p-1 rounded-xl border border-obsidian-700/80">
              {(['MARKET', 'LIMIT', 'SL_M'] as OrderType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition ${
                    orderType === type
                      ? 'bg-obsidian-700 text-white shadow-sm border border-obsidian-600'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'SL_M' ? 'SL-M' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Controls & Steppers */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quantity (Shares)
              </label>
              <div className="flex items-center gap-1">
                {QUICK_QTY_ADDERS.map((adder) => (
                  <button
                    key={adder}
                    type="button"
                    onClick={() => {
                      const nextQty = (quantity || 0) + adder;
                      if (side === 'SELL' && productType === 'CNC' && availableHoldingQty > 0) {
                        setQuantity(Math.min(nextQty, availableHoldingQty));
                      } else {
                        setQuantity(nextQty);
                      }
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-obsidian-900 hover:bg-obsidian-700 text-slate-300 border border-obsidian-700 transition"
                  >
                    +{adder}
                  </button>
                ))}
              </div>
            </div>

            {/* Available to Sell Helper Strip when in SELL mode */}
            {!isBuy && (
              <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-obsidian-900/90 border border-obsidian-700/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Available to Sell:</span>
                  <span className={`font-bold font-tabular text-[11px] ${availableHoldingQty > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {availableHoldingQty} Shares ({productType})
                  </span>
                </div>
                {availableHoldingQty > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(availableHoldingQty)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition active:scale-95"
                  >
                    Sell All ({availableHoldingQty})
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, (prev || 1) - 1))}
                className="w-9 h-9 rounded-xl bg-obsidian-900 border border-obsidian-700 text-slate-300 hover:text-white hover:bg-obsidian-800 flex items-center justify-center font-bold text-base active:scale-95 transition shrink-0"
              >
                -
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-1.5 text-center text-sm font-tabular font-extrabold text-white focus:outline-none focus:border-brand-blue"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-semibold uppercase">
                  Qty
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextQty = (quantity || 0) + 1;
                  if (side === 'SELL' && productType === 'CNC' && availableHoldingQty > 0) {
                    setQuantity(Math.min(nextQty, availableHoldingQty));
                  } else {
                    setQuantity(nextQty);
                  }
                }}
                className="w-9 h-9 rounded-xl bg-obsidian-900 border border-obsidian-700 text-slate-300 hover:text-white hover:bg-obsidian-800 flex items-center justify-center font-bold text-base active:scale-95 transition shrink-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Conditional Limit / Stoploss Trigger Price Inputs */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-400">Limit Price (₹)</span>
                <button
                  type="button"
                  onClick={() => setLimitPrice(stock.ltp)}
                  className="font-bold text-brand-cyan hover:underline"
                >
                  Use LTP (₹{stock.ltp.toFixed(2)})
                </button>
              </div>
              <input
                type="number"
                step="0.05"
                value={limitPrice || ''}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-xl px-3 py-1.5 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
                placeholder={stock.ltp.toFixed(2)}
              />
            </div>
          )}

          {orderType === 'SL_M' && (
            <div className="space-y-2 bg-obsidian-900/80 p-2.5 rounded-xl border border-obsidian-700/80 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-300">Stoploss Trigger Price (₹)</span>
                <button
                  type="button"
                  onClick={() => setTriggerPrice(parseFloat((stock.ltp * 0.99).toFixed(2)))}
                  className="font-bold text-brand-cyan hover:underline"
                >
                  Reset (-1%)
                </button>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  value={triggerPrice || ''}
                  onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-obsidian-950 border border-obsidian-700 rounded-xl px-3 py-1.5 text-sm font-tabular font-bold text-white focus:outline-none focus:border-brand-blue"
                  placeholder={stock.ltp.toFixed(2)}
                />
              </div>

              {/* Quick % Stoploss Presets */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400 shrink-0 font-medium">Quick SL:</span>
                {[0.5, 1, 2, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setTriggerPrice(parseFloat((stock.ltp * (1 - pct / 100)).toFixed(2)))}
                    className="flex-1 py-0.5 text-[10px] font-bold rounded bg-obsidian-950 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-obsidian-700 hover:border-rose-500/40 transition font-tabular"
                  >
                    -{pct}%
                  </button>
                ))}
              </div>

              {/* Helpful Explanation Strip */}
              <div className="p-2 rounded-lg bg-obsidian-950/90 border border-obsidian-800 text-[11px] text-slate-300 font-tabular space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Current Market LTP:</span>
                  <span className="font-bold text-white">₹{stock.ltp.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Execution Action:</span>
                  <span className="font-bold text-amber-300">
                    {isBuy && triggerPrice < stock.ltp
                      ? `Buy @ Market ₹${stock.ltp.toFixed(2)} & auto-sell if price drops to ₹${triggerPrice.toFixed(2)}`
                      : isBuy
                      ? `Breakout Buy when price rises to ₹${triggerPrice.toFixed(2)}`
                      : `Auto-sell holdings if price falls to ₹${triggerPrice.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Margin Required vs Available Balance (Compact Strip) */}
          <div className="bg-obsidian-950/80 rounded-xl p-2.5 border border-obsidian-700/80">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Required:</span>
                <span className={`font-tabular font-bold ${hasInsufficientMargin ? 'text-rose-400' : 'text-white'}`}>
                  ₹{requiredMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[11px]">Available:</span>
                <span className="font-tabular font-bold text-emerald-400">
                  ₹{availableMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {hasInsufficientMargin && !(productType === 'CNC' && side === 'SELL') && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 pt-1.5 mt-1.5 border-t border-rose-500/20 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Insufficient margin to execute order</span>
              </div>
            )}
          </div>

          {/* Expandable Charges Breakdown */}
          <div className="border border-obsidian-700/70 rounded-xl overflow-hidden bg-obsidian-900/50">
            <button
              type="button"
              onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-300 hover:text-white transition"
            >
              <div className="flex items-center gap-1.5 text-[11px]">
                <Sparkles className="w-3 h-3 text-brand-cyan" />
                <span>Taxes & Charges:</span>
                <strong className="text-white font-tabular font-bold">₹{taxBreakdown?.total_charges?.toFixed(2) || '0.00'}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                <span className="text-emerald-400 font-tabular font-medium">+₹{taxBreakdown?.breakeven_pnl?.toFixed(2) || '0.00'}/sh</span>
                {showTaxBreakdown ? <ChevronUp className="w-3.5 h-3.5 text-brand-cyan" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showTaxBreakdown && taxBreakdown && (
              <div className="p-3 border-t border-obsidian-700/70 text-[11px] space-y-1 bg-obsidian-950/80 font-tabular animate-in fade-in duration-150">
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
                  <span>GST (18%):</span>
                  <span className="text-slate-200">₹{taxBreakdown.gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 pt-1 border-t border-obsidian-800 font-bold text-xs">
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

          {/* Action CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting || (hasInsufficientMargin && !(productType === 'CNC' && side === 'SELL')) || isCncSellExceeded}
            className={`w-full py-2.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide shadow-xl transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isBuy
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/60'
                : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-500 hover:from-rose-500 hover:to-red-400 text-white shadow-rose-950/60'
            }`}
          >
            {isSubmitting ? (
              <span>Placing Order...</span>
            ) : (
              <span>
                {orderType === 'SL_M'
                  ? `${side} ${quantity > 0 ? quantity : 0} ${stock.symbol} (SL @ ₹${triggerPrice.toFixed(2)}) • ₹${requiredMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${side} ${quantity > 0 ? quantity : 0} ${stock.symbol} (${productType}) • ₹${requiredMargin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};



