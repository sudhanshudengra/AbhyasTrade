import {
  StockQuote,
  CandleData,
  PortfolioSummary,
  Position,
  Order,
  Trade,
  PlaceOrderPayload,
  ChargeBreakdown,
  RoundtripEstimate
} from './types';

// Support dynamic backend URL in production (e.g. Render/Railway) with local fallback
const rawApiBase = import.meta.env.VITE_API_URL || '/api';
const API_BASE = rawApiBase.endsWith('/api') ? rawApiBase : (rawApiBase === '' || rawApiBase === '/' ? '/api' : `${rawApiBase.replace(/\/$/, '')}/api`);
let currentUserId = '00000000-0000-0000-0000-000000000001';

export function setApiUserId(userId: string) {
  if (userId) {
    currentUserId = userId;
  }
}

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': currentUserId,
  };
}

export async function getWatchlist(): Promise<StockQuote[]> {
  const res = await fetch(`${API_BASE}/market/watchlist`);
  if (!res.ok) throw new Error('Failed to fetch watchlist');
  return res.json();
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  const res = await fetch(`${API_BASE}/market/quote/${encodeURIComponent(symbol)}`);
  if (!res.ok) throw new Error(`Failed to fetch quote for ${symbol}`);
  return res.json();
}

export async function getChartCandles(symbol: string, timeframe: string = '5m'): Promise<CandleData[]> {
  const res = await fetch(`${API_BASE}/market/chart/${encodeURIComponent(symbol)}?timeframe=${timeframe}`);
  if (!res.ok) throw new Error(`Failed to fetch chart candles for ${symbol}`);
  return res.json();
}

export async function searchSymbols(query: string): Promise<StockQuote[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search symbols');
  return res.json();
}

export async function addSymbolToWatchlist(symbol: string): Promise<StockQuote> {
  const res = await fetch(`${API_BASE}/market/add-symbol`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Failed to add ${symbol}` }));
    throw new Error(err.detail || `Failed to add ${symbol}`);
  }
  return res.json();
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetch(`${API_BASE}/portfolio`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch portfolio summary');
  return res.json();
}

export async function resetPortfolio(): Promise<{ status: string; message: string; portfolio: any }> {
  const res = await fetch(`${API_BASE}/portfolio/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to reset portfolio');
  return res.json();
}

export async function getPositions(): Promise<Position[]> {
  const res = await fetch(`${API_BASE}/portfolio/positions`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json();
}

export async function exitPosition(symbol: string, productType: 'CNC' | 'MIS'): Promise<any> {
  const res = await fetch(`${API_BASE}/portfolio/positions/exit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ symbol, product_type: productType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to exit position' }));
    throw new Error(err.detail || 'Failed to exit position');
  }
  return res.json();
}

export async function squareoffAllMis(): Promise<any> {
  const res = await fetch(`${API_BASE}/portfolio/positions/squareoff-all-mis`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to square off MIS positions');
  return res.json();
}

export async function getOrders(status?: string): Promise<Order[]> {
  const url = status ? `${API_BASE}/orders?status=${status}` : `${API_BASE}/orders`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to place order');
  }
  return data;
}

export async function cancelOrder(orderId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to cancel order' }));
    throw new Error(err.detail || 'Failed to cancel order');
  }
  return res.json();
}

export async function getTrades(): Promise<Trade[]> {
  const res = await fetch(`${API_BASE}/portfolio/trades`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch trades');
  return res.json();
}

export async function estimateSingleLeg(payload: {
  symbol: string;
  side: 'BUY' | 'SELL';
  product_type: 'CNC' | 'MIS';
  quantity: number;
  price: number;
}): Promise<ChargeBreakdown> {
  const res = await fetch(`${API_BASE}/charges/estimate-single`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to estimate charges');
  return res.json();
}

export async function estimateRoundtrip(payload: {
  symbol: string;
  product_type: 'CNC' | 'MIS';
  quantity: number;
  buy_price: number;
  sell_price: number;
}): Promise<RoundtripEstimate> {
  const res = await fetch(`${API_BASE}/charges/estimate-roundtrip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to estimate roundtrip charges');
  return res.json();
}
