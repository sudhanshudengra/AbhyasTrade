from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Literal
from app.core.config import settings
from app.core.database import DatabaseService
from app.services.order_matcher import order_matcher

router = APIRouter(prefix="/orders", tags=["Orders"])

class PlaceOrderRequest(BaseModel):
    symbol: str
    side: Literal["BUY", "SELL"]
    product_type: Literal["CNC", "MIS"]
    order_type: Literal["MARKET", "LIMIT", "SL_M"]
    quantity: int = Field(gt=0, description="Quantity of shares to buy or sell")
    price: Optional[float] = Field(default=None, description="Limit price if LIMIT order")
    trigger_price: Optional[float] = Field(default=None, description="Trigger price if SL_M order")
    stoploss_trigger: Optional[float] = Field(default=None, description="Optional attached stoploss trigger price")

@router.post("")
async def place_order(
    order_req: PlaceOrderRequest,
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Place a new virtual market/limit/SL-M order for the authenticated user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    try:
        result = await order_matcher.place_order(
            user_id=user_id,
            symbol=order_req.symbol,
            side=order_req.side,
            product_type=order_req.product_type,
            order_type=order_req.order_type,
            quantity=order_req.quantity,
            price=order_req.price,
            trigger_price=order_req.trigger_price,
            stoploss_trigger=order_req.stoploss_trigger
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("")
async def get_orders(
    status: Optional[str] = Query(default=None, pattern="^(PENDING|EXECUTED|CANCELLED|REJECTED)$"),
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> List[Dict[str, Any]]:
    """Get all orders for the specific user, optionally filtered by status"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    return await DatabaseService.get_orders(user_id=user_id, status=status)

@router.delete("/{order_id}")
async def cancel_order(
    order_id: str,
    x_user_id: Optional[str] = Header(default=settings.DEFAULT_USER_ID, alias="X-User-Id")
) -> Dict[str, Any]:
    """Cancel a pending limit or SL-M order for the specific user"""
    user_id = x_user_id or settings.DEFAULT_USER_ID
    orders = await DatabaseService.get_orders(user_id=user_id)
    order = next((o for o in orders if o["id"] == order_id), None)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order["status"] != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot cancel order with status {order['status']}")
        
    updated = await DatabaseService.update_order(order_id, {"status": "CANCELLED"})
    return {"status": "SUCCESS", "message": "Order cancelled successfully", "order": updated}
