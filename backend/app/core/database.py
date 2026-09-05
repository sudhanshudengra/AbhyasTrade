import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import aiosqlite
from app.core.config import settings

logger = logging.getLogger("abhyastrade.database")

# Check if Supabase credentials are provided
supabase_client = None
if settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client: Optional[Client] = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Connected to Supabase PostgreSQL database.")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}. Falling back to SQLite.")
        supabase_client = None

SQLITE_DB_PATH = "backend/abhyastrade.db"

async def init_db():
    """Initialize default portfolio in Supabase or tables in SQLite"""
    if supabase_client:
        try:
            res = supabase_client.table("portfolios").select("*").eq("user_id", settings.DEFAULT_USER_ID).execute()
            if not res.data:
                now = datetime.now(timezone.utc).isoformat()
                supabase_client.table("portfolios").insert({
                    "user_id": settings.DEFAULT_USER_ID,
                    "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                    "used_margin": 0.0,
                    "created_at": now,
                    "updated_at": now
                }).execute()
                logger.info("Initialized default portfolio in Supabase PostgreSQL.")
        except Exception as e:
            logger.warning(f"Supabase init check: {e}")
        return
    
    async with aiosqlite.connect(SQLITE_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS portfolios (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                virtual_cash REAL NOT NULL DEFAULT 1000000.0,
                used_margin REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                product_type TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                average_price REAL NOT NULL DEFAULT 0.0,
                realized_pnl REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, symbol, product_type)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                product_type TEXT NOT NULL,
                order_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL,
                trigger_price REAL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                execution_price REAL,
                brokerage_fees REAL NOT NULL DEFAULT 0.0,
                regulatory_charges REAL NOT NULL DEFAULT 0.0,
                rejection_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS trades (
                id TEXT PRIMARY KEY,
                order_id TEXT,
                user_id TEXT NOT NULL,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                product_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL,
                turnover REAL NOT NULL,
                total_charges REAL NOT NULL DEFAULT 0.0,
                executed_at TEXT NOT NULL
            )
        """)
        
        # Seed default portfolio
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """
            INSERT OR IGNORE INTO portfolios (id, user_id, virtual_cash, used_margin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), settings.DEFAULT_USER_ID, settings.VIRTUAL_INITIAL_CASH, 0.0, now, now)
        )
        await db.commit()
    logger.info("Local SQLite database initialized.")

class DatabaseService:
    @staticmethod
    async def get_portfolio(user_id: str = settings.DEFAULT_USER_ID) -> Dict[str, Any]:
        if supabase_client:
            try:
                res = supabase_client.table("portfolios").select("*").eq("user_id", user_id).execute()
                if res.data:
                    return res.data[0]
                # Insert initial portfolio
                new_p = {
                    "user_id": user_id,
                    "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                    "used_margin": 0.0
                }
                insert_res = supabase_client.table("portfolios").insert(new_p).execute()
                return insert_res.data[0]
            except Exception as e:
                logger.error(f"Supabase error get_portfolio: {e}")
        
        # SQLite fallback
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM portfolios WHERE user_id = ?", (user_id,))
            row = await cursor.fetchone()
            if row:
                return dict(row)
            
            now = datetime.now(timezone.utc).isoformat()
            new_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO portfolios (id, user_id, virtual_cash, used_margin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (new_id, user_id, settings.VIRTUAL_INITIAL_CASH, 0.0, now, now)
            )
            await db.commit()
            return {
                "id": new_id,
                "user_id": user_id,
                "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                "used_margin": 0.0,
                "created_at": now,
                "updated_at": now
            }

    @staticmethod
    async def update_portfolio(user_id: str, virtual_cash: float, used_margin: float) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                res = supabase_client.table("portfolios").update({
                    "virtual_cash": virtual_cash,
                    "used_margin": used_margin,
                    "updated_at": now
                }).eq("user_id", user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error update_portfolio: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                "UPDATE portfolios SET virtual_cash = ?, used_margin = ?, updated_at = ? WHERE user_id = ?",
                (virtual_cash, used_margin, now, user_id)
            )
            await db.commit()
        return await DatabaseService.get_portfolio(user_id)

    @staticmethod
    async def reset_portfolio(user_id: str = settings.DEFAULT_USER_ID, initial_cash: float = settings.VIRTUAL_INITIAL_CASH) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                # Delete trades, orders, positions
                supabase_client.table("trades").delete().eq("user_id", user_id).execute()
                supabase_client.table("orders").delete().eq("user_id", user_id).execute()
                supabase_client.table("positions").delete().eq("user_id", user_id).execute()
                res = supabase_client.table("portfolios").update({
                    "virtual_cash": initial_cash,
                    "used_margin": 0.0,
                    "updated_at": now
                }).eq("user_id", user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error reset_portfolio: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute("DELETE FROM trades WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM orders WHERE user_id = ?", (user_id,))
            await db.execute("DELETE FROM positions WHERE user_id = ?", (user_id,))
            await db.execute(
                "UPDATE portfolios SET virtual_cash = ?, used_margin = 0.0, updated_at = ? WHERE user_id = ?",
                (initial_cash, now, user_id)
            )
            await db.commit()
        return await DatabaseService.get_portfolio(user_id)

    @staticmethod
    async def get_positions(user_id: str = settings.DEFAULT_USER_ID) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = supabase_client.table("positions").select("*").eq("user_id", user_id).execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_positions: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM positions WHERE user_id = ?", (user_id,))
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def get_position(user_id: str, symbol: str, product_type: str) -> Optional[Dict[str, Any]]:
        if supabase_client:
            try:
                res = supabase_client.table("positions").select("*").eq("user_id", user_id).eq("symbol", symbol).eq("product_type", product_type).execute()
                return res.data[0] if res.data else None
            except Exception as e:
                logger.error(f"Supabase error get_position: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?", (user_id, symbol, product_type))
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def upsert_position(user_id: str, symbol: str, product_type: str, quantity: int, average_price: float, realized_pnl: float) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                res = supabase_client.table("positions").upsert({
                    "user_id": user_id,
                    "symbol": symbol,
                    "product_type": product_type,
                    "quantity": quantity,
                    "average_price": average_price,
                    "realized_pnl": realized_pnl,
                    "updated_at": now
                }, on_conflict="user_id,symbol,product_type").execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error upsert_position: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT id FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?", (user_id, symbol, product_type))
            existing = await cursor.fetchone()
            if existing:
                await db.execute(
                    "UPDATE positions SET quantity = ?, average_price = ?, realized_pnl = ?, updated_at = ? WHERE id = ?",
                    (quantity, average_price, realized_pnl, now, existing["id"])
                )
            else:
                new_id = str(uuid.uuid4())
                await db.execute(
                    "INSERT INTO positions (id, user_id, symbol, product_type, quantity, average_price, realized_pnl, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (new_id, user_id, symbol, product_type, quantity, average_price, realized_pnl, now, now)
                )
            await db.commit()
            return await DatabaseService.get_position(user_id, symbol, product_type)

    @staticmethod
    async def create_order(order_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        order_id = order_data.get("id") or str(uuid.uuid4())
        payload = {
            "id": order_id,
            "user_id": order_data.get("user_id", settings.DEFAULT_USER_ID),
            "symbol": order_data["symbol"],
            "side": order_data["side"],
            "product_type": order_data["product_type"],
            "order_type": order_data["order_type"],
            "quantity": order_data["quantity"],
            "price": order_data.get("price"),
            "trigger_price": order_data.get("trigger_price"),
            "status": order_data.get("status", "PENDING"),
            "execution_price": order_data.get("execution_price"),
            "brokerage_fees": order_data.get("brokerage_fees", 0.0),
            "regulatory_charges": order_data.get("regulatory_charges", 0.0),
            "rejection_reason": order_data.get("rejection_reason"),
            "created_at": now,
            "updated_at": now
        }
        
        if supabase_client:
            try:
                res = supabase_client.table("orders").insert(payload).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error create_order: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO orders (id, user_id, symbol, side, product_type, order_type, quantity, price, trigger_price, status, execution_price, brokerage_fees, regulatory_charges, rejection_reason, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"], payload["user_id"], payload["symbol"], payload["side"],
                    payload["product_type"], payload["order_type"], payload["quantity"],
                    payload["price"], payload["trigger_price"], payload["status"],
                    payload["execution_price"], payload["brokerage_fees"],
                    payload["regulatory_charges"], payload["rejection_reason"],
                    payload["created_at"], payload["updated_at"]
                )
            )
            await db.commit()
        return payload

    @staticmethod
    async def update_order(order_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        updates["updated_at"] = now
        
        if supabase_client:
            try:
                res = supabase_client.table("orders").update(updates).eq("id", order_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error update_order: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            set_clauses = [f"{k} = ?" for k in updates.keys()]
            values = list(updates.values()) + [order_id]
            query = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id = ?"
            await db.execute(query, values)
            await db.commit()
            
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def get_orders(user_id: str = settings.DEFAULT_USER_ID, status: Optional[str] = None) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                query = supabase_client.table("orders").select("*").eq("user_id", user_id)
                if status:
                    query = query.eq("status", status)
                res = query.order("created_at", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_orders: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            if status:
                cursor = await db.execute("SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC", (user_id, status))
            else:
                cursor = await db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def get_pending_orders() -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = supabase_client.table("orders").select("*").eq("status", "PENDING").execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_pending_orders: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM orders WHERE status = 'PENDING'")
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def create_trade(trade_data: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        trade_id = trade_data.get("id") or str(uuid.uuid4())
        payload = {
            "id": trade_id,
            "order_id": trade_data.get("order_id"),
            "user_id": trade_data.get("user_id", settings.DEFAULT_USER_ID),
            "symbol": trade_data["symbol"],
            "side": trade_data["side"],
            "product_type": trade_data["product_type"],
            "quantity": trade_data["quantity"],
            "price": trade_data["price"],
            "turnover": trade_data["turnover"],
            "total_charges": trade_data.get("total_charges", 0.0),
            "executed_at": now
        }
        
        if supabase_client:
            try:
                res = supabase_client.table("trades").insert(payload).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error create_trade: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO trades (id, order_id, user_id, symbol, side, product_type, quantity, price, turnover, total_charges, executed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["id"], payload["order_id"], payload["user_id"], payload["symbol"],
                    payload["side"], payload["product_type"], payload["quantity"],
                    payload["price"], payload["turnover"], payload["total_charges"], payload["executed_at"]
                )
            )
            await db.commit()
        return payload

    @staticmethod
    async def get_trades(user_id: str = settings.DEFAULT_USER_ID) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = supabase_client.table("trades").select("*").eq("user_id", user_id).order("executed_at", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_trades: {e}")
                
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM trades WHERE user_id = ? ORDER BY executed_at DESC", (user_id,))
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
