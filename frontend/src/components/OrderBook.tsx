import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Trash2,
  FileText,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Order, Trade } from '../lib/types';

interface OrderBookProps {
  orders: Order[];
  trades: Trade[];
  onCancelOrder: (orderId: string) => Promise<any>;
}

export const OrderBook: React.FC<OrderBookProps> = ({ orders, trades, onCancelOrder }) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'EXECUTED'>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING');
  const executedOrders = orders.filter((o) => o.status === 'EXECUTED');

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  const displayOrders = activeTab === 'OPEN' ? pendingOrders : (activeTab === 'EXECUTED' ? executedOrders : orders);

  return (
    <div className="flex flex-col h-full bg-obsidian-900 overflow-hidden">
      {/* Tabs Header */}
      <div className="px-4 py-2.5 bg-obsidian-800/90 border-b border-obsidian-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-cyan" />
          <span className="font-extrabold text-sm text-white">Order Book</span>
        </div>

        <div className="flex items-center gap-1 bg-obsidian-900 p-0.5 rounded-lg border border-obsidian-700">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'ALL'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All Orders</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-obsidian-800 font-bold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('OPEN')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'OPEN'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Open (Pending)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-obsidian-800 font-bold">
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('EXECUTED')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
              activeTab === 'EXECUTED'
                ? 'bg-brand-blue text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Executed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-obsidian-800 font-bold">
              {trades.length}
            </span>
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-obsidian-700/40">
        {activeTab === 'EXECUTED' ? (
          // Executed Trades Tab
          trades.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No executed trades yet</div>
          ) : (
            trades.map((trade) => {
              const isBuy = trade.side === 'BUY';
              const matchedOrder = orders.find((o) => o.id === trade.order_id);
              const isSlTriggered = matchedOrder?.order_type === 'SL_M' || (matchedOrder?.trigger_price != null && matchedOrder.trigger_price > 0);
              const triggerPrice = matchedOrder?.trigger_price;
              const dateTimeStr = formatDateTime(trade.executed_at);

              return (
                <div key={trade.id} className="px-4 py-3 hover:bg-obsidian-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg shrink-0 ${isBuy ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'}`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm text-white tracking-tight">{trade.symbol}</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isBuy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                          {trade.side}
                        </span>
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-obsidian-950 border border-obsidian-700">
                          {trade.product_type}
                        </span>
                        {isSlTriggered && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>SL Triggered</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-tabular flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-slate-300 font-medium">{dateTimeStr}</span>
                        <span>&bull;</span>
                        <span>Turnover: ₹{trade.turnover.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        {isSlTriggered && triggerPrice != null && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-300 font-semibold">
                              SL Trigger: ₹{triggerPrice.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-tabular shrink-0 pl-10 sm:pl-0">
                    <div className="font-bold text-slate-100 text-sm">
                      {trade.quantity} @ ₹{trade.price.toFixed(2)}
                    </div>
                    {isSlTriggered && triggerPrice != null && (
                      <div className="text-[11px] text-amber-300/90 font-medium flex items-center sm:justify-end gap-1">
                        <span>Trigger: ₹{triggerPrice.toFixed(2)}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 inline" />
                        <span className="text-emerald-400 font-semibold">Filled: ₹{trade.price.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">
                      Taxes & Charges: ₹{trade.total_charges.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : displayOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {activeTab === 'OPEN' ? 'No pending limit / stop-loss orders' : 'No orders found'}
          </div>
        ) : (
          // Orders (Pending / All)
          displayOrders.map((order) => {
            const isBuy = order.side === 'BUY';
            const isPending = order.status === 'PENDING';
            const isRejected = order.status === 'REJECTED';
            const isExecuted = order.status === 'EXECUTED';
            const isCancelled = order.status === 'CANCELLED';
            const isSlOrder = order.order_type === 'SL_M' || (order.trigger_price != null && order.trigger_price > 0);
            const dateTimeStr = formatDateTime(order.created_at);

            return (
              <div
                key={order.id}
                className="px-4 py-3 hover:bg-obsidian-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-obsidian-800 border border-obsidian-700 shrink-0">
                    {isPending && <Clock className="w-4 h-4 text-amber-400 animate-spin" />}
                    {isExecuted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {isRejected && <AlertOctagon className="w-4 h-4 text-rose-400" />}
                    {isCancelled && <XCircle className="w-4 h-4 text-slate-500" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-white tracking-tight">{order.symbol}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${isBuy ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                        {order.side}
                      </span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-obsidian-950 border border-obsidian-700">
                        {order.product_type} &bull; {order.order_type}
                      </span>
                      {isSlOrder && isExecuted && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          <span>SL Triggered</span>
                        </span>
                      )}
                      {isSlOrder && isPending && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span>Stoploss Order</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-tabular flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-slate-300 font-medium">{dateTimeStr}</span>
                      <span>&bull;</span>
                      <span>Qty: {order.quantity}</span>
                      {order.price ? <span>@ Limit ₹{order.price.toFixed(2)}</span> : null}
                      {order.trigger_price ? (
                        <span className="text-amber-300 font-semibold">
                          @ Stoploss Trigger ₹{order.trigger_price.toFixed(2)}
                        </span>
                      ) : null}
                    </div>
                    {isRejected && order.rejection_reason && (
                      <div className="text-[10px] text-rose-400 mt-1">
                        Reason: {order.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 font-tabular shrink-0 pl-10 sm:pl-0">
                  <div className="text-left sm:text-right">
                    <span
                      className={`font-bold text-[10px] px-2 py-0.5 rounded-full ${
                        isPending
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : isExecuted
                          ? isSlOrder
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-extrabold'
                            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isExecuted && isSlOrder ? 'EXECUTED (SL)' : order.status}
                    </span>
                    {order.execution_price != null && (
                      <div className="mt-0.5">
                        {isSlOrder && order.trigger_price != null ? (
                          <div className="text-[11px] font-tabular">
                            <span className="text-slate-400">Trigger: </span>
                            <span className="text-amber-300 font-semibold">₹{order.trigger_price.toFixed(2)}</span>
                            <span className="text-slate-500 mx-1">&rarr;</span>
                            <span className="text-emerald-400 font-bold">Filled: ₹{order.execution_price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-300 font-semibold">
                            Exec: ₹{order.execution_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {isPending && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingId === order.id}
                      className="p-1.5 rounded-lg bg-obsidian-700 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition"
                      title="Cancel Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
