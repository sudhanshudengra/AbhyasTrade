import { useState, useEffect, useCallback } from 'react';
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

  const refreshAll = useCallback(async () => {
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
    }
  }, []);

  // Poll portfolio every 2.5s for live PnL updates
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 2500);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const placeOrder = async (payload: PlaceOrderPayload) => {
    const res = await apiPlaceOrder(payload);
    await refreshAll();
    return res;
  };

  const cancelOrder = async (orderId: string) => {
    const res = await apiCancelOrder(orderId);
    await refreshAll();
    return res;
  };

  const exitPosition = async (symbol: string, productType: 'CNC' | 'MIS') => {
    const res = await apiExitPosition(symbol, productType);
    await refreshAll();
    return res;
  };

  const squareoffAllMis = async () => {
    const res = await apiSquareoffAllMis();
    await refreshAll();
    return res;
  };

  const resetPortfolio = async () => {
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
