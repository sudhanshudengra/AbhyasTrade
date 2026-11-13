import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import aiosqlite
from app.core.config import settings

logger = logging.getLogger("abhyastrade.database")

# Check if Supabase credentials are provided
supabase_client = None
if not os.environ.get("TESTING") and settings.SUPABASE_URL and settings.SUPABASE_KEY:
    try:
        from supabase import create_client, Client

        supabase_client: Optional[Client] = create_client(
            settings.SUPABASE_URL, settings.SUPABASE_KEY
        )
        logger.info("Connected to Supabase PostgreSQL database.")
    except Exception as e:
        logger.warning(
            f"Failed to initialize Supabase client: {e}. Falling back to SQLite."
        )
        supabase_client = None

SQLITE_DB_PATH = "backend/abhyastrade.db"


async def init_db():
    """Initialize default portfolio in Supabase or tables in SQLite"""
    if supabase_client:
        try:
            res = (
                supabase_client.table("portfolios")
                .select("*")
                .eq("user_id", settings.DEFAULT_USER_ID)
                .execute()
            )
            if not res.data:
                now = datetime.now(timezone.utc).isoformat()
                supabase_client.table("portfolios").insert(
                    {
                        "user_id": settings.DEFAULT_USER_ID,
                        "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                        "used_margin": 0.0,
                        "created_at": now,
                        "updated_at": now,
                    }
                ).execute()
                logger.info("Initialized default portfolio in Supabase PostgreSQL.")
        except Exception as e:
            logger.warning(f"Supabase init check: {e}")

    # Always ensure local SQLite fallback tables are initialized

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

        await db.execute("""
            CREATE TABLE IF NOT EXISTS ai_analysis_cache (
                id TEXT PRIMARY KEY,
                cache_key TEXT UNIQUE NOT NULL,
                analysis_type TEXT NOT NULL,
                symbol TEXT,
                exchange TEXT DEFAULT 'NSE',
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                result TEXT NOT NULL,
                input_data_hash TEXT NOT NULL,
                data_timestamp TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_analysis_cache(cache_key)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_analysis_cache(symbol, analysis_type)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_analysis_cache(expires_at)"
        )

        await db.execute("""
            CREATE TABLE IF NOT EXISTS ai_usage_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                feature TEXT NOT NULL,
                symbol TEXT,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL,
                tokens_input INTEGER,
                tokens_output INTEGER,
                cached INTEGER NOT NULL DEFAULT 0,
                error_code TEXT,
                created_at TEXT NOT NULL
            )
        """)
        # Safe migration for existing SQLite databases
        try:
            await db.execute("ALTER TABLE ai_usage_logs ADD COLUMN symbol TEXT")
            await db.commit()
        except Exception:
            pass

        try:
            await db.execute("ALTER TABLE portfolios ADD COLUMN custom_ai_limit INTEGER")
            await db.commit()
        except Exception:
            pass

        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_usage_user_time ON ai_usage_logs(user_id, created_at DESC)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage_logs(feature)"
        )
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_usage_symbol ON ai_usage_logs(user_id, symbol, created_at DESC)"
        )

        # Seed default portfolio
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            """
            INSERT OR IGNORE INTO portfolios (id, user_id, virtual_cash, used_margin, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                settings.DEFAULT_USER_ID,
                settings.VIRTUAL_INITIAL_CASH,
                0.0,
                now,
                now,
            ),
        )
        await db.commit()
    logger.info("Local SQLite database initialized.")


class DatabaseService:
    @staticmethod
    async def get_portfolio(user_id: str = settings.DEFAULT_USER_ID) -> Dict[str, Any]:
        if supabase_client:
            try:
                res = (
                    supabase_client.table("portfolios")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data:
                    return res.data[0]
                # Insert initial portfolio
                new_p = {
                    "user_id": user_id,
                    "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                    "used_margin": 0.0,
                }
                insert_res = supabase_client.table("portfolios").insert(new_p).execute()
                return insert_res.data[0]
            except Exception as e:
                logger.error(f"Supabase error get_portfolio: {e}")

        # SQLite fallback
        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM portfolios WHERE user_id = ?", (user_id,)
            )
            row = await cursor.fetchone()
            if row:
                return dict(row)

            now = datetime.now(timezone.utc).isoformat()
            new_id = str(uuid.uuid4())
            await db.execute(
                "INSERT INTO portfolios (id, user_id, virtual_cash, used_margin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (new_id, user_id, settings.VIRTUAL_INITIAL_CASH, 0.0, now, now),
            )
            await db.commit()
            return {
                "id": new_id,
                "user_id": user_id,
                "virtual_cash": settings.VIRTUAL_INITIAL_CASH,
                "used_margin": 0.0,
                "created_at": now,
                "updated_at": now,
            }

    @staticmethod
    async def update_portfolio(
        user_id: str, virtual_cash: float, used_margin: float
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                res = (
                    supabase_client.table("portfolios")
                    .update(
                        {
                            "virtual_cash": virtual_cash,
                            "used_margin": used_margin,
                            "updated_at": now,
                        }
                    )
                    .eq("user_id", user_id)
                    .execute()
                )
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error update_portfolio: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                "UPDATE portfolios SET virtual_cash = ?, used_margin = ?, updated_at = ? WHERE user_id = ?",
                (virtual_cash, used_margin, now, user_id),
            )
            await db.commit()
        return await DatabaseService.get_portfolio(user_id)

    @staticmethod
    async def reset_portfolio(
        user_id: str = settings.DEFAULT_USER_ID,
        initial_cash: float = settings.VIRTUAL_INITIAL_CASH,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                # Delete trades, orders, positions
                supabase_client.table("trades").delete().eq(
                    "user_id", user_id
                ).execute()
                supabase_client.table("orders").delete().eq(
                    "user_id", user_id
                ).execute()
                supabase_client.table("positions").delete().eq(
                    "user_id", user_id
                ).execute()
                res = (
                    supabase_client.table("portfolios")
                    .update(
                        {
                            "virtual_cash": initial_cash,
                            "used_margin": 0.0,
                            "updated_at": now,
                        }
                    )
                    .eq("user_id", user_id)
                    .execute()
                )
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
                (initial_cash, now, user_id),
            )
            await db.commit()
        return await DatabaseService.get_portfolio(user_id)

    @staticmethod
    async def get_positions(
        user_id: str = settings.DEFAULT_USER_ID,
    ) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = (
                    supabase_client.table("positions")
                    .select("*")
                    .eq("user_id", user_id)
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_positions: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM positions WHERE user_id = ?", (user_id,)
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def get_position(
        user_id: str, symbol: str, product_type: str
    ) -> Optional[Dict[str, Any]]:
        if supabase_client:
            try:
                res = (
                    supabase_client.table("positions")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("symbol", symbol)
                    .eq("product_type", product_type)
                    .execute()
                )
                return res.data[0] if res.data else None
            except Exception as e:
                logger.error(f"Supabase error get_position: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?",
                (user_id, symbol, product_type),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    async def upsert_position(
        user_id: str,
        symbol: str,
        product_type: str,
        quantity: int,
        average_price: float,
        realized_pnl: float,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                res = (
                    supabase_client.table("positions")
                    .upsert(
                        {
                            "user_id": user_id,
                            "symbol": symbol,
                            "product_type": product_type,
                            "quantity": quantity,
                            "average_price": average_price,
                            "realized_pnl": realized_pnl,
                            "updated_at": now,
                        },
                        on_conflict="user_id,symbol,product_type",
                    )
                    .execute()
                )
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.error(f"Supabase error upsert_position: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT id FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?",
                (user_id, symbol, product_type),
            )
            existing = await cursor.fetchone()
            if existing:
                await db.execute(
                    "UPDATE positions SET quantity = ?, average_price = ?, realized_pnl = ?, updated_at = ? WHERE id = ?",
                    (quantity, average_price, realized_pnl, now, existing["id"]),
                )
            else:
                new_id = str(uuid.uuid4())
                await db.execute(
                    "INSERT INTO positions (id, user_id, symbol, product_type, quantity, average_price, realized_pnl, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        new_id,
                        user_id,
                        symbol,
                        product_type,
                        quantity,
                        average_price,
                        realized_pnl,
                        now,
                        now,
                    ),
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
            "updated_at": now,
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
                    payload["id"],
                    payload["user_id"],
                    payload["symbol"],
                    payload["side"],
                    payload["product_type"],
                    payload["order_type"],
                    payload["quantity"],
                    payload["price"],
                    payload["trigger_price"],
                    payload["status"],
                    payload["execution_price"],
                    payload["brokerage_fees"],
                    payload["regulatory_charges"],
                    payload["rejection_reason"],
                    payload["created_at"],
                    payload["updated_at"],
                ),
            )
            await db.commit()
        return payload

    @staticmethod
    async def update_order(
        order_id: str, updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        now = datetime.now(timezone.utc).isoformat()
        updates["updated_at"] = now

        if supabase_client:
            try:
                res = (
                    supabase_client.table("orders")
                    .update(updates)
                    .eq("id", order_id)
                    .execute()
                )
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
    async def get_orders(
        user_id: str = settings.DEFAULT_USER_ID, status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                query = (
                    supabase_client.table("orders").select("*").eq("user_id", user_id)
                )
                if status:
                    query = query.eq("status", status)
                res = query.order("created_at", desc=True).execute()
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_orders: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            if status:
                cursor = await db.execute(
                    "SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC",
                    (user_id, status),
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
                    (user_id,),
                )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def get_pending_orders() -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = (
                    supabase_client.table("orders")
                    .select("*")
                    .eq("status", "PENDING")
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_pending_orders: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM orders WHERE status = 'PENDING'")
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def cancel_pending_sl_orders(user_id: str, symbol: str, product_type: str):
        """Cancels any remaining pending SL_M orders for a closed position"""
        now = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                supabase_client.table("orders").update(
                    {"status": "CANCELLED", "updated_at": now}
                ).eq("user_id", user_id).eq("symbol", symbol).eq(
                    "product_type", product_type
                ).eq("order_type", "SL_M").eq("status", "PENDING").execute()
                return
            except Exception as e:
                logger.error(f"Supabase error cancel_pending_sl_orders: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                "UPDATE orders SET status = 'CANCELLED', updated_at = ? WHERE user_id = ? AND symbol = ? AND product_type = ? AND order_type = 'SL_M' AND status = 'PENDING'",
                (now, user_id, symbol, product_type),
            )
            await db.commit()

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
            "executed_at": now,
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
                    payload["id"],
                    payload["order_id"],
                    payload["user_id"],
                    payload["symbol"],
                    payload["side"],
                    payload["product_type"],
                    payload["quantity"],
                    payload["price"],
                    payload["turnover"],
                    payload["total_charges"],
                    payload["executed_at"],
                ),
            )
            await db.commit()
        return payload

    @staticmethod
    async def get_trades(
        user_id: str = settings.DEFAULT_USER_ID,
    ) -> List[Dict[str, Any]]:
        if supabase_client:
            try:
                res = (
                    supabase_client.table("trades")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("executed_at", desc=True)
                    .execute()
                )
                return res.data or []
            except Exception as e:
                logger.error(f"Supabase error get_trades: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM trades WHERE user_id = ? ORDER BY executed_at DESC",
                (user_id,),
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    async def get_ai_cache(cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieves a cached AI result if not expired"""
        now_iso = datetime.now(timezone.utc).isoformat()
        if supabase_client:
            try:
                res = (
                    supabase_client.table("ai_analysis_cache")
                    .select("*")
                    .eq("cache_key", cache_key)
                    .gt("expires_at", now_iso)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    entry = dict(res.data[0])
                    if isinstance(entry.get("result"), str):
                        entry["result"] = json.loads(entry["result"])
                    return entry
                return None
            except Exception as e:
                logger.error(f"Supabase error get_ai_cache: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM ai_analysis_cache WHERE cache_key = ? AND expires_at > ?",
                (cache_key, now_iso),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            entry = dict(row)
            if isinstance(entry.get("result"), str):
                try:
                    entry["result"] = json.loads(entry["result"])
                except Exception:
                    pass
            return entry

    @staticmethod
    async def set_ai_cache(
        cache_key: str,
        analysis_type: str,
        provider: str,
        model: str,
        result: Dict[str, Any],
        input_data_hash: str,
        expires_at: str,
        symbol: Optional[str] = None,
        exchange: str = "NSE",
        data_timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Stores or updates a reusable AI analysis in the database cache"""
        entry_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        result_str = json.dumps(result) if not isinstance(result, str) else result

        payload = {
            "id": entry_id,
            "cache_key": cache_key,
            "analysis_type": analysis_type,
            "symbol": symbol,
            "exchange": exchange,
            "provider": provider,
            "model": model,
            "result": result if supabase_client else result_str,
            "input_data_hash": input_data_hash,
            "data_timestamp": data_timestamp or now_iso,
            "created_at": now_iso,
            "expires_at": expires_at,
        }

        if supabase_client:
            try:
                supabase_client.table("ai_analysis_cache").upsert(
                    payload, on_conflict="cache_key"
                ).execute()
                return payload
            except Exception as e:
                logger.error(f"Supabase error set_ai_cache: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO ai_analysis_cache 
                (id, cache_key, analysis_type, symbol, exchange, provider, model, result, input_data_hash, data_timestamp, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cache_key) DO UPDATE SET
                    provider = excluded.provider,
                    model = excluded.model,
                    result = excluded.result,
                    input_data_hash = excluded.input_data_hash,
                    data_timestamp = excluded.data_timestamp,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
                """,
                (
                    entry_id,
                    cache_key,
                    analysis_type,
                    symbol,
                    exchange,
                    provider,
                    model,
                    result_str,
                    input_data_hash,
                    data_timestamp or now_iso,
                    now_iso,
                    expires_at,
                ),
            )
            await db.commit()
        return payload

    @staticmethod
    async def cleanup_expired_ai_cache() -> int:
        """Deletes expired entries from ai_analysis_cache"""
        now_iso = datetime.now(timezone.utc).isoformat()
        deleted = 0
        if supabase_client:
            try:
                res = (
                    supabase_client.table("ai_analysis_cache")
                    .delete()
                    .lt("expires_at", now_iso)
                    .execute()
                )
                deleted = len(res.data) if res.data else 0
            except Exception as e:
                logger.error(f"Supabase error cleanup_expired_ai_cache: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            cursor = await db.execute(
                "DELETE FROM ai_analysis_cache WHERE expires_at < ?", (now_iso,)
            )
            await db.commit()
            deleted += cursor.rowcount
        return deleted

    @staticmethod
    async def log_ai_usage(
        user_id: str,
        feature: str,
        provider: str,
        model: str,
        status: str,
        symbol: Optional[str] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
        cached: bool = False,
        error_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Logs an AI execution or cache hit to ai_usage_logs"""
        entry_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        clean_symbol = symbol.strip().upper() if symbol else None
        payload = {
            "id": entry_id,
            "user_id": user_id,
            "feature": feature,
            "symbol": clean_symbol,
            "provider": provider,
            "model": model,
            "status": status,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "cached": 1 if cached else 0,
            "error_code": error_code,
            "created_at": now_iso,
        }

        if supabase_client:
            try:
                supa_payload = dict(payload)
                supa_payload["cached"] = cached
                supabase_client.table("ai_usage_logs").insert(supa_payload).execute()
                return payload
            except Exception as e:
                logger.error(f"Supabase error log_ai_usage: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            await db.execute(
                """
                INSERT INTO ai_usage_logs 
                (id, user_id, feature, symbol, provider, model, status, tokens_input, tokens_output, cached, error_code, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    entry_id,
                    user_id,
                    feature,
                    clean_symbol,
                    provider,
                    model,
                    status,
                    tokens_input,
                    tokens_output,
                    1 if cached else 0,
                    error_code,
                    now_iso,
                ),
            )
            await db.commit()
        return payload

    @staticmethod
    async def get_user_daily_ai_usage(
        user_id: str = settings.DEFAULT_USER_ID,
    ) -> Dict[str, Any]:
        """Computes current user's usage counts today (UTC) for quota enforcement"""
        now = datetime.now(timezone.utc)
        today_midnight = datetime(
            now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc
        ).isoformat()

        heavy_features = {"stock-analysis", "peer-comparison", "financial-analysis"}
        light_features = {"sentiment", "education", "technical-indicator"}

        analyzed_stocks = set()
        heavy_count = 0
        light_count = 0
        recent_minute_count = 0
        one_min_ago = (now - timedelta(minutes=1)).isoformat()
        custom_limit = None

        if supabase_client:
            try:
                # Check for custom per-user quota override in portfolios table
                p_res = (
                    supabase_client.table("portfolios")
                    .select("custom_ai_limit")
                    .eq("user_id", user_id)
                    .limit(1)
                    .execute()
                )
                if p_res.data and p_res.data[0].get("custom_ai_limit") is not None:
                    custom_limit = int(p_res.data[0]["custom_ai_limit"])
            except Exception:
                pass

            try:
                res = (
                    supabase_client.table("ai_usage_logs")
                    .select("feature, symbol, cached, status, created_at")
                    .eq("user_id", user_id)
                    .gte("created_at", today_midnight)
                    .execute()
                )
                if res.data:
                    for row in res.data:
                        is_cached = bool(row.get("cached", False))
                        status = row.get("status")
                        feat = row.get("feature", "")
                        sym = row.get("symbol")
                        created_at = row.get("created_at", "")

                        if created_at >= one_min_ago:
                            recent_minute_count += 1

                        if status == "SUCCESS":
                            if feat in heavy_features:
                                if sym:
                                    analyzed_stocks.add(sym.strip().upper())
                                if not is_cached:
                                    heavy_count += 1
                            elif feat in light_features and not is_cached:
                                light_count += 1

                    stocks_limit = custom_limit if custom_limit is not None else settings.AI_STOCKS_DAILY_LIMIT
                    stocks_used_count = (
                        len(analyzed_stocks) if analyzed_stocks else heavy_count
                    )
                    stocks_remaining = max(0, stocks_limit - stocks_used_count)

                    return {
                        "stocks_remaining": stocks_remaining,
                        "stocks_limit": stocks_limit,
                        "stocks_used_count": stocks_used_count,
                        "analyzed_stocks": sorted(list(analyzed_stocks)),
                        "heavy_count": heavy_count,
                        "light_count": light_count,
                        "recent_minute_count": recent_minute_count,
                        "heavy_limit": stocks_limit,
                        "light_limit": settings.AI_USER_DAILY_LIMIT,
                        "remaining_heavy": stocks_remaining,
                        "remaining_light": max(
                            0, settings.AI_USER_DAILY_LIMIT - light_count
                        ),
                    }
            except Exception as e:
                logger.error(f"Supabase error get_user_daily_ai_usage: {e}")

        async with aiosqlite.connect(SQLITE_DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            if custom_limit is None:
                try:
                    p_cursor = await db.execute("SELECT custom_ai_limit FROM portfolios WHERE user_id = ?", (user_id,))
                    p_row = await p_cursor.fetchone()
                    if p_row and p_row["custom_ai_limit"] is not None:
                        custom_limit = int(p_row["custom_ai_limit"])
                except Exception:
                    pass

            cursor = await db.execute(
                """
                SELECT feature, symbol, cached, status, created_at 
                FROM ai_usage_logs 
                WHERE user_id = ? AND created_at >= ?
                """,
                (user_id, today_midnight),
            )
            rows = await cursor.fetchall()
            for r in rows:
                is_cached = bool(r["cached"])
                status = r["status"]
                feat = r["feature"]
                sym = r["symbol"] if "symbol" in r.keys() else None
                created_at = r["created_at"]

                if created_at >= one_min_ago:
                    recent_minute_count += 1

                if status == "SUCCESS":
                    if feat in heavy_features:
                        if sym:
                            analyzed_stocks.add(sym.strip().upper())
                        if not is_cached:
                            heavy_count += 1
                    elif feat in light_features and not is_cached:
                        light_count += 1

            stocks_limit = custom_limit if custom_limit is not None else settings.AI_STOCKS_DAILY_LIMIT
            stocks_used_count = (
                len(analyzed_stocks) if analyzed_stocks else heavy_count
            )
            stocks_remaining = max(0, stocks_limit - stocks_used_count)

            return {
                "stocks_remaining": stocks_remaining,
                "stocks_limit": stocks_limit,
                "stocks_used_count": stocks_used_count,
                "analyzed_stocks": sorted(list(analyzed_stocks)),
                "heavy_count": heavy_count,
                "light_count": light_count,
                "recent_minute_count": recent_minute_count,
                "heavy_limit": stocks_limit,
                "light_limit": settings.AI_USER_DAILY_LIMIT,
                "remaining_heavy": stocks_remaining,
                "remaining_light": max(0, settings.AI_USER_DAILY_LIMIT - light_count),
            }
