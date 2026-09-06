import { useState, useEffect, useRef, useCallback } from 'react';
import { StockQuote } from '../lib/types';
import { getWatchlist, addSymbolToWatchlist } from '../lib/api';

export function useMarketData() {
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE');
  const [flashMap, setFlashMap] = useState<Record<string, 'UP' | 'DOWN'>>({});
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastTickTime, setLastTickTime] = useState<number>(Date.now());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const flashTimeoutsRef = useRef<Record<string, any>>({});

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

  // Initialize initial watchlist via REST with auto-retry
  useEffect(() => {
    let unmounted = false;
    const fetchWatchlist = async () => {
      try {
        const data = await getWatchlist();
        if (!unmounted && Array.isArray(data) && data.length > 0) {
          setStocks((prev) => (prev.length === 0 ? data : prev));
        }
      } catch (err) {
        console.warn('Initial watchlist fetch:', err);
      }
    };

    fetchWatchlist();
    const retryInterval = setInterval(() => {
      if (!unmounted) {
        setStocks((current) => {
          if (current.length === 0) {
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

  // Dynamic add symbol handler
  const addSymbol = useCallback(async (symbol: string) => {
    const cleanSymbol = symbol.trim().toUpperCase();
    const quote = await addSymbolToWatchlist(cleanSymbol);
    if (quote) {
      setStocks((prev) => {
        if (prev.some((s) => s.symbol === quote.symbol)) {
          return prev.map((s) => (s.symbol === quote.symbol ? quote : s));
        }
        return [quote, ...prev];
      });
      setSelectedSymbol(quote.symbol);
    }
    return quote;
  }, []);

  // Connect WebSocket
  useEffect(() => {
    let unmounted = false;

    function connectWs() {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/market`;

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
          // Sanitize raw NaN or undefined values if yfinance returns unpopulated float
          const sanitized = typeof event.data === 'string' ? event.data.replace(/:\s*NaN/g, ': null') : event.data;
          const payload = JSON.parse(sanitized);

          if (payload.type === 'SNAPSHOT' && Array.isArray(payload.data) && payload.data.length > 0) {
            setStocks(payload.data);
            setLastTickTime(Date.now());
          } else if (payload.type === 'TICK_UPDATE' && Array.isArray(payload.data)) {
            const updates: StockQuote[] = payload.data;
            setLastTickTime(Date.now());

            setStocks((prevStocks) => {
              const stockMap = new Map<string, StockQuote>(prevStocks.map((s) => [s.symbol, s]));

              for (const update of updates) {
                const existing = stockMap.get(update.symbol);
                if (existing) {
                  if (update.ltp > existing.ltp) {
                    triggerFlash(update.symbol, 'UP');
                  } else if (update.ltp < existing.ltp) {
                    triggerFlash(update.symbol, 'DOWN');
                  }
                }
                stockMap.set(update.symbol, update);
              }

              return Array.from(stockMap.values());
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

  const selectedStock = stocks.find((s) => s.symbol === selectedSymbol) || stocks[0] || null;

  return {
    stocks,
    selectedSymbol,
    setSelectedSymbol,
    selectedStock,
    flashMap,
    isConnected,
    lastTickTime,
    addSymbol,
  };
}
