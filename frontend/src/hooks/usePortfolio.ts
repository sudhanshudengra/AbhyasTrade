import { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioSummary, Position, Order, Trade, PlaceOrderPayload } from '../lib/types';
import {
  getPortfolioSummary,
  getPositions,
  getOrders,
  getTrades,
  placeOrder as apiPlaceOrder,
  cancelOrder as apiCancelOrder,
  exitPosition as apiExitPosition,
  squareoffAllMis as apiSquareoffAllMis,
  resetPortfolio as apiResetPortfolio
} from '../lib/api';

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isRefreshingRef = useRef<boolean>(false);

  const refreshAll = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const [summaryData, positionsData, ordersData, tradesData] = await Promise.all([
        getPortfolioSummary().catch(() => null),
        getPositions().catch(() => []),
        getOrders().catch(() => []),
        getTrades().catch(() => [])
      ]);

      if (summaryData) setPortfolio(summaryData);
      setPositions(positionsData);
      setOrders(ordersData);
      setTrades(tradesData);
      setError(null);
    } catch (err: any) {
      console.error('Error refreshing portfolio:', err);
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setIsLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  // Poll portfolio every 3s for live PnL updates
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 3000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const placeOrder = async (payload: PlaceOrderPayload) => {
    const res = await apiPlaceOrder(payload);
    // Asynchronously trigger refresh
    refreshAll();
    return res;
  };

  const cancelOrder = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' as const } : o))
    );
    const res = await apiCancelOrder(orderId);
    refreshAll();
    return res;
  };

  const exitPosition = async (symbol: string, productType: 'CNC' | 'MIS') => {
    // Optimistic UI update: immediately mark position as closed
    setPositions((prev) =>
      prev.map((p) =>
        p.symbol === symbol && p.product_type === productType
          ? { ...p, quantity: 0, unrealized_pnl: 0, is_open: false }
          : p
      )
    );
    try {
      const res = await apiExitPosition(symbol, productType);
      await refreshAll();
      return res;
    } catch (err) {
      // Re-fetch on error to revert optimistic update
      refreshAll();
      throw err;
    }
  };

  const squareoffAllMis = async () => {
    setPositions((prev) =>
      prev.map((p) =>
        p.product_type === 'MIS'
          ? { ...p, quantity: 0, unrealized_pnl: 0, is_open: false }
          : p
      )
    );
    try {
      const res = await apiSquareoffAllMis();
      await refreshAll();
      return res;
    } catch (err) {
      refreshAll();
      throw err;
    }
  };

  const resetPortfolio = async () => {
    setPositions([]);
    setOrders([]);
    setTrades([]);
    const res = await apiResetPortfolio();
    await refreshAll();
    return res;
  };

  return {
    portfolio,
    positions,
    orders,
    trades,
    isLoading,
    error,
    refreshAll,
    placeOrder,
    cancelOrder,
    exitPosition,
    squareoffAllMis,
    resetPortfolio
  };
}
