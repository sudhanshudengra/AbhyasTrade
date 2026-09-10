import {
  AlertTriangle,
  ChevronRight,
  Info,
  Layers,
  LogOut,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import React, { useState } from 'react'
import { OrderSide, Position } from '../lib/types'
import { PositionDetailModal } from './PositionDetailModal'

interface PositionsDeskProps {
  positions: Position[]
  onExitPosition: (symbol: string, productType: 'CNC' | 'MIS') => Promise<any>
  onSquareoffAllMis: () => Promise<any>
  onRefresh: () => Promise<void>
  onOpenOrderModal?: (symbol: string, side: OrderSide) => void
}

export const PositionsDesk: React.FC<PositionsDeskProps> = ({
  positions,
  onExitPosition,
  onSquareoffAllMis,
  onRefresh,
  onOpenOrderModal
}) => {
  const [isExitingSymbol, setIsExitingSymbol] = useState<string | null>(null)
  const [isSquaringOff, setIsSquaringOff] = useState<boolean>(false)
  const [showSquareoffModal, setShowSquareoffModal] = useState<boolean>(false)
  const [selectedPositionForDetail, setSelectedPositionForDetail] =
    useState<Position | null>(null)

  const openPositions = positions.filter(p => p.quantity !== 0)
  const closedPositions = positions.filter(p => p.quantity === 0)

  const totalUnrealized = openPositions.reduce(
    (acc, p) => acc + (p.unrealized_pnl || 0),
    0
  )
  const totalRealized = positions.reduce(
    (acc, p) => acc + (p.realized_pnl || 0),
    0
  )

  const handleExit = async (symbol: string, productType: 'CNC' | 'MIS') => {
    setIsExitingSymbol(`${symbol}_${productType}`)
    try {
      await onExitPosition(symbol, productType)
    } finally {
      setIsExitingSymbol(null)
    }
  }

  const handleSquareoffAll = async () => {
    setIsSquaringOff(true)
    try {
      await onSquareoffAllMis()
      setShowSquareoffModal(false)
    } finally {
      setIsSquaringOff(false)
    }
  }

  // Keep selected position data up to date when positions prop updates
  const activeDetailPosition = selectedPositionForDetail
    ? positions.find(
        p =>
          p.symbol === selectedPositionForDetail.symbol &&
          p.product_type === selectedPositionForDetail.product_type
      ) || selectedPositionForDetail
    : null

  return (
    <div className="flex flex-col h-full bg-obsidian-900 overflow-hidden">
      {/* Positions Header */}
      <div className="px-4 py-3 bg-obsidian-800/90 border-b border-obsidian-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-cyan" />
            <span className="font-extrabold text-sm text-white">
              Positions Desk
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-cyan font-bold font-tabular">
              {openPositions.length} Open
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="p-1 rounded-lg hover:bg-obsidian-700 text-slate-400 hover:text-white transition"
            title="Refresh positions"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* PnL Summaries & Emergency Squareoff */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs font-tabular">
            <div>
              <span className="text-slate-400">Unrealized: </span>
              <span
                className={`font-bold ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {totalUnrealized >= 0 ? '+' : ''}₹{totalUnrealized.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Realized: </span>
              <span
                className={`font-bold ${totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {totalRealized >= 0 ? '+' : ''}₹{totalRealized.toFixed(2)}
              </span>
            </div>
          </div>

          {openPositions.some(p => p.product_type === 'MIS') && (
            <button
              onClick={() => setShowSquareoffModal(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-500/40 transition flex items-center gap-1.5 shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Square Off All MIS</span>
            </button>
          )}
        </div>
      </div>

      {/* Positions Table / List */}
      <div className="flex-1 overflow-y-auto">
        {positions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No open or closed positions yet. Place orders from the watchlist!
          </div>
        ) : (
          <div className="divide-y divide-obsidian-700/40">
            {openPositions.map(pos => {
              const isLong = pos.quantity > 0
              const isProfit = (pos.unrealized_pnl || 0) >= 0
              const key = `${pos.symbol}_${pos.product_type}`
              const isExiting = isExitingSymbol === key

              return (
                <div
                  key={pos.id || key}
                  onClick={() => setSelectedPositionForDetail(pos)}
                  className="px-4 py-3 hover:bg-obsidian-800/60 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group relative"
                  title="Click to view detailed position analysis & actions"
                >
                  {/* Symbol & Product Type */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-8 rounded-full transition-all group-hover:scale-y-110 ${
                        isLong ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white tracking-tight group-hover:text-brand-cyan transition">
                          {pos.symbol}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pos.product_type === 'MIS'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                              : 'bg-brand-blue/20 text-brand-cyan border border-brand-blue/30'
                          }`}
                        >
                          {pos.product_type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isLong
                              ? 'bg-emerald-950/60 text-emerald-300'
                              : 'bg-rose-950/60 text-rose-300'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-tabular flex items-center gap-1.5">
                        <span>
                          Qty:{' '}
                          <strong className="text-slate-200">
                            {Math.abs(pos.quantity)}
                          </strong>
                        </span>
                        <span>&bull;</span>
                        <span>Avg: ₹{pos.average_price.toFixed(2)}</span>
                        <span>&bull;</span>
                        <span>
                          LTP: ₹
                          {pos.ltp?.toFixed(2) || pos.average_price.toFixed(2)}
                        </span>
                        <span className=" sm:inline text-brand-cyan/70 text-[10px] opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                          <Info className="w-3 h-3 inline" /> Click for details
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PnL & Exit Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 font-tabular">
                    <div className="text-right">
                      <div
                        className={`text-sm font-extrabold flex items-center justify-end gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isProfit ? '+' : ''}₹
                          {pos.unrealized_pnl?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}
                      >
                        {isProfit ? '+' : ''}
                        {pos.pnl_percent?.toFixed(2) || '0.00'}%
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation()
                        handleExit(pos.symbol, pos.product_type)
                      }}
                      disabled={isExiting}
                      className="px-3 py-1.5 rounded-lg bg-obsidian-700 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 text-xs font-semibold border border-obsidian-600 hover:border-rose-500/40 transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isExiting ? 'Exiting...' : 'Exit'}</span>
                    </button>

                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              )
            })}

            {/* Closed Positions Section */}
            {closedPositions.length > 0 && (
              <div className="bg-obsidian-950/40 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Closed Positions ({closedPositions.length})
                </div>
                {closedPositions.map(pos => (
                  <div
                    key={pos.id}
                    className="py-1.5 flex items-center justify-between text-xs text-slate-400 font-tabular"
                  >
                    <span>
                      {pos.symbol} ({pos.product_type})
                    </span>
                    <span
                      className={`font-bold ${pos.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      Realized: {pos.realized_pnl >= 0 ? '+' : ''}₹
                      {pos.realized_pnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Position Detail Modal */}
      {selectedPositionForDetail && (
        <PositionDetailModal
          isOpen={!!selectedPositionForDetail}
          onClose={() => setSelectedPositionForDetail(null)}
          position={activeDetailPosition}
          onExitPosition={onExitPosition}
          onOpenOrderModal={onOpenOrderModal}
        />
      )}

      {/* Confirmation Modal for Square Off All MIS */}
      {showSquareoffModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-800 border border-obsidian-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">
                Square Off All MIS Positions?
              </h3>
            </div>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              This will place immediate market exit orders for all open Intraday
              (MIS) positions at current market prices and release margin.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSquareoffModal(false)}
                disabled={isSquaringOff}
                className="px-4 py-2 rounded-lg bg-obsidian-700 hover:bg-obsidian-600 text-slate-200 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSquareoffAll}
                disabled={isSquaringOff}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"
              >
                {isSquaringOff ? 'Squaring Off...' : 'Confirm Square Off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
