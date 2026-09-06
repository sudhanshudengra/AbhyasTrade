from pydantic import BaseModel
from typing import Literal

class ChargeBreakdown(BaseModel):
    turnover: float
    brokerage: float
    stt: float
    exchange_charges: float
    sebi_charges: float
    stamp_duty: float
    gst: float
    total_charges: float
    breakeven_pnl: float  # Points needed per share to cover all charges

class RoundtripChargeEstimate(BaseModel):
    buy_turnover: float
    sell_turnover: float
    total_turnover: float
    brokerage: float
    stt: float
    exchange_charges: float
    sebi_charges: float
    stamp_duty: float
    gst: float
    total_charges: float
    breakeven_points: float
    net_pnl: float
    gross_pnl: float

def calculate_single_leg_charges(
    symbol: str,
    side: Literal["BUY", "SELL"],
    product_type: Literal["CNC", "MIS"],
    quantity: int,
    price: float
) -> ChargeBreakdown:
    """
    Calculate deterministic regulatory & brokerage charges for a single execution leg in Indian Equity (NSE).
    All outputs rounded to 2 decimal places except precise breakeven points.
    """
    turnover = round(quantity * price, 4)
    
    # 1. Brokerage
    if product_type == "MIS":
        # 0.03% or Rs. 20 per executed order, whichever is lower
        brokerage = min(0.0003 * turnover, 20.0)
    else:  # CNC
        # 0 brokerage for delivery (standard discount broker model)
        brokerage = 0.0
    
    # 2. STT / CTT (Securities Transaction Tax)
    if product_type == "MIS":
        # 0.025% on Sell side only for Intraday
        stt = 0.00025 * turnover if side == "SELL" else 0.0
    else:  # CNC
        # 0.1% on both Buy and Sell side for Equity Delivery
        stt = 0.001 * turnover
    
    # 3. Exchange Turnover Charge (NSE: 0.00297%)
    exchange_charges = 0.0000297 * turnover
    
    # 4. SEBI Charges (Rs 10 per crore = 0.0001%)
    sebi_charges = 0.000001 * turnover
    
    # 5. Stamp Duty (State Stamp Duty - Buy side only)
    if side == "BUY":
        if product_type == "MIS":
            # 0.003% or Rs 300 / crore on buy side
            stamp_duty = 0.00003 * turnover
        else:  # CNC
            # 0.015% or Rs 1500 / crore on buy side
            stamp_duty = 0.00015 * turnover
    else:
        stamp_duty = 0.0
    
    # 6. GST (18% on Brokerage + Exchange Turnover Charges + SEBI Charges)
    gst = 0.18 * (brokerage + exchange_charges + sebi_charges)
    
    # 7. Total Charges
    total_charges = round(brokerage + stt + exchange_charges + sebi_charges + stamp_duty + gst, 2)
    
    # Breakeven points per share
    breakeven_pnl = round(total_charges / quantity, 2) if quantity > 0 else 0.0
    
    return ChargeBreakdown(
        turnover=round(turnover, 2),
        brokerage=round(brokerage, 2),
        stt=round(stt, 2),
        exchange_charges=round(exchange_charges, 2),
        sebi_charges=round(sebi_charges, 2),
        stamp_duty=round(stamp_duty, 2),
        gst=round(gst, 2),
        total_charges=total_charges,
        breakeven_pnl=breakeven_pnl
    )

def calculate_roundtrip_charges(
    symbol: str,
    product_type: Literal["CNC", "MIS"],
    quantity: int,
    buy_price: float,
    sell_price: float
) -> RoundtripChargeEstimate:
    """
    Calculate full roundtrip charges (Buy + Sell) and net PnL breakdown.
    """
    buy_leg = calculate_single_leg_charges(symbol, "BUY", product_type, quantity, buy_price)
    sell_leg = calculate_single_leg_charges(symbol, "SELL", product_type, quantity, sell_price)
    
    total_turnover = round(buy_leg.turnover + sell_leg.turnover, 2)
    total_brokerage = round(buy_leg.brokerage + sell_leg.brokerage, 2)
    total_stt = round(buy_leg.stt + sell_leg.stt, 2)
    total_exchange = round(buy_leg.exchange_charges + sell_leg.exchange_charges, 2)
    total_sebi = round(buy_leg.sebi_charges + sell_leg.sebi_charges, 2)
    total_stamp = round(buy_leg.stamp_duty + sell_leg.stamp_duty, 2)
    total_gst = round(buy_leg.gst + sell_leg.gst, 2)
    total_charges = round(buy_leg.total_charges + sell_leg.total_charges, 2)
    
    gross_pnl = round((sell_price - buy_price) * quantity, 2)
    net_pnl = round(gross_pnl - total_charges, 2)
    breakeven_points = round(total_charges / quantity, 2) if quantity > 0 else 0.0
    
    return RoundtripChargeEstimate(
        buy_turnover=buy_leg.turnover,
        sell_turnover=sell_leg.turnover,
        total_turnover=total_turnover,
        brokerage=total_brokerage,
        stt=total_stt,
        exchange_charges=total_exchange,
        sebi_charges=total_sebi,
        stamp_duty=total_stamp,
        gst=total_gst,
        total_charges=total_charges,
        breakeven_points=breakeven_points,
        net_pnl=net_pnl,
        gross_pnl=gross_pnl
    )
