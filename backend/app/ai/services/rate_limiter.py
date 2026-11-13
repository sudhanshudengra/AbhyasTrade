import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional
from app.core.config import settings
from app.core.database import DatabaseService
from app.ai.errors import AIUsageLimitExceededError, AIProviderUnavailableError

logger = logging.getLogger("abhyastrade.ai.rate_limiter")


class AIRateLimiter:
    def __init__(self):
        self._global_semaphore = asyncio.Semaphore(settings.AI_GLOBAL_CONCURRENCY_LIMIT)

    async def check_user_limits(
        self, user_id: str, feature: str, symbol: Optional[str] = None
    ):
        """
        Validates whether the user has remaining daily quota and is not exceeding burst limits.
        Allows unlimited re-visits for stocks already analyzed today.
        Raises AIUsageLimitExceededError if limit is reached.
        """
        heavy_features = {"stock-analysis", "peer-comparison", "financial-analysis"}
        is_heavy = feature in heavy_features

        usage = await DatabaseService.get_user_daily_ai_usage(user_id)

        # Check 1: Per-minute burst limit
        if usage.get("recent_minute_count", 0) >= settings.AI_PER_MINUTE_LIMIT:
            logger.warning(
                f"User {user_id} exceeded per-minute AI burst limit ({settings.AI_PER_MINUTE_LIMIT}/min)"
            )
            raise AIUsageLimitExceededError(
                f"Rate limit exceeded: Maximum {settings.AI_PER_MINUTE_LIMIT} AI requests per minute. Please pause for 60 seconds."
            )

        # Check 2: Daily category limits
        if is_heavy:
            if symbol:
                clean_sym = symbol.strip().upper()
                if clean_sym in usage.get("analyzed_stocks", []):
                    # Stock already unlocked for this user today - permit unlimited views
                    return

            stocks_remaining = usage.get("stocks_remaining", usage.get("remaining_heavy", 0))
            stocks_limit = usage.get("stocks_limit", settings.AI_STOCKS_DAILY_LIMIT)
            if stocks_remaining <= 0:
                analyzed = usage.get("analyzed_stocks", [])
                analyzed_str = f" ({', '.join(analyzed[:5])})" if analyzed else ""
                logger.warning(
                    f"User {user_id} exhausted daily stocks limit ({stocks_limit})"
                )
                raise AIUsageLimitExceededError(
                    f"Daily free quota of {stocks_limit} stocks reached{analyzed_str}. "
                    "You can continue viewing previously analyzed stocks for free. "
                    "Quota resets at midnight UTC (05:30 AM IST)."
                )
        else:
            remaining = usage.get("remaining_light", 0)
            if remaining <= 0:
                logger.warning(
                    f"User {user_id} exhausted daily lightweight AI quota ({settings.AI_USER_DAILY_LIMIT})"
                )
                raise AIUsageLimitExceededError(
                    f"Daily AI Education & Sentiment limit reached ({settings.AI_USER_DAILY_LIMIT}/day). "
                    "Your free quota resets at midnight UTC (05:30 AM IST)."
                )

    @asynccontextmanager
    async def global_concurrency_guard(self):
        """Prevents exceeding the global simultaneous AI generations limit"""
        try:
            # Wait up to 15 seconds to acquire a generation slot
            await asyncio.wait_for(self._global_semaphore.acquire(), timeout=15.0)
        except asyncio.TimeoutError:
            logger.warning("Global AI concurrency limit reached; request rejected")
            raise AIProviderUnavailableError(
                "High platform AI traffic. Please retry your analysis in a few seconds."
            )

        try:
            yield
        finally:
            self._global_semaphore.release()

    @staticmethod
    async def log_cache_hit(
        user_id: str,
        feature: str,
        provider: str,
        model: str,
        symbol: Optional[str] = None,
    ):
        """Logs a cache hit (tracks accessed stock without consuming fresh generation count)"""
        await DatabaseService.log_ai_usage(
            user_id=user_id,
            feature=feature,
            symbol=symbol,
            provider=provider,
            model=model,
            status="SUCCESS",
            cached=True,
        )

    @staticmethod
    async def log_generation_success(
        user_id: str,
        feature: str,
        provider: str,
        model: str,
        symbol: Optional[str] = None,
        tokens_input: Optional[int] = None,
        tokens_output: Optional[int] = None,
    ):
        """Logs a newly generated AI response (consumes quota)"""
        await DatabaseService.log_ai_usage(
            user_id=user_id,
            feature=feature,
            symbol=symbol,
            provider=provider,
            model=model,
            status="SUCCESS",
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            cached=False,
        )

    @staticmethod
    async def log_generation_failure(
        user_id: str, feature: str, provider: str, error_code: str
    ):
        """Logs a failed attempt"""
        await DatabaseService.log_ai_usage(
            user_id=user_id,
            feature=feature,
            provider=provider,
            model="unknown",
            status="FAILED",
            cached=False,
            error_code=error_code,
        )


ai_rate_limiter = AIRateLimiter()
