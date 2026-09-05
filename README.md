# AbhyasTrade — NSE Virtual Trading Terminal

> Practice stock trading on India's NSE with ₹10,00,000 virtual money. Real prices. Real charges. No real risk.

AbhyasTrade is a full-stack virtual trading platform that replicates a real Indian broker terminal (think Zerodha Kite or Groww) — complete with live NSE market data, Google Finance-style charts, Zerodha's exact brokerage & regulatory charge calculations, and per-user portfolio tracking via Google Sign-In.

---

## What It Does

- 📈 **Live NSE Market Data** — Real stock prices from NSE/Yahoo Finance. Line & Candlestick charts with `1D`, `5D`, `1M`, `1Y`, `5Y`, `Max` timeframes.
- 🛒 **Place Real-Style Orders** — Market, Limit, and Stop-Loss orders in both Intraday (MIS, 5× leverage) and Delivery (CNC) modes.
- 💸 **Exact Regulatory Charges** — Brokerage, STT, Exchange Turnover, SEBI, Stamp Duty, and GST calculated precisely per order — just like the real thing.
- 🔐 **Google Sign-In** — No passwords. One-click Google OAuth via Supabase. Each user gets their own private portfolio.
- 📊 **Portfolio Dashboard** — Track open positions, P&L (realized + unrealized), order history, and trade analytics.
- ⏰ **Auto Square-Off** — All intraday (MIS) positions auto-close at 3:15 PM IST, just like real brokers.
- 📱 **PWA** — Installable as a native app on mobile and desktop.

---

## How It Works

```
User → Google Sign-In (Supabase OAuth)
     → Selects a stock from the NSE watchlist (search any of 2500+ NSE stocks)
     → Views real-time chart (data from Yahoo Finance / NSE)
     → Places a BUY or SELL order (Market / Limit / SL-M)
     → Backend validates margin, executes the order, and updates portfolio
     → Positions, P&L, and trade history update live via WebSocket
```

The **backend** is a FastAPI Python server that:
- Fetches real NSE prices every few seconds
- Matches and executes orders against live prices
- Calculates exact SEBI-mandated charges on every trade
- Auto-squares off all intraday positions at market close

The **frontend** is a React + Vite PWA that:
- Streams live prices via WebSocket
- Renders interactive line/candlestick charts (TradingView Lightweight Charts)
- Shows a full trading desk: Watchlist, Chart, Order Book, Positions, Analytics

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Clone the repo
```bash
git clone https://github.com/your-username/AbhyasTrade.git
cd AbhyasTrade
```

### 2. Set up the backend
```bash
# Copy the env template and fill in your Supabase credentials
cp .env.example .env
```
Edit `.env` and add your `SUPABASE_URL` and `SUPABASE_KEY`.

Then run the Supabase schema once:
- Open your [Supabase project](https://supabase.com) → SQL Editor → paste contents of `backend/supabase_schema.sql` → Run.

### 3. Start the backend
```bash
npm run dev:backend
```
Runs at → **http://127.0.0.1:8000** | API docs at → **http://127.0.0.1:8000/docs**

### 4. Start the frontend
```bash
npm run dev:frontend
```
Runs at → **http://localhost:5173**

> Or run both at once with `npm run dev` from the project root.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Market Data | Yahoo Finance (`yfinance`), NSE live scraper |
| Auth | Supabase Google OAuth |
| Database | Supabase PostgreSQL |
| PWA | vite-plugin-pwa |

---

## Supabase + Google OAuth Setup

1. Create a project on [supabase.com](https://supabase.com)
2. Run `backend/supabase_schema.sql` in the SQL Editor
3. In Supabase → **Authentication → Providers → Google** — enable Google and paste your Google Cloud OAuth credentials
4. Add your Supabase URL and anon key to `.env`

See full OAuth setup guide in the project wiki / comments in `frontend/src/lib/supabase.ts`.

---

## License

MIT — free to use, learn from, and build on.
