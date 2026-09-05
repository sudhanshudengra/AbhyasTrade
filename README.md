# AbhyasTrade – Real-Time Virtual Trading PWA (NSE)

AbhyasTrade is a production-grade, zero-cost virtual trading Progressive Web App (PWA) tailored to the Indian Equity Market (NSE). It replicates real broker terminals (Zerodha Kite & Groww) with 100% deterministic regulatory charges, real-time market data ticks, TradingView charts, and responsive desktop/mobile interfaces.

---

## Architecture Overview

```text
abhyastrade/
├── backend/
│   ├── app/
│   │   ├── core/         # config.py, charges.py, database.py
│   │   ├── services/     # nse_feed.py (curl_cffi scraper), order_matcher.py, squareoff.py
│   │   ├── api/          # market.py, orders.py, portfolio.py, charges.py, ws.py
│   │   └── main.py       # FastAPI lifecycle & background workers
│   ├── supabase_schema.sql # Complete Supabase PostgreSQL DDL migration
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # Watchlist, TradingChart, OrderModal, PositionsDesk, OrderBook, etc.
│   │   ├── hooks/        # useMarketData (WS), usePortfolio (REST & Live PnL)
│   │   ├── lib/          # api.ts, types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts    # Configured with VitePWA & Proxy
│   └── tailwind.config.js # Obsidian dark fintech design system
└── README.md
```

---

## 1. Key Features

- **Live Market Feed & Scraper**:
  - `curl_cffi` session with Chrome 124 TLS/Akamai impersonation for live NSE quotes.
  - 24/7 realistic micro-tick engine for testing during off-market hours and weekends.
  - Historical candlestick data via `yfinance` for `1m`, `5m`, `15m`, `1h`, `1D` timeframes.
- **Zerodha-Style Order Desk**:
  - `Intraday MIS` (5x leverage / 20% margin) with short-selling support.
  - `Longterm CNC` (100% upfront cash) with delivery short-selling restrictions.
  - Order types: `MARKET`, `LIMIT`, and `SL_M` (Stop-Loss Market).
  - Quick quantity adders (`+25`, `+50`, `+100`) and margin % allocation chips (`10%`, `25%`, `50%`, `100%`).
- **100% Accurate Indian Regulatory Charges Engine (`charges.py`)**:
  - **Brokerage**: MIS (`min(0.03%, ₹20)` per executed leg), CNC (`₹0` Zerodha model).
  - **STT/CTT**: MIS (`0.025%` on sell side), CNC (`0.1%` on both buy & sell).
  - **Exchange Turnover**: `0.00297%` on both sides.
  - **SEBI Charges**: `₹10 / crore` (`0.0001%`).
  - **Stamp Duty**: MIS (`0.003%` on buy side), CNC (`0.015%` on buy side).
  - **GST**: `18%` strictly on `(Brokerage + Exchange Turnover + SEBI Charges)`.
  - Itemized live tax breakdown and exact breakeven points per share.
- **Automated 3:15 PM IST MIS Auto-Squareoff**:
  - Scheduled background worker automatically squares off all active intraday MIS positions at market LTP.
- **TradingView Lightweight Charts**:
  - Real-time candlestick series with volume histogram and live tick aggregation on the active candle wick/body without canvas reloads.
- **Storage & Database Persistence**:
  - Full Supabase PostgreSQL schema with RLS policies, indexes, and tables (`portfolios`, `positions`, `orders`, `trades`).
  - Automatic async SQLite fallback (`backend/abhyastrade.db`) if Supabase keys are not set, allowing the app to run instantly out-of-the-box.
- **Progressive Web App (PWA)**:
  - Configured with `vite-plugin-pwa`, standalone app shell, dark theme status bar (`#0b0e14`), and native mobile bottom navigation.

---

## 2. Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup
1. Open a terminal in the root directory:
   ```bash
   # Activate virtual environment
   backend/venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
   ```
2. The FastAPI backend will be available at `http://localhost:8000`.
3. Interactive API documentation is available at `http://localhost:8000/docs`.

### Frontend Setup
1. In another terminal:
   ```bash
   cd frontend
   npm run dev
   ```
2. The frontend PWA will launch at `http://localhost:5173`.

---

## 3. Supabase Configuration (Optional)

To connect AbhyasTrade to your own Supabase project:
1. Create a project in [Supabase](https://supabase.com).
2. Open the SQL Editor in Supabase and paste the contents of `backend/supabase_schema.sql`.
3. Add your Supabase credentials in `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-or-service-role-key
   ```
4. Restart the backend service. It will automatically route all portfolio, order, and trade queries through Supabase PostgreSQL!
