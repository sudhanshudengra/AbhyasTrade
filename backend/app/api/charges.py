from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal
from app.core.charges import calculate_single_leg_charges, calculate_roundtrip_charges, ChargeBreakdown, RoundtripChargeEstimate

router = APIRouter(prefix="/charges", tags=["Brokerage & Taxes"])

class SingleLegEstimateRequest(BaseModel):
    symbol: str
    side: Literal["BUY", "SELL"]
    product_type: Literal["CNC", "MIS"]
    quantity: int = Field(gt=0)
    price: float = Field(gt=0)

class RoundtripEstimateRequest(BaseModel):
    symbol: str
    product_type: Literal["CNC", "MIS"]
    quantity: int = Field(gt=0)
    buy_price: float = Field(gt=0)
    sell_price: float = Field(gt=0)

@router.post("/estimate-single", response_model=ChargeBreakdown)
async def estimate_single_leg(req: SingleLegEstimateRequest):
    """Estimate taxes and brokerage for a single order leg before placing"""
    return calculate_single_leg_charges(
        symbol=req.symbol,
        side=req.side,
        product_type=req.product_type,
        quantity=req.quantity,
        price=req.price
    )

@router.post("/estimate-roundtrip", response_model=RoundtripChargeEstimate)
async def estimate_roundtrip(req: RoundtripEstimateRequest):
    """Estimate complete round-trip trade charges, net PnL, and breakeven point"""
    return calculate_roundtrip_charges(
        symbol=req.symbol,
        product_type=req.product_type,
        quantity=req.quantity,
        buy_price=req.buy_price,
        sell_price=req.sell_price
    )
