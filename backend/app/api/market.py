from fastapi import APIRouter, HTTPException, Query
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.services.nse_feed import market_feed

router = APIRouter(prefix="/market", tags=["Market Data"])

class AddSymbolRequest(BaseModel):
    symbol: str

@router.get("/watchlist")
async def get_watchlist() -> List[Dict[str, Any]]:
    """Returns all monitored scrips with live LTP, OHLC, 52W Range, and % change"""
    return list(market_feed.market_cache.values())

@router.get("/quote/{symbol}")
async def get_quote(symbol: str) -> Dict[str, Any]:
    """Returns detailed real-time quote for any symbol (fetched dynamically if not in cache)"""
    symbol = symbol.upper().strip()
    quote = await market_feed.get_or_fetch_symbol(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found on NSE exchange")
    return quote

@router.get("/chart/{symbol}")
async def get_chart_candles(
    symbol: str,
    timeframe: str = Query(default="1D")
) -> List[Dict[str, Any]]:
    """Returns candlestick OHLCV series for TradingView Lightweight Charts"""
    symbol = symbol.upper().strip()
    candles = await market_feed.get_historical_candles(symbol, timeframe)
    return candles

@router.get("/search")
async def search_symbols(q: str = Query(default="", min_length=1)) -> List[Dict[str, Any]]:
    """Search stocks by symbol or company name across all 2,500+ NSE listed equities"""
    query = q.strip().upper()
    return market_feed.search_nse_symbols(query, limit=20)

@router.post("/add-symbol")
async def add_symbol(req: AddSymbolRequest) -> Dict[str, Any]:
    """Dynamically adds any NSE equity symbol to the monitored market cache"""
    symbol = req.symbol.upper().strip()
    quote = await market_feed.get_or_fetch_symbol(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Could not find or fetch quote for {symbol} on NSE")
    return quote
