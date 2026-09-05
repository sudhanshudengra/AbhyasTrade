from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional
from app.core.config import settings
from app.core.database import DatabaseService
from app.services.nse_feed import market_feed
from app.services.order_matcher import order_matcher
from app.services.squareoff import auto_squareoff_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio & Positions"])

class ExitPositionRequest(BaseModel):
    symbol: str
    product_type: Literal["CNC", "MIS"]

@router.get("")
async def get_portfolio_summary(
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Returns complete portfolio summary, margins, equity, and live aggregated PnL for the specific user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    portfolio = await DatabaseService.get_portfolio(user_id)
    positions = await DatabaseService.get_positions(user_id)
    trades = await DatabaseService.get_trades(user_id)
    
    virtual_cash = float(portfolio.get("virtual_cash", settings.VIRTUAL_INITIAL_CASH))
    used_margin = float(portfolio.get("used_margin", 0.0))
    available_margin = max(0.0, round(virtual_cash - used_margin, 2))
    
    total_unrealized_pnl = 0.0
    total_realized_pnl = 0.0
    current_portfolio_value = 0.0
    
    for pos in positions:
        qty = int(pos["quantity"])
        avg_price = float(pos["average_price"])
        realized = float(pos.get("realized_pnl", 0.0))
        total_realized_pnl += realized
        
        if qty != 0:
            sym = pos["symbol"]
            cached_tick = market_feed.market_cache.get(sym)
            ltp = cached_tick["ltp"] if cached_tick else avg_price
            
            if qty > 0:
                unrealized = qty * (ltp - avg_price)
            else:
                unrealized = abs(qty) * (avg_price - ltp)
                
            total_unrealized_pnl += unrealized
            current_portfolio_value += abs(qty) * ltp

    total_unrealized_pnl = round(total_unrealized_pnl, 2)
    total_realized_pnl = round(total_realized_pnl, 2)
    total_equity = round(virtual_cash + total_unrealized_pnl, 2)
    
    total_charges_paid = round(sum(float(t.get("total_charges", 0.0)) for t in trades), 2)
    day_pnl_percent = round((total_unrealized_pnl / settings.VIRTUAL_INITIAL_CASH) * 100, 2)
    
    return {
        "user_id": user_id,
        "initial_capital": settings.VIRTUAL_INITIAL_CASH,
        "virtual_cash": virtual_cash,
        "used_margin": used_margin,
        "available_margin": available_margin,
        "total_equity": total_equity,
        "total_unrealized_pnl": total_unrealized_pnl,
        "total_realized_pnl": total_realized_pnl,
        "total_charges_paid": total_charges_paid,
        "current_portfolio_value": round(current_portfolio_value, 2),
        "day_pnl_percent": day_pnl_percent,
        "open_positions_count": len([p for p in positions if p["quantity"] != 0]),
        "total_trades_count": len(trades)
    }

@router.post("/reset")
async def reset_portfolio(
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Reset user virtual cash balance to ₹10,00,000 and wipe all their trades/orders/positions"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    portfolio = await DatabaseService.reset_portfolio(
        user_id=user_id,
        initial_cash=settings.VIRTUAL_INITIAL_CASH
    )
    return {"status": "SUCCESS", "message": "Portfolio reset to ₹10,00,000 baseline", "portfolio": portfolio}

@router.get("/positions")
async def get_positions(
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> List[Dict[str, Any]]:
    """Returns positions list for the specific user enriched with real-time LTP and floating PnL"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    positions = await DatabaseService.get_positions(user_id)
    enriched_positions = []
    
    for pos in positions:
        qty = int(pos["quantity"])
        avg_price = float(pos["average_price"])
        sym = pos["symbol"]
        cached_tick = market_feed.market_cache.get(sym)
        ltp = cached_tick["ltp"] if cached_tick else avg_price
        
        unrealized_pnl = 0.0
        pnl_percent = 0.0
        if qty != 0:
            if qty > 0:
                unrealized_pnl = round(qty * (ltp - avg_price), 2)
                pnl_percent = round(((ltp - avg_price) / avg_price) * 100, 2) if avg_price > 0 else 0.0
            else:
                unrealized_pnl = round(abs(qty) * (avg_price - ltp), 2)
                pnl_percent = round(((avg_price - ltp) / avg_price) * 100, 2) if avg_price > 0 else 0.0
                
        enriched_positions.append({
            **pos,
            "ltp": ltp,
            "current_value": round(abs(qty) * ltp, 2),
            "unrealized_pnl": unrealized_pnl,
            "pnl_percent": pnl_percent,
            "is_open": qty != 0
        })
        
    return enriched_positions

@router.post("/positions/exit")
async def exit_position(
    req: ExitPositionRequest,
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Exit an open position immediately at current market LTP for user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    pos = await DatabaseService.get_position(user_id, req.symbol, req.product_type)
    if not pos or pos["quantity"] == 0:
        raise HTTPException(status_code=400, detail="No open position found for this symbol & product type")
        
    qty = abs(int(pos["quantity"]))
    side = "SELL" if pos["quantity"] > 0 else "BUY"
    
    order_res = await order_matcher.place_order(
        user_id=user_id,
        symbol=req.symbol,
        side=side,
        product_type=req.product_type,
        order_type="MARKET",
        quantity=qty
    )
    return {"status": "SUCCESS", "message": f"Exited {req.symbol} position", "order": order_res}

@router.post("/positions/squareoff-all-mis")
async def squareoff_all_mis(
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Square off all active intraday MIS positions at market LTP for user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    results = await auto_squareoff_service.squareoff_all_mis_positions(user_id)
    return {"status": "SUCCESS", "closed_positions_count": len(results), "orders": results}

@router.get("/trades")
async def get_trades(
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> List[Dict[str, Any]]:
    """Returns trade execution history log for user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    return await DatabaseService.get_trades(user_id)
