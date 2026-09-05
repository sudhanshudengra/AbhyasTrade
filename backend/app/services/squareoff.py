import asyncio
import logging
from datetime import datetime, timezone
import zoneinfo
from app.core.config import settings
from app.core.database import DatabaseService
from app.services.order_matcher import order_matcher

logger = logging.getLogger("abhyastrade.squareoff")

class AutoSquareoffService:
    def __init__(self):
        self.is_running = False
        self.has_squared_off_today = False
        self.last_checked_date = None

    async def squareoff_all_mis_positions(self, user_id: str = settings.DEFAULT_USER_ID) -> list:
        """Closes all open MIS positions at current market price"""
        positions = await DatabaseService.get_positions(user_id)
        results = []
        
        for pos in positions:
            if pos["product_type"] == "MIS" and pos["quantity"] != 0:
                symbol = pos["symbol"]
                qty = abs(pos["quantity"])
                side = "SELL" if pos["quantity"] > 0 else "BUY"
                
                logger.info(f"Auto-squaring off MIS position: {side} {qty} {symbol}")
                try:
                    order_res = await order_matcher.place_order(
                        user_id=user_id,
                        symbol=symbol,
                        side=side,
                        product_type="MIS",
                        order_type="MARKET",
                        quantity=qty
                    )
                    results.append(order_res)
                except Exception as e:
                    logger.error(f"Failed to auto-squareoff {symbol}: {e}")
                    
        return results

    async def schedule_loop(self):
        """Background loop monitoring 3:15 PM IST trigger"""
        self.is_running = True
        logger.info("Auto-squareoff scheduled worker started (target: 15:15 IST).")
        
        while self.is_running:
            try:
                # Get current IST time
                try:
                    ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
                    now_ist = datetime.now(ist_tz)
                except Exception:
                    # Fallback UTC + 5:30
                    now_ist = datetime.now(timezone.utc)
                
                today_str = now_ist.strftime("%Y-%m-%d")
                if self.last_checked_date != today_str:
                    self.last_checked_date = today_str
                    self.has_squared_off_today = False

                # Trigger at 15:15 IST (3:15 PM) on weekdays
                if (
                    now_ist.weekday() < 5 and
                    now_ist.hour == 15 and
                    now_ist.minute >= 15 and
                    not self.has_squared_off_today
                ):
                    logger.info("15:15 IST Reached: Triggering daily MIS auto-squareoff...")
                    await self.squareoff_all_mis_positions()
                    self.has_squared_off_today = True
                    
            except Exception as e:
                logger.error(f"Error in auto-squareoff loop: {e}")
                
            await asyncio.sleep(30)

auto_squareoff_service = AutoSquareoffService()
