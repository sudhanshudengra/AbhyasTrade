import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.database import DatabaseService

logger = logging.getLogger("abhyastrade.ai.cache")


class AICacheService:
    @staticmethod
    def generate_stock_cache_key(symbol: str, exchange: str = "NSE") -> str:
        s = symbol.strip().upper()
        ex = exchange.strip().upper()
        return f"stock_analysis:{s}:{ex}:v1"

    @staticmethod
    def generate_peer_cache_key(symbols: List[str], exchange: str = "NSE") -> str:
        sorted_syms = "_".join(sorted(s.strip().upper() for s in symbols))
        ex = exchange.strip().upper()
        return f"peer_comp:{sorted_syms}:{ex}:v1"

    @staticmethod
    def generate_sentiment_cache_key(
        symbol: str, headline_hash: Optional[str] = None
    ) -> str:
        s = symbol.strip().upper()
        if headline_hash:
            return f"sentiment:{s}:{headline_hash}:v1"
        return f"sentiment:{s}:v1"

    @staticmethod
    def generate_education_cache_key(topic: str, difficulty: str) -> str:
        clean_topic = "".join(
            ch for ch in topic.lower().strip() if ch.isalnum() or ch in " _-"
        )
        norm_topic = "_".join(clean_topic.split())
        return f"education:{norm_topic}:{difficulty.lower()}:v1"

    @staticmethod
    async def get_cached_analysis(cache_key: str) -> Optional[Dict[str, Any]]:
        """Looks up a valid unexpired analysis in the PostgreSQL/SQLite database cache"""
        try:
            return await DatabaseService.get_ai_cache(cache_key)
        except Exception as e:
            logger.error(f"Failed to query AI cache for key {cache_key}: {e}")
            return None

    @staticmethod
    async def store_analysis(
        cache_key: str,
        analysis_type: str,
        provider: str,
        model: str,
        result: Dict[str, Any],
        input_data_hash: str,
        ttl_seconds: int,
        symbol: Optional[str] = None,
        exchange: str = "NSE",
        data_timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Stores structured validated AI analysis in database with specific TTL"""
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(seconds=ttl_seconds)).isoformat()
        try:
            return await DatabaseService.set_ai_cache(
                cache_key=cache_key,
                analysis_type=analysis_type,
                provider=provider,
                model=model,
                result=result,
                input_data_hash=input_data_hash,
                expires_at=expires_at,
                symbol=symbol,
                exchange=exchange,
                data_timestamp=data_timestamp,
            )
        except Exception as e:
            logger.error(f"Failed to write AI cache for key {cache_key}: {e}")
            return {}


ai_cache_service = AICacheService()
