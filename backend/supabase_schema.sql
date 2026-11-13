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
    custom_ai_limit INT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for existing portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS custom_ai_limit INT DEFAULT NULL;

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

-- 5. Auto-Initialize Portfolio Trigger for New Supabase Auth Users
-- Automatically grants ₹10,00,000 virtual cash on signup (Google OAuth, Email, etc.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.portfolios (user_id, virtual_cash, used_margin, created_at, updated_at)
    VALUES (NEW.id, 1000000.00, 0.00, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger cleanly on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Default Demo Portfolio Seed
INSERT INTO portfolios (user_id, virtual_cash, used_margin)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 1000000.00, 0.00)
ON CONFLICT (user_id) DO NOTHING;

-- ==============================================================================
-- 6. AI Integration: Shared Analysis Cache & Usage Tracking
-- ==============================================================================

-- 6.1 Shared AI Analysis Cache Table
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    symbol VARCHAR(50),
    exchange VARCHAR(20) DEFAULT 'NSE',
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    result JSONB NOT NULL,
    input_data_hash VARCHAR(64) NOT NULL,
    data_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_analysis_cache(symbol, analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_analysis_cache(expires_at);

-- 6.2 AI Usage Logs Table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    feature VARCHAR(50) NOT NULL,
    symbol VARCHAR(50),
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    tokens_input INT,
    tokens_output INT,
    cached BOOLEAN NOT NULL DEFAULT FALSE,
    error_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_logs(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_symbol ON ai_usage_logs(user_id, symbol, created_at DESC);

-- RLS Policies for AI Tables
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to ai_analysis_cache" ON ai_analysis_cache;
CREATE POLICY "Allow all access to ai_analysis_cache" ON ai_analysis_cache FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_usage_logs" ON ai_usage_logs;
CREATE POLICY "Allow all access to ai_usage_logs" ON ai_usage_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. Gamification & Quiz Tracking (XP, Level, Quiz Logs)
-- ==============================================================================

-- 7.1 Trader XP & Level Progression in portfolios
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS trader_xp INT DEFAULT 0;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS trader_level INT DEFAULT 1;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS custom_ai_limit INT DEFAULT NULL;

-- 7.2 AI Quiz Usage & Score Logs
CREATE TABLE IF NOT EXISTS ai_quiz_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    topic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(30) NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL DEFAULT 3,
    xp_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_quiz_logs_user_time ON ai_quiz_logs(user_id, created_at DESC);

-- RLS for ai_quiz_logs
ALTER TABLE ai_quiz_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to ai_quiz_logs" ON ai_quiz_logs;
CREATE POLICY "Allow all access to ai_quiz_logs" ON ai_quiz_logs FOR ALL USING (true) WITH CHECK (true);



