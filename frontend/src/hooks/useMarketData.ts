import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StockQuote } from '../lib/types';
import { getWatchlist, addSymbolToWatchlist } from '../lib/api';

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
}

const DEFAULT_SYMBOLS_WL1 = [
  'RELIANCE',
  'TCS',
  'INFY',
  'HDFCBANK',
  'ICICIBANK',
  'SBIN',
  'BHARTIARTL',
  'ITC',
  'LT',
  'KOTAKBANK',
  'AXISBANK',
  'MARUTI',
  'SUNPHARMA',
  'TITAN',
  'BAJFINANCE',
  'WIPRO',
  'TATASTEEL',
  'NIFTY 50',
  'BANKNIFTY',
];

const DEFAULT_WATCHLISTS: WatchlistGroup[] = [
  { id: 'wl_1', name: 'Watchlist 1', symbols: DEFAULT_SYMBOLS_WL1 },
  { id: 'wl_2', name: 'Watchlist 2', symbols: ['NIFTY 50', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY'] },
];

const STORAGE_KEY_WATCHLISTS = 'abhyastrade_watchlists_v2';
const STORAGE_KEY_ACTIVE_WL = 'abhyastrade_active_wl_id';

function loadSavedWatchlists(): WatchlistGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WATCHLISTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 5);
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved watchlists:', err);
  }
  return DEFAULT_WATCHLISTS;
}

function loadSavedActiveWlId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_WL);
    if (raw) return raw;
  } catch {}
  return 'wl_1';
}

export function useMarketData() {
  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>(loadSavedWatchlists);
  const [activeWatchlistId, setActiveWatchlistIdState] = useState<string>(loadSavedActiveWlId);
  const [quotesMap, setQuotesMap] = useState<Record<string, StockQuote>>({});
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [flashMap, setFlashMap] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const flashTimeoutsRef = useRef<Record<string, any>>({});

  // Persist watchlists whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WATCHLISTS, JSON.stringify(watchlists));
    } catch (err) {
      console.warn('Failed to save watchlists to localStorage:', err);
    }
  }, [watchlists]);

  // Set active watchlist and persist
  const setActiveWatchlistId = useCallback((id: string) => {
    setActiveWatchlistIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_WL, id);
    } catch {}
  }, []);

  // Add a new watchlist (up to 5 maximum)
  const addWatchlist = useCallback(() => {
    if (watchlists.length >= 5) return null;
    const newIdx = watchlists.length + 1;
    const newWl: WatchlistGroup = {
      id: `wl_${Date.now()}`,
      name: `Watchlist ${newIdx}`,
      symbols: [],
    };
    setWatchlists((prev) => [...prev, newWl]);
    setActiveWatchlistId(newWl.id);
    return newWl.id;
  }, [watchlists.length, setActiveWatchlistId]);

  // Delete a watchlist (minimum 1 retained)
  const deleteWatchlist = useCallback((id: string) => {
    if (watchlists.length <= 1) return;
    setWatchlists((prev) => prev.filter((w) => w.id !== id));
    if (activeWatchlistId === id) {
      const remaining = watchlists.filter((w) => w.id !== id);
      if (remaining[0]) {
        setActiveWatchlistId(remaining[0].id);
      }
    }
  }, [watchlists, activeWatchlistId, setActiveWatchlistId]);

  // Active Watchlist reference
  const activeWatchlist = useMemo(() => {
    return watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];
  }, [watchlists, activeWatchlistId]);

  // Trigger brief flash for updated ticks
  const triggerFlash = useCallback((symbol: string, direction: 'UP' | 'DOWN') => {
    if (flashTimeoutsRef.current[symbol]) {
      clearTimeout(flashTimeoutsRef.current[symbol]);
    }
    
    setFlashMap((prev) => ({ ...prev, [symbol]: direction }));
    
    flashTimeoutsRef.current[symbol] = setTimeout(() => {
      setFlashMap((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
    }, 650);
  }, []);

  // Rename a watchlist
  const renameWatchlist = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setWatchlists((prev) =>
      prev.map((wl) => (wl.id === id ? { ...wl, name: trimmed } : wl))
    );
  }, []);

  // Remove symbol from active watchlist
  const removeSymbol = useCallback((symbol: string) => {
    const clean = symbol.trim().toUpperCase();
    setWatchlists((prev) =>
      prev.map((wl) => {
        if (wl.id === activeWatchlistId) {
          return {
            ...wl,
            symbols: wl.symbols.filter((s) => s.toUpperCase() !== clean),
          };
        }
        return wl;
      })
    );

    // If removed stock was selected, switch to next available symbol
    setSelectedSymbol((curr) => {
      if (curr.toUpperCase() === clean) {
        const remaining = activeWatchlist.symbols.filter((s) => s.toUpperCase() !== clean);
        return remaining[0] || '';
      }
      return curr;
    });
  }, [activeWatchlistId, activeWatchlist.symbols]);

  // Dynamic add symbol handler (Prepends to top of active watchlist)
  const addSymbol = useCallback(async (symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return null;

    const quote = await addSymbolToWatchlist(cleanSymbol);
    if (quote) {
      // Store in quotesMap
      setQuotesMap((prev) => ({ ...prev, [quote.symbol]: quote }));

      // Prepend to active watchlist symbols (newest at the top)
      setWatchlists((prev) =>
        prev.map((wl) => {
          if (wl.id === activeWatchlistId) {
            const filtered = wl.symbols.filter((s) => s.toUpperCase() !== quote.symbol.toUpperCase());
            return {
              ...wl,
              symbols: [quote.symbol, ...filtered],
            };
          }
          return wl;
        })
      );
      setSelectedSymbol(quote.symbol);
    }
    return quote;
  }, [activeWatchlistId]);

  // Fetch initial watchlist quotes via REST
  useEffect(() => {
    let unmounted = false;
    const fetchWatchlist = async () => {
      try {
        const data = await getWatchlist();
        if (!unmounted && Array.isArray(data) && data.length > 0) {
          setQuotesMap((prev) => {
            const next = { ...prev };
            for (const q of data) {
              if (q && q.symbol) next[q.symbol] = q;
            }
            return next;
          });
        }
      } catch (err) {
        console.warn('Initial watchlist fetch:', err);
      }
    };

    fetchWatchlist();
    const retryInterval = setInterval(() => {
      if (!unmounted) {
        setQuotesMap((current) => {
          if (Object.keys(current).length === 0) {
            fetchWatchlist();
          }
          return current;
        });
      }
    }, 2000);

    return () => {
      unmounted = true;
      clearInterval(retryInterval);
    };
  }, []);

  // Ensure missing quotes for symbols in active watchlist are fetched
  useEffect(() => {
    if (!activeWatchlist || activeWatchlist.symbols.length === 0) return;
    activeWatchlist.symbols.forEach((sym) => {
      if (!quotesMap[sym]) {
        addSymbolToWatchlist(sym)
          .then((quote) => {
            if (quote) {
              setQuotesMap((prev) => ({ ...prev, [quote.symbol]: quote }));
            }
          })
          .catch(() => {});
      }
    });
  }, [activeWatchlist, quotesMap]);

  // Ensure quote is fetched for selectedSymbol even if it is not in current active watchlist
  useEffect(() => {
    if (selectedSymbol && !quotesMap[selectedSymbol]) {
      addSymbolToWatchlist(selectedSymbol)
        .then((quote) => {
          if (quote) {
            setQuotesMap((prev) => ({ ...prev, [quote.symbol]: quote }));
          }
        })
        .catch(() => {});
    }
  }, [selectedSymbol, quotesMap]);

  // Connect WebSocket
  useEffect(() => {
    let unmounted = false;

    function getWsUrl(): string {
      if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL;
      }
      if (import.meta.env.VITE_API_URL) {
        const apiUrl = import.meta.env.VITE_API_URL as string;
        const wsBase = apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
        return `${wsBase}/ws/market`;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}/ws/market`;
    }

    function connectWs() {
      if (unmounted) return;
      const wsUrl = getWsUrl();

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) return;
        setIsConnected(true);
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 15000);
        (ws as any)._pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          if (event.data === 'pong') return;
          const sanitized = typeof event.data === 'string' ? event.data.replace(/:\s*NaN/g, ': null') : event.data;
          const payload = JSON.parse(sanitized);

          if (payload.type === 'SNAPSHOT' && Array.isArray(payload.data) && payload.data.length > 0) {
            setQuotesMap((prev) => {
              const next = { ...prev };
              for (const q of payload.data) {
                if (q && q.symbol) next[q.symbol] = q;
              }
              return next;
            });
            setLastTickTime(Date.now());
          } else if (payload.type === 'TICK_UPDATE' && Array.isArray(payload.data)) {
            const updates: StockQuote[] = payload.data;
            setLastTickTime(Date.now());

            setQuotesMap((prevQuotes) => {
              const next = { ...prevQuotes };
              for (const update of updates) {
                const existing = next[update.symbol];
                if (existing) {
                  if (update.ltp > existing.ltp) {
                    triggerFlash(update.symbol, 'UP');
                  } else if (update.ltp < existing.ltp) {
                    triggerFlash(update.symbol, 'DOWN');
                  }
                }
                next[update.symbol] = update;
              }
              return next;
            });
          }
        } catch (err) {
          console.error('Error handling WS message:', err);
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setIsConnected(false);
        if ((ws as any)._pingInterval) {
          clearInterval((ws as any)._pingInterval);
        }
        reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectWs();

    return () => {
      unmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        if ((wsRef.current as any)._pingInterval) {
          clearInterval((wsRef.current as any)._pingInterval);
        }
        wsRef.current.close();
      }
      Object.values(flashTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [triggerFlash]);

  // Compute ordered stocks array for the active watchlist
  const stocks = useMemo(() => {
    if (!activeWatchlist || !activeWatchlist.symbols) return [];
    return activeWatchlist.symbols
      .map((sym) => {
        const quote = quotesMap[sym];
        if (quote) return quote;
        // Fallback placeholder while quote is being fetched
        return {
          symbol: sym,
          name: sym,
          sector: 'NSE Equity',
          ltp: 0,
          open: 0,
          high: 0,
          low: 0,
          close: 0,
          change: 0,
          pChange: 0,
          volume: 0,
          high52: 0,
          low52: 0,
        } as StockQuote;
      });
  }, [activeWatchlist, quotesMap]);

  // Initialize selected symbol on first load if not set
  useEffect(() => {
    if (!selectedSymbol && stocks.length > 0) {
      setSelectedSymbol(stocks[0].symbol);
    }
  }, [stocks, selectedSymbol]);

  // Resolve selected stock object from quote cache regardless of active watchlist tab
  const selectedStock = quotesMap[selectedSymbol] || stocks.find((s) => s.symbol === selectedSymbol) || stocks[0] || null;

  return {
    watchlists,
    activeWatchlistId,
    setActiveWatchlistId,
    addWatchlist,
    deleteWatchlist,
    renameWatchlist,
    stocks,
    selectedSymbol,
    setSelectedSymbol,
    selectedStock,
    flashMap,
    isConnected,
    lastTickTime,
    addSymbol,
    removeSymbol,
  };
}


