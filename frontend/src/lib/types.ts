export interface StockQuote {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  pChange: number;
  volume: number;
  high52: number;
  low52: number;
  tick_direction: 'UP' | 'DOWN' | 'NONE';
  last_updated: string;
}

export interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type ProductType = 'CNC' | 'MIS';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL_M';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED';

export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  product_type: ProductType;
  order_type: OrderType;
  quantity: number;
  price: number | null;
  trigger_price: number | null;
  status: OrderStatus;
  execution_price: number | null;
  brokerage_fees: number;
  regulatory_charges: number;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  product_type: ProductType;
  quantity: number;
  average_price: number;
  realized_pnl: number;
  ltp: number;
  current_value: number;
  unrealized_pnl: number;
  pnl_percent: number;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  order_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  product_type: ProductType;
  quantity: number;
  price: number;
  turnover: number;
  total_charges: number;
  executed_at: string;
}

export interface PortfolioSummary {
  user_id: string;
  initial_capital: number;
  virtual_cash: number;
  used_margin: number;
  available_margin: number;
  total_equity: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_charges_paid: number;
  current_portfolio_value: number;
  day_pnl_percent: number;
  open_positions_count: number;
  total_trades_count: number;
}

export interface ChargeBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchange_charges: number;
  sebi_charges: number;
  stamp_duty: number;
  gst: number;
  total_charges: number;
  breakeven_pnl: number;
}

export interface RoundtripEstimate {
  buy_turnover: number;
  sell_turnover: number;
  total_turnover: number;
  brokerage: number;
  stt: number;
  exchange_charges: number;
  sebi_charges: number;
  stamp_duty: number;
  gst: number;
  total_charges: number;
  breakeven_points: number;
  net_pnl: number;
  gross_pnl: number;
}

export interface PlaceOrderPayload {
  symbol: string;
  side: OrderSide;
  product_type: ProductType;
  order_type: OrderType;
  quantity: number;
  price?: number | null;
  trigger_price?: number | null;
}
