import {
  Check,
  Edit2,
  FolderPlus,
  Globe,
  Loader2,
  PanelLeftClose,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { WatchlistGroup } from '../hooks/useMarketData'
import { searchSymbols } from '../lib/api'
import { StockQuote } from '../lib/types'

interface WatchlistProps {
  watchlists: WatchlistGroup[]
  activeWatchlistId: string
  onSelectWatchlist: (id: string) => void
  onRenameWatchlist: (id: string, newName: string) => void
  onAddWatchlist?: () => void
  onDeleteWatchlist?: (id: string) => void
  stocks: StockQuote[]
  selectedSymbol: string
  onSelectSymbol: (symbol: string) => void
  onOpenOrderModal: (symbol: string, side: 'BUY' | 'SELL') => void
  flashMap: Record<string, 'UP' | 'DOWN'>
  onAddSymbol?: (symbol: string) => Promise<any>
  onRemoveSymbol?: (symbol: string) => void
  onToggleCollapse?: () => void
  isCollapsed?: boolean
}

export const Watchlist: React.FC<WatchlistProps> = ({
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onRenameWatchlist,
  onAddWatchlist,
  onDeleteWatchlist,
  stocks,
  selectedSymbol,
  onSelectSymbol,
  onOpenOrderModal,
  flashMap,
  onAddSymbol,
  onRemoveSymbol,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null)
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Watchlist Renaming State
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const activeWatchlist = useMemo(() => {
    return watchlists.find(w => w.id === activeWatchlistId) || watchlists[0]
  }, [watchlists, activeWatchlistId])

  // Handle renaming start
  const handleStartRename = () => {
    if (!activeWatchlist) return
    setEditNameValue(activeWatchlist.name)
    setIsEditingName(true)
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 50)
  }

  const handleSaveRename = () => {
    if (activeWatchlist && editNameValue.trim()) {
      onRenameWatchlist(activeWatchlist.id, editNameValue.trim())
    }
    setIsEditingName(false)
  }

  // Debounced search across the 2,570+ NSE Directory
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setGlobalSearchResults([])
      setIsSearchingGlobal(false)
      return
    }

    let unmounted = false
    setIsSearchingGlobal(true)
    const timeout = setTimeout(() => {
      searchSymbols(q)
        .then(results => {
          if (!unmounted) {
            // Exclude already loaded stocks from global additions
            const currentSymbols = new Set(
              stocks.map(s => s.symbol.toUpperCase())
            )
            const newResults = results.filter(
              r => !currentSymbols.has(r.symbol.toUpperCase())
            )
            setGlobalSearchResults(newResults)
          }
        })
        .catch(err => console.warn('Global search error:', err))
        .finally(() => {
          if (!unmounted) setIsSearchingGlobal(false)
        })
    }, 250)

    return () => {
      unmounted = true
      clearTimeout(timeout)
    }
  }, [searchQuery, stocks])

  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return stocks
    return stocks.filter(stock => {
      return (
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        (stock.sector && stock.sector.toLowerCase().includes(q))
      )
    })
  }, [stocks, searchQuery])

  const handleAddSymbol = async (symbolToAdd: string) => {
    const q = symbolToAdd.trim().toUpperCase()
    if (!q || !onAddSymbol) return
    setIsAdding(true)
    setAddingSymbol(q)
    setAddError(null)
    try {
      await onAddSymbol(q)
      setSearchQuery('')
      setGlobalSearchResults([])
    } catch (err: any) {
      setAddError(err.message || `Could not fetch ${q} from NSE`)
    } finally {
      setIsAdding(false)
      setAddingSymbol(null)
    }
  }

  const handleRemoveStock = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation()
    if (onRemoveSymbol) {
      onRemoveSymbol(symbol)
    }
  }

  return (
    <div className="flex flex-col h-full bg-obsidian-800 border-r border-obsidian-700/80 select-none">
      {/* Top Header: Watchlist Title, Scrip Count & Collapse Button */}
      <div className="p-3 border-b border-obsidian-700/80 bg-obsidian-850/50 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Watchlist Title & Inline Renaming */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveRename()
                    if (e.key === 'Escape') setIsEditingName(false)
                  }}
                  maxLength={20}
                  className="w-full px-2 py-0.5 text-xs font-extrabold bg-obsidian-950 border border-brand-blue rounded text-white focus:outline-none"
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                  title="Save Name"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 group cursor-pointer"
                onClick={handleStartRename}
              >
                <span className="font-extrabold text-sm text-slate-100 truncate tracking-tight hover:text-brand-cyan transition">
                  {activeWatchlist?.name || 'Watchlist'}
                </span>
                <button
                  className="p-0.5 text-slate-500 hover:text-brand-cyan opacity-60 group-hover:opacity-100 transition"
                  title="Rename Watchlist"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-obsidian-900 border border-obsidian-700 text-slate-400">
              {stocks.length}
            </span>
          </div>

          {/* Desktop/Tablet Collapse Sidebar Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-obsidian-700/80 transition"
              title="Collapse Watchlist Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setAddError(null)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
                if (globalSearchResults.length > 0) {
                  handleAddSymbol(globalSearchResults[0].symbol)
                } else if (filteredStocks.length === 0) {
                  handleAddSymbol(searchQuery.trim())
                }
              }
            }}
            placeholder="Search & add NSE stocks (e.g. Zomato, Tata, Adani)..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-obsidian-900 border border-obsidian-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-blue transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setGlobalSearchResults([])
                setAddError(null)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Direct Add Button */}
        {searchQuery.trim().length >= 2 &&
          filteredStocks.length === 0 &&
          globalSearchResults.length === 0 && (
            <div className="pt-1">
              <button
                onClick={() => handleAddSymbol(searchQuery.trim())}
                disabled={isAdding}
                className="w-full py-2 px-3 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/30 border border-brand-blue/40 text-brand-cyan text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      Fetching &quot;{searchQuery.trim().toUpperCase()}&quot;
                      from NSE...
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      Search &amp; Add &quot;{searchQuery.trim().toUpperCase()}
                      &quot; to Top
                    </span>
                  </>
                )}
              </button>
              {addError && (
                <div className="mt-1 text-[11px] text-rose-400 text-center font-medium">
                  {addError}
                </div>
              )}
            </div>
          )}

        {/* Dynamic Watchlist Tabs with + Add Button (Max 5) */}
        <div className="flex items-center gap-1.5 pt-0.5">
          {watchlists.map((wl, index) => {
            const isActive = wl.id === activeWatchlistId
            return (
              <button
                key={wl.id}
                onClick={() => {
                  onSelectWatchlist(wl.id)
                  setSearchQuery('')
                  setGlobalSearchResults([])
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 border ${
                  isActive
                    ? 'bg-brand-blue/20 border-brand-blue/60 text-brand-cyan shadow-sm shadow-brand-blue/10'
                    : 'bg-obsidian-900/60 border-obsidian-700/60 text-slate-400 hover:text-slate-200 hover:bg-obsidian-700/40'
                }`}
                title={`${wl.name} (${wl.symbols.length} stocks)`}
              >
                <span>{index + 1}</span>
                <span className="text-[10px] opacity-70 font-normal hidden sm:inline">
                  {wl.symbols.length > 0 ? `(${wl.symbols.length})` : ''}
                </span>
              </button>
            )
          })}

          {watchlists.length < 5 && onAddWatchlist && (
            <button
              onClick={onAddWatchlist}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-dashed border-obsidian-600 bg-obsidian-900/40 hover:bg-brand-blue/20 hover:border-brand-blue text-slate-400 hover:text-brand-cyan transition flex items-center justify-center gap-1 shrink-0"
              title={`Add Watchlist ${watchlists.length + 1} (Max 5)`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stock List & Global Search Results */}
      <div className="flex-1 overflow-y-auto divide-y divide-obsidian-700/40">
        {/* Monitored Active Stocks */}
        {filteredStocks.map(stock => {
          const isSelected = stock.symbol === selectedSymbol
          const flash = flashMap[stock.symbol]
          const isPositive = stock.change >= 0
          const rangeSpan = Math.max(
            1,
            (stock.high52 || stock.ltp * 1.2) - (stock.low52 || stock.ltp * 0.8)
          )
          const rangePos = Math.min(
            100,
            Math.max(
              0,
              ((stock.ltp - (stock.low52 || stock.ltp * 0.8)) / rangeSpan) * 100
            )
          )

          return (
            <div
              key={stock.symbol}
              onClick={() => onSelectSymbol(stock.symbol)}
              className={`group relative px-3.5 py-3 cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-obsidian-700/40 border-l-2 border-brand-blue'
                  : 'hover:bg-obsidian-700/20'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-slate-100 tracking-tight">
                      {stock.symbol}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-slate-400 px-1 py-0.5 rounded bg-obsidian-900 border border-obsidian-700">
                      NSE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[130px] sm:max-w-[160px]">
                    {stock.name}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-tabular text-sm font-bold transition-colors rounded px-1.5 py-0.5 inline-block ${
                      flash === 'UP'
                        ? 'flash-up'
                        : flash === 'DOWN'
                          ? 'flash-down'
                          : isPositive
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                    }`}
                  >
                    ₹
                    {(stock.ltp ?? 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-400" />
                    )}
                    <span
                      className={`text-[11px] font-tabular font-medium ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {(stock.change ?? 0).toFixed(2)} ({isPositive ? '+' : ''}
                      {(stock.pChange ?? 0).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* 52-Week Range Mini Bar */}
              <div className="mt-2 flex items-center justify-between gap-1 text-[10px] text-slate-500">
                <span className="font-tabular">
                  L: ₹{stock.low52 ? Number(stock.low52).toFixed(0) : '-'}
                </span>
                <div className="flex-1 h-1 bg-obsidian-900 rounded-full mx-1.5 overflow-hidden">
                  <div
                    className="h-full bg-slate-600 rounded-full"
                    style={{ width: `${rangePos}%` }}
                  />
                </div>
                <span className="font-tabular">
                  H: ₹{stock.high52 ? Number(stock.high52).toFixed(0) : '-'}
                </span>
              </div>

              {/* Quick Action Hover Buttons (Buy, Sell, Remove) */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-obsidian-800/95 p-1 rounded-lg border border-obsidian-600 shadow-xl z-10">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onOpenOrderModal(stock.symbol, 'BUY')
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow transition active:scale-95"
                  title="Buy"
                >
                  B
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onOpenOrderModal(stock.symbol, 'SELL')
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded shadow transition active:scale-95"
                  title="Sell"
                >
                  S
                </button>
                {onRemoveSymbol && (
                  <button
                    onClick={e => handleRemoveStock(e, stock.symbol)}
                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition active:scale-95"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Global NSE Directory Search Results Section */}
        {globalSearchResults.length > 0 && (
          <div className="bg-obsidian-900/60 p-2 border-t border-obsidian-700">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-brand-cyan uppercase tracking-wider">
              <Globe className="w-3 h-3" />
              <span>
                Available on NSE ({globalSearchResults.length} matches)
              </span>
            </div>

            <div className="divide-y divide-obsidian-800/80">
              {globalSearchResults.map(result => (
                <div
                  key={result.symbol}
                  className="p-2.5 hover:bg-obsidian-800/80 rounded-xl transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs text-white">
                        {result.symbol}
                      </span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-obsidian-950 border border-obsidian-800 text-slate-400">
                        NSE EQ
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-[210px]">
                      {result.name}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddSymbol(result.symbol)}
                    disabled={isAdding && addingSymbol === result.symbol}
                    className="px-2.5 py-1 rounded-lg bg-brand-blue hover:bg-brand-blue/80 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {isAdding && addingSymbol === result.symbol ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty Watchlist State */}
        {filteredStocks.length === 0 &&
          globalSearchResults.length === 0 &&
          !isSearchingGlobal && (
            <div className="p-8 text-center text-slate-500 text-xs">
              {stocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-obsidian-900 border border-obsidian-700 flex items-center justify-center text-slate-400 shadow-inner">
                    <FolderPlus className="w-6 h-6 text-brand-cyan/70" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">
                      Watchlist is empty
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 max-w-[220px] mx-auto">
                      Search above across 2,500+ NSE scrips to add stocks to{' '}
                      {activeWatchlist?.name || 'this watchlist'}.
                    </p>
                  </div>
                </div>
              ) : (
                <span>No scrips matching &quot;{searchQuery}&quot;</span>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
