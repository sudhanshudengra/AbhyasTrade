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
    
    # Test SL_M Order Trigger Matching
    print("=== 3. Testing SL_M (Stoploss Market) Trigger Logic ===")
    market_feed.market_cache["TCS"] = {"symbol": "TCS", "ltp": 4200.0}
    # Place SL_M Sell order with trigger_price = 4100 (current TCS price is 4200)
    sl_order = await order_matcher.place_order(
        user_id="00000000-0000-0000-0000-000000000001",
        symbol="TCS",
        side="SELL",
        product_type="MIS",
        order_type="SL_M",
        quantity=25,
        trigger_price=4100.0
    )
    print("SL_M Order initially placed (LTP=4200, Trigger=4100):", sl_order)
    assert sl_order["status"] == "PENDING", "SL order above trigger should remain PENDING"
    assert sl_order["trigger_price"] == 4100.0

    # Simulate price drop to 4095.0 (breaching trigger)
    triggered_res = await order_matcher.check_order_trigger(sl_order, 4095.0)
    print("SL_M Order after price drop below trigger (LTP=4095):", triggered_res)
    assert triggered_res["status"] == "EXECUTED", "SL order must execute once price breaches trigger"
    assert triggered_res["execution_price"] == 4095.0

    print("=== 4. Testing User Scenario: Buy RELIANCE @ 1304 with Stoploss @ 1300 ===")
    market_feed.market_cache["RELIANCE"] = {"symbol": "RELIANCE", "ltp": 1304.0}
    # User buys RELIANCE with SL-M trigger @ 1300
    buy_sl_order = await order_matcher.place_order(
        user_id="00000000-0000-0000-0000-000000000001",
        symbol="RELIANCE",
        side="BUY",
        product_type="CNC",
        order_type="SL_M",
        quantity=10,
        trigger_price=1300.0
    )
    print("Buy with Stoploss result:", buy_sl_order)
    assert buy_sl_order["status"] == "EXECUTED", "Entry BUY order must execute at market LTP"
    assert buy_sl_order["execution_price"] == 1304.0

    # Verify RELIANCE position is opened
    pos_reliance = await DatabaseService.get_position("00000000-0000-0000-0000-000000000001", "RELIANCE", "CNC")
    print("RELIANCE Position:", pos_reliance)
    assert pos_reliance is not None and pos_reliance["quantity"] == 10
    assert pos_reliance["average_price"] == 1304.0

    # Verify protective exit SELL SL_M order exists in PENDING state
    pending_orders = await DatabaseService.get_pending_orders()
    reliance_sl = next((o for o in pending_orders if o["symbol"] == "RELIANCE" and o["side"] == "SELL" and o["order_type"] == "SL_M"), None)
    print("Protective SELL SL_M Order:", reliance_sl)
    assert reliance_sl is not None, "A protective SELL SL_M order must be created in PENDING state"
    assert reliance_sl["trigger_price"] == 1300.0
    assert reliance_sl["quantity"] == 10

    # Simulate price drop to 1300.0
    market_feed.market_cache["RELIANCE"]["ltp"] = 1300.0
    sl_exec = await order_matcher.check_order_trigger(reliance_sl, 1300.0)
    print("Executed Stoploss Order:", sl_exec)
    assert sl_exec["status"] == "EXECUTED", "Protective SL order must execute when price drops to 1300"
    assert sl_exec["execution_price"] == 1300.0

    # Verify position is now closed (quantity = 0)
    pos_closed = await DatabaseService.get_position("00000000-0000-0000-0000-000000000001", "RELIANCE", "CNC")
    print("RELIANCE Position after Stoploss trigger:", pos_closed)
    assert pos_closed["quantity"] == 0, "Position must be 0 after stoploss triggers"

    print(" Buy with Stoploss Trigger PASSED!\n")
    print("ALL BACKEND TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_tests())
