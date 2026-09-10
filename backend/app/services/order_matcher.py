import logging
import uuid
from typing import Any, Dict, List, Optional
from app.core.charges import calculate_single_leg_charges
from app.core.database import DatabaseService
from app.services.nse_feed import market_feed

logger = logging.getLogger("abhyastrade.order_matcher")

class OrderMatcherService:
    @staticmethod
    def calculate_required_margin(
        product_type: str,
        quantity: int,
        price: float
    ) -> float:
        """
        Calculate upfront required margin for order placement:
        - CNC: 100% upfront (price * quantity)
        - MIS: 5x leverage -> 20% margin ((price * quantity) / 5)
        """
        turnover = quantity * price
        if product_type == "CNC":
            return round(turnover, 2)
        elif product_type == "MIS":
            return round(turnover / 5.0, 2)
        return round(turnover, 2)

    @staticmethod
    async def place_order(
        user_id: str,
        symbol: str,
        side: str,
        product_type: str,
        order_type: str,
        quantity: int,
        price: Optional[float] = None,
        trigger_price: Optional[float] = None,
        stoploss_trigger: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Validates margin, checks CNC constraints, and places order.
        If MARKET, executes immediately.
        If entry order with attached stoploss (or SL_M with downside trigger),
        executes the entry and automatically places the protective exit SL_M order.
        """
        symbol = symbol.upper()
        current_tick = market_feed.market_cache.get(symbol)
        ltp = current_tick["ltp"] if current_tick else (price or 100.0)
        
        attached_sl = stoploss_trigger

        existing_pos = await DatabaseService.get_position(user_id, symbol, product_type)
        current_holding_qty = int(existing_pos["quantity"]) if existing_pos else 0

        # When BUYing with SL_M and trigger_price < ltp: entry is market buy + protective sell SL
        if order_type == "SL_M" and side == "BUY" and trigger_price is not None and trigger_price < ltp:
            attached_sl = trigger_price
            order_type = "MARKET"
            trigger_price = None

        # When short SELLING (MIS) with SL_M and trigger_price > ltp: entry is market short + protective buy SL
        elif order_type == "SL_M" and side == "SELL" and trigger_price is not None and trigger_price > ltp and current_holding_qty <= 0:
            attached_sl = trigger_price
            order_type = "MARKET"
            trigger_price = None

        # Determine reference price for margin calculation
        ref_price = price if (order_type == "LIMIT" and price and price > 0) else ltp
        required_margin = OrderMatcherService.calculate_required_margin(product_type, quantity, ref_price)
        
        portfolio = await DatabaseService.get_portfolio(user_id)
        virtual_cash = float(portfolio["virtual_cash"])
        used_margin = float(portfolio["used_margin"])
        available_margin = virtual_cash - used_margin
        
        # Check CNC Short Selling constraint (only for standard sell when no short cover)
        if product_type == "CNC" and side == "SELL" and attached_sl is None:
            if current_holding_qty < quantity:
                order_doc = {
                    "user_id": user_id,
                    "symbol": symbol,
                    "side": side,
                    "product_type": product_type,
                    "order_type": order_type,
                    "quantity": quantity,
                    "price": price,
                    "trigger_price": trigger_price,
                    "status": "REJECTED",
                    "rejection_reason": f"CNC Short selling is not permitted. Holding: {current_holding_qty} shares."
                }
                return await DatabaseService.create_order(order_doc)
        
        # Check Margin constraint for opening new exposure
        is_closing = False
        if current_holding_qty != 0:
            if (side == "SELL" and current_holding_qty > 0) or (side == "BUY" and current_holding_qty < 0):
                is_closing = True
        
        if not is_closing and available_margin < required_margin:
            order_doc = {
                "user_id": user_id,
                "symbol": symbol,
                "side": side,
                "product_type": product_type,
                "order_type": order_type,
                "quantity": quantity,
                "price": price,
                "trigger_price": trigger_price,
                "status": "REJECTED",
                "rejection_reason": f"Insufficient margin. Required: ₹{required_margin:,.2f}, Available: ₹{available_margin:,.2f}"
            }
            return await DatabaseService.create_order(order_doc)
            
        # Create order in pending state
        order_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "symbol": symbol,
            "side": side,
            "product_type": product_type,
            "order_type": order_type,
            "quantity": quantity,
            "price": price,
            "trigger_price": trigger_price if order_type != "LIMIT" else attached_sl,
            "status": "PENDING",
            "brokerage_fees": 0.0,
            "regulatory_charges": 0.0
        }
        
        created_order = await DatabaseService.create_order(order_doc)
        
        # If MARKET order, execute immediately at LTP
        if order_type == "MARKET":
            executed = await OrderMatcherService.execute_order(created_order, ltp)
            
            # If attached stoploss was specified, immediately place protective exit SL_M order
            if attached_sl is not None and attached_sl > 0:
                opp_side = "SELL" if side == "BUY" else "BUY"
                sl_order_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "symbol": symbol,
                    "side": opp_side,
                    "product_type": product_type,
                    "order_type": "SL_M",
                    "quantity": quantity,
                    "price": None,
                    "trigger_price": attached_sl,
                    "status": "PENDING",
                    "brokerage_fees": 0.0,
                    "regulatory_charges": 0.0
                }
                await DatabaseService.create_order(sl_order_doc)
                logger.info(f"Protective {opp_side} SL_M order placed for {user_id}: {quantity} {symbol} ({product_type}) @ Trigger ₹{attached_sl:.2f}")
            
            return executed
            
        # Check immediate limit/trigger satisfaction
        return await OrderMatcherService.check_order_trigger(created_order, ltp)

    @staticmethod
    async def check_order_trigger(order: Dict[str, Any], current_ltp: float) -> Dict[str, Any]:
        """Evaluates whether pending LIMIT or SL_M order conditions are met"""
        if order["status"] != "PENDING":
            return order
            
        side = order["side"]
        order_type = order["order_type"]
        price = order.get("price")
        trigger_price = order.get("trigger_price")
        
        should_execute = False
        execution_price = current_ltp
        attached_sl_to_activate = None
        
        if order_type == "LIMIT" and price is not None:
            if side == "BUY" and current_ltp <= price:
                should_execute = True
                execution_price = price
                attached_sl_to_activate = trigger_price
            elif side == "SELL" and current_ltp >= price:
                should_execute = True
                execution_price = price
                attached_sl_to_activate = trigger_price
                
        elif order_type == "SL_M" and trigger_price is not None:
            if side == "BUY" and current_ltp >= trigger_price:
                should_execute = True
                execution_price = current_ltp
            elif side == "SELL" and current_ltp <= trigger_price:
                should_execute = True
                execution_price = current_ltp
                
        if should_execute:
            executed = await OrderMatcherService.execute_order(order, execution_price)
            
            # If this executed order was a LIMIT order with an attached stoploss trigger, activate the SL order now
            if attached_sl_to_activate is not None and attached_sl_to_activate > 0:
                opp_side = "SELL" if side == "BUY" else "BUY"
                sl_order_doc = {
                    "id": str(uuid.uuid4()),
                    "user_id": order["user_id"],
                    "symbol": order["symbol"],
                    "side": opp_side,
                    "product_type": order["product_type"],
                    "order_type": "SL_M",
                    "quantity": int(order["quantity"]),
                    "price": None,
                    "trigger_price": attached_sl_to_activate,
                    "status": "PENDING",
                    "brokerage_fees": 0.0,
                    "regulatory_charges": 0.0
                }
                await DatabaseService.create_order(sl_order_doc)
                logger.info(f"Activated attached Stoploss SL_M order for executed LIMIT order: {opp_side} {order['quantity']} {order['symbol']} @ Trigger ₹{attached_sl_to_activate:.2f}")

            return executed
            
        return order

    @staticmethod
    async def execute_order(order: Dict[str, Any], exec_price: float) -> Dict[str, Any]:
        """Atomically executes an order, updates positions, cash balance, and charges"""
        user_id = order["user_id"]
        symbol = order["symbol"]
        side = order["side"]
        product_type = order["product_type"]
        qty = int(order["quantity"])
        
        charges = calculate_single_leg_charges(symbol, side, product_type, qty, exec_price)
        regulatory_charges = round(charges.stt + charges.exchange_charges + charges.sebi_charges + charges.stamp_duty + charges.gst, 2)
        brokerage = charges.brokerage
        total_charges = charges.total_charges
        turnover = charges.turnover
        
        portfolio = await DatabaseService.get_portfolio(user_id)
        current_cash = float(portfolio["virtual_cash"])
        
        # Fetch current position
        existing_pos = await DatabaseService.get_position(user_id, symbol, product_type)
        current_qty = int(existing_pos["quantity"]) if existing_pos else 0
        current_avg = float(existing_pos["average_price"]) if existing_pos else 0.0
        current_realized_pnl = float(existing_pos["realized_pnl"]) if existing_pos else 0.0
        
        realized_pnl_delta = 0.0
        new_qty = current_qty
        new_avg = current_avg
        
        order_signed_qty = qty if side == "BUY" else -qty
        
        if current_qty == 0:
            # New position opened
            new_qty = order_signed_qty
            new_avg = exec_price
        elif (current_qty > 0 and order_signed_qty > 0) or (current_qty < 0 and order_signed_qty < 0):
            # Adding to existing position in same direction -> weighted average price
            total_shares = abs(current_qty) + qty
            new_avg = round(((abs(current_qty) * current_avg) + (qty * exec_price)) / total_shares, 2)
            new_qty = current_qty + order_signed_qty
        else:
            # Opposite side order (Closing, Reducing, or Reversing)
            closed_qty = min(abs(current_qty), qty)
            if current_qty > 0:  # Closing Long
                realized_pnl_delta = round(closed_qty * (exec_price - current_avg), 2)
            else:  # Closing Short
                realized_pnl_delta = round(closed_qty * (current_avg - exec_price), 2)
                
            new_qty = current_qty + order_signed_qty
            if new_qty == 0:
                new_avg = 0.0
            elif (current_qty > 0 and new_qty < 0) or (current_qty < 0 and new_qty > 0):
                # Reversal position
                new_avg = exec_price
            else:
                # Partial reduction: keep same average price
                new_avg = current_avg
                
        # Update realized PnL on position (less leg charges)
        total_realized_pnl = round(current_realized_pnl + realized_pnl_delta - total_charges, 2)
        
        # Deduct charges and add realized PnL to virtual cash
        updated_cash = round(current_cash + realized_pnl_delta - total_charges, 2)
        
        # Upsert Position
        await DatabaseService.upsert_position(
            user_id=user_id,
            symbol=symbol,
            product_type=product_type,
            quantity=new_qty,
            average_price=new_avg,
            realized_pnl=total_realized_pnl
        )
        
        # If position is completely closed, cancel any remaining pending SL_M orders for this symbol
        if new_qty == 0:
            await DatabaseService.cancel_pending_sl_orders(user_id, symbol, product_type)
        
        # Calculate new total used margin across all active positions
        all_positions = await DatabaseService.get_positions(user_id)
        total_used_margin = 0.0
        for pos in all_positions:
            p_qty = abs(int(pos["quantity"]))
            if p_qty > 0:
                p_sym = pos["symbol"]
                p_type = pos["product_type"]
                p_tick = market_feed.market_cache.get(p_sym)
                p_price = p_tick["ltp"] if p_tick else float(pos["average_price"])
                
                if p_type == "CNC":
                    total_used_margin += p_qty * p_price
                elif p_type == "MIS":
                    total_used_margin += (p_qty * p_price) / 5.0
                    
        total_used_margin = round(total_used_margin, 2)
        
        # Update Portfolio
        await DatabaseService.update_portfolio(user_id, updated_cash, total_used_margin)
        
        # Update Order Record
        updated_order = await DatabaseService.update_order(
            order_id=order["id"],
            updates={
                "status": "EXECUTED",
                "execution_price": exec_price,
                "brokerage_fees": brokerage,
                "regulatory_charges": regulatory_charges
            }
        )
        
        # Create Trade Audit Log
        await DatabaseService.create_trade({
            "order_id": order["id"],
            "user_id": user_id,
            "symbol": symbol,
            "side": side,
            "product_type": product_type,
            "quantity": qty,
            "price": exec_price,
            "turnover": turnover,
            "total_charges": total_charges
        })
        
        logger.info(f"Order {order['id']} EXECUTED: {side} {qty} {symbol} @ ₹{exec_price:.2f} | Charges: ₹{total_charges:.2f}")
        return updated_order or order

    @staticmethod
    async def match_all_pending_orders():
        """Evaluates all pending orders against current market cache"""
        pending_orders = await DatabaseService.get_pending_orders()
        for order in pending_orders:
            symbol = order["symbol"]
            tick = market_feed.market_cache.get(symbol)
            if tick:
                await OrderMatcherService.check_order_trigger(order, tick["ltp"])

order_matcher = OrderMatcherService()
