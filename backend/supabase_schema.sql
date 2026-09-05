-- ==============================================================================
-- AbhyasTrade: Supabase PostgreSQL Schema Migration
-- Real-Time Virtual Trading Platform for Indian Equity Market (NSE)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Portfolios Table
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    virtual_cash NUMERIC(15, 2) NOT NULL DEFAULT 1000000.00,
    used_margin NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Positions Table
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    symbol VARCHAR(50) NOT NULL,
    product_type VARCHAR(10) NOT NULL CHECK (product_type IN ('CNC', 'MIS')),
    quantity INT NOT NULL DEFAULT 0,
    average_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    realized_pnl NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_symbol_product UNIQUE (user_id, symbol, product_type)
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    product_type VARCHAR(10) NOT NULL CHECK (product_type IN ('CNC', 'MIS')),
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'SL_M')),
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(15, 2),
    trigger_price NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'CANCELLED', 'REJECTED')),
    execution_price NUMERIC(15, 2),
    brokerage_fees NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    regulatory_charges NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trades Table (Execution Audit Log)
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    product_type VARCHAR(10) NOT NULL CHECK (product_type IN ('CNC', 'MIS')),
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(15, 2) NOT NULL,
    turnover NUMERIC(15, 2) NOT NULL,
    total_charges NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_positions_user_symbol ON positions(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_time ON trades(user_id, executed_at DESC);

-- RLS (Row Level Security) Policies for Anonymous & Authenticated access
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to portfolios" ON portfolios;
CREATE POLICY "Allow all access to portfolios" ON portfolios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to positions" ON positions;
CREATE POLICY "Allow all access to positions" ON positions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to orders" ON orders;
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to trades" ON trades;
CREATE POLICY "Allow all access to trades" ON trades FOR ALL USING (true) WITH CHECK (true);

-- Default Demo Portfolio Seed
INSERT INTO portfolios (user_id, virtual_cash, used_margin)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 1000000.00, 0.00)
ON CONFLICT (user_id) DO NOTHING;
