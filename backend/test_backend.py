import asyncio
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath("backend"))

from app.core.charges import calculate_single_leg_charges, calculate_roundtrip_charges
from app.core.database import init_db, DatabaseService
from app.services.order_matcher import order_matcher
from app.services.nse_feed import market_feed

async def run_tests():
    print("=== 1. Testing Charges Calculation ===")
    # Test MIS Buy leg: 100 shares of RELIANCE @ 3000
    # Turnover = 300,000
    # Brokerage = min(0.0003 * 300000, 20) = min(90, 20) = 20.0
    # STT = 0 (Buy side MIS)
    # Exchange = 0.0000297 * 300000 = 8.91
    # SEBI = 0.000001 * 300000 = 0.30
    # Stamp = 0.00003 * 300000 = 9.00
    # GST = 18% of (20 + 8.91 + 0.30) = 18% of 29.21 = 5.26
    # Total = 20 + 0 + 8.91 + 0.30 + 9.00 + 5.26 = 43.47
    mis_buy = calculate_single_leg_charges("RELIANCE", "BUY", "MIS", 100, 3000.0)
    print("MIS BUY (100 @ 3000):", mis_buy.dict())
    assert mis_buy.brokerage == 20.0, f"Expected 20.0, got {mis_buy.brokerage}"
    assert mis_buy.stt == 0.0, f"Expected 0.0, got {mis_buy.stt}"
    assert mis_buy.stamp_duty == 9.0, f"Expected 9.0, got {mis_buy.stamp_duty}"
    assert mis_buy.total_charges > 0, "Total charges should be positive"
    
    # Test CNC Buy leg: 100 shares @ 3000
    cnc_buy = calculate_single_leg_charges("RELIANCE", "BUY", "CNC", 100, 3000.0)
    print("CNC BUY (100 @ 3000):", cnc_buy.dict())
    assert cnc_buy.brokerage == 0.0, f"Expected 0.0, got {cnc_buy.brokerage}"
    assert cnc_buy.stt == 300.0, f"Expected 300.0 (0.1%), got {cnc_buy.stt}"
    
    # Test Roundtrip Estimate
    rt = calculate_roundtrip_charges("RELIANCE", "MIS", 100, 3000.0, 3020.0)
    print("MIS Roundtrip (100 @ 3000 -> 3020):", rt.dict())
    assert rt.gross_pnl == 2000.0
    assert rt.net_pnl == round(2000.0 - rt.total_charges, 2)
    print(" Charges calculation PASSED!\n")

    print("=== 2. Testing Database and Order Execution ===")
    await init_db()
    # Reset portfolio to fresh baseline
    portfolio = await DatabaseService.reset_portfolio()
    print("Reset portfolio:", portfolio)
    assert portfolio["virtual_cash"] == 1000000.0
    assert portfolio["used_margin"] == 0.0

    # Place Market Order: MIS Buy 50 shares of TCS @ 4200
    order_res = await order_matcher.place_order(
        user_id="00000000-0000-0000-0000-000000000001",
        symbol="TCS",
        side="BUY",
        product_type="MIS",
        order_type="MARKET",
        quantity=50
    )
    print("Order execution result:", order_res)
    assert order_res["status"] == "EXECUTED"
    assert order_res["execution_price"] > 0
    
    # Check Position
    positions = await DatabaseService.get_positions()
    print("Open Positions:", positions)
    assert len(positions) == 1
    assert positions[0]["symbol"] == "TCS"
    assert positions[0]["quantity"] == 50

    # Check Trades
    trades = await DatabaseService.get_trades()
    print("Executed Trades:", trades)
    assert len(trades) == 1
    
    # Check Updated Portfolio
    p_updated = await DatabaseService.get_portfolio()
    print("Portfolio after order:", p_updated)
    assert p_updated["used_margin"] > 0
    
    print(" Order Matching & Database test PASSED!\n")
    print("ALL BACKEND TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
