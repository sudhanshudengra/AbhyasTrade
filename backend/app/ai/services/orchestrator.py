import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.ai.errors import (
    AIException,
    AIRequestInvalidError,
    AIResponseInvalidError,
)
from app.ai.prompts import (
    SYSTEM_EDUCATOR,
    SYSTEM_FINANCIAL_ANALYST,
    build_education_prompt,
    build_peer_comparison_prompt,
    build_sentiment_prompt,
    build_stock_analysis_prompt,
)
from app.ai.providers.manager import provider_manager
from app.ai.schemas import (
    EducationData,
    PeerComparisonData,
    SentimentData,
    StockAnalysisData,
)
from app.ai.services.cache_service import ai_cache_service
from app.ai.services.data_provider import data_provider
from app.ai.services.rate_limiter import ai_rate_limiter
from app.ai.services.single_flight import single_flight_manager

logger = logging.getLogger("abhyastrade.ai.orchestrator")


class AIOrchestrator:
    # --------------------------------------------------------------------------
    # 1. Stock Analysis
    # --------------------------------------------------------------------------
    async def analyze_stock(
        self,
        symbol: str,
        user_id: str,
        exchange: str = "NSE",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        clean_symbol = symbol.strip().upper()
        feature = "stock-analysis"

        # 1. Fetch factual verified market and financial data
        equity_data = await data_provider.get_stock_financial_data(clean_symbol)
        input_data_hash = equity_data["inputDataHash"]
        data_timestamp = equity_data["dataTimestamp"]
        verified_metrics = equity_data["verifiedMetrics"]

        # 2. Form deterministic cache key
        cache_key = ai_cache_service.generate_stock_cache_key(clean_symbol, exchange)

        # 3. Check cache
        if not force_refresh:
            cached_entry = await ai_cache_service.get_cached_analysis(cache_key)
            if cached_entry:
                logger.info(f"Cache HIT for stock analysis on {clean_symbol}")
                await ai_rate_limiter.log_cache_hit(
                    user_id=user_id,
                    feature=feature,
                    provider=cached_entry["provider"],
                    model=cached_entry["model"],
                    symbol=clean_symbol,
                )
                result_data = cached_entry["result"]
                # Overlay live verified metrics (real-time price updates)
                if "verifiedMetrics" in result_data and isinstance(result_data["verifiedMetrics"], dict):
                    result_data["verifiedMetrics"]["currentPrice"] = verified_metrics.get("currentPrice")
                    result_data["verifiedMetrics"]["currentPriceVsSma20"] = verified_metrics.get("currentPriceVsSma20")
                else:
                    result_data["verifiedMetrics"] = verified_metrics
                return {
                    "success": True,
                    "data": result_data,
                    "meta": {
                        "cached": True,
                        "provider": cached_entry["provider"],
                        "model": cached_entry["model"],
                        "generatedAt": cached_entry.get("created_at") or datetime.now(timezone.utc).isoformat(),
                        "dataTimestamp": cached_entry.get("data_timestamp", data_timestamp),
                    },
                }

        # 4. Check user quota limits before generating
        await ai_rate_limiter.check_user_limits(
            user_id=user_id, feature=feature, symbol=clean_symbol
        )

        # 5. Single-flight execution to prevent stampede
        async def _generate_task():
            # Double check cache inside leader lock
            if not force_refresh:
                recheck = await ai_cache_service.get_cached_analysis(cache_key)
                if recheck:
                    res_data = recheck["result"]
                    if "verifiedMetrics" in res_data and isinstance(res_data["verifiedMetrics"], dict):
                        res_data["verifiedMetrics"]["currentPrice"] = verified_metrics.get("currentPrice")
                        res_data["verifiedMetrics"]["currentPriceVsSma20"] = verified_metrics.get("currentPriceVsSma20")
                    else:
                        res_data["verifiedMetrics"] = verified_metrics
                    return (
                        res_data,
                        recheck["provider"],
                        recheck["model"],
                        True,
                        recheck.get("created_at"),
                    )

            async with ai_rate_limiter.global_concurrency_guard():
                user_prompt = build_stock_analysis_prompt(
                    symbol=clean_symbol,
                    company_name=equity_data["companyName"],
                    sector=equity_data["sector"],
                    verified_metrics=verified_metrics,
                    technical_indicators=equity_data["technicalIndicators"],
                )

                (
                    raw_result,
                    provider_name,
                    model_name,
                ) = await provider_manager.execute_task(
                    task_name=feature,
                    system_prompt=SYSTEM_FINANCIAL_ANALYST,
                    user_prompt=user_prompt,
                )

                # Validate with Pydantic
                raw_result["symbol"] = clean_symbol
                raw_result["companyName"] = equity_data["companyName"]
                raw_result["verifiedMetrics"] = verified_metrics
                validated = StockAnalysisData(**raw_result).dict()
                gen_time = datetime.now(timezone.utc).isoformat()

                # Store in PostgreSQL / SQLite cache
                await ai_cache_service.store_analysis(
                    cache_key=cache_key,
                    analysis_type=feature,
                    provider=provider_name,
                    model=model_name,
                    result=validated,
                    input_data_hash=input_data_hash,
                    ttl_seconds=settings.AI_CACHE_STOCK_TTL,
                    symbol=clean_symbol,
                    exchange=exchange,
                    data_timestamp=data_timestamp,
                )

                # Log usage
                await ai_rate_limiter.log_generation_success(
                    user_id=user_id,
                    feature=feature,
                    provider=provider_name,
                    model=model_name,
                    symbol=clean_symbol,
                )

                return validated, provider_name, model_name, False, gen_time

        try:
            (
                result_dict,
                provider,
                model,
                was_cached,
                generated_at,
            ) = await single_flight_manager.execute_or_wait(
                cache_key=cache_key,
                coro_func=_generate_task,
            )
            return {
                "success": True,
                "data": result_dict,
                "meta": {
                    "cached": was_cached,
                    "provider": provider,
                    "model": model,
                    "generatedAt": generated_at,
                    "dataTimestamp": data_timestamp,
                },
            }
        except Exception as e:
            logger.error(f"Stock analysis orchestration failed for {clean_symbol}: {e}")
            await ai_rate_limiter.log_generation_failure(
                user_id=user_id,
                feature=feature,
                provider="unknown",
                error_code=getattr(e, "code", "AI_GENERATION_FAILED"),
            )
            raise e

    # --------------------------------------------------------------------------
    # 2. Peer Comparison
    # --------------------------------------------------------------------------
    async def compare_peers(
        self,
        symbols: List[str],
        user_id: str,
        exchange: str = "NSE",
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        clean_symbols = [s.strip().upper() for s in symbols]
        if len(clean_symbols) < 2 or len(clean_symbols) > 5:
            raise AIRequestInvalidError(
                "Peer comparison requires between 2 and 5 stock symbols."
            )

        feature = "peer-comparison"
        primary_symbol = clean_symbols[0]

        # 1. Fetch factual data for all peers
        peers_data = await data_provider.get_peer_group_data(clean_symbols)
        combined_hash = hashlib.sha256(
            "".join(p["inputDataHash"] for p in peers_data).encode()
        ).hexdigest()[:16]
        data_timestamp = datetime.now(timezone.utc).isoformat()

        # 2. Cache key
        cache_key = ai_cache_service.generate_peer_cache_key(clean_symbols, exchange)

        # 3. Cache lookup
        if not force_refresh:
            cached_entry = await ai_cache_service.get_cached_analysis(cache_key)
            if cached_entry:
                logger.info(f"Cache HIT for peer comparison on {clean_symbols}")
                await ai_rate_limiter.log_cache_hit(
                    user_id=user_id,
                    feature=feature,
                    provider=cached_entry["provider"],
                    model=cached_entry["model"],
                    symbol=primary_symbol,
                )
                return {
                    "success": True,
                    "data": cached_entry["result"],
                    "meta": {
                        "cached": True,
                        "provider": cached_entry["provider"],
                        "model": cached_entry["model"],
                        "generatedAt": cached_entry.get("created_at") or datetime.now(timezone.utc).isoformat(),
                        "dataTimestamp": cached_entry.get("data_timestamp", data_timestamp),
                    },
                }

        # 4. Check limits
        await ai_rate_limiter.check_user_limits(
            user_id=user_id, feature=feature, symbol=primary_symbol
        )

        # 5. Single flight execution
        async def _generate_task():
            if not force_refresh:
                recheck = await ai_cache_service.get_cached_analysis(cache_key)
                if recheck:
                    return (
                        recheck["result"],
                        recheck["provider"],
                        recheck["model"],
                        True,
                        recheck.get("created_at"),
                    )

            async with ai_rate_limiter.global_concurrency_guard():
                user_prompt = build_peer_comparison_prompt(
                    symbols=clean_symbols,
                    peers_data=peers_data,
                )

                (
                    raw_result,
                    provider_name,
                    model_name,
                ) = await provider_manager.execute_task(
                    task_name=feature,
                    system_prompt=SYSTEM_FINANCIAL_ANALYST,
                    user_prompt=user_prompt,
                )

                raw_result["symbols"] = clean_symbols
                validated = PeerComparisonData(**raw_result).dict()
                gen_time = datetime.now(timezone.utc).isoformat()

                await ai_cache_service.store_analysis(
                    cache_key=cache_key,
                    analysis_type=feature,
                    provider=provider_name,
                    model=model_name,
                    result=validated,
                    input_data_hash=combined_hash,
                    ttl_seconds=settings.AI_CACHE_PEER_TTL,
                    symbol=primary_symbol,
                    exchange=exchange,
                    data_timestamp=data_timestamp,
                )

                await ai_rate_limiter.log_generation_success(
                    user_id=user_id,
                    feature=feature,
                    provider=provider_name,
                    model=model_name,
                    symbol=primary_symbol,
                )

                return validated, provider_name, model_name, False, gen_time

        try:
            (
                result_dict,
                provider,
                model,
                was_cached,
                generated_at,
            ) = await single_flight_manager.execute_or_wait(
                cache_key=cache_key,
                coro_func=_generate_task,
            )
            return {
                "success": True,
                "data": result_dict,
                "meta": {
                    "cached": was_cached,
                    "provider": provider,
                    "model": model,
                    "generatedAt": generated_at,
                    "dataTimestamp": data_timestamp,
                },
            }
        except Exception as e:
            logger.error(f"Peer comparison orchestration failed: {e}")
            await ai_rate_limiter.log_generation_failure(
                user_id=user_id,
                feature=feature,
                provider="unknown",
                error_code=getattr(e, "code", "AI_GENERATION_FAILED"),
            )
            raise e

    # --------------------------------------------------------------------------
    # 3. News Sentiment Analysis
    # --------------------------------------------------------------------------
    async def analyze_sentiment(
        self,
        symbol: str,
        user_id: str,
        headline: Optional[str] = None,
        force_refresh: bool = False,
    ) -> Dict[str, Any]:
        clean_symbol = symbol.strip().upper()
        feature = "sentiment"

        # 1. Fetch factual news headlines
        if headline and headline.strip():
            news_items = [
                {
                    "headline": headline.strip(),
                    "publisher": "User Submitted",
                    "publishedAt": datetime.now(timezone.utc).isoformat(),
                }
            ]
        else:
            news_items = await data_provider.get_stock_news(clean_symbol)

        news_hash = hashlib.sha256(
            json.dumps([n["headline"] for n in news_items]).encode()
        ).hexdigest()[:16]
        data_timestamp = datetime.now(timezone.utc).isoformat()

        # 2. Cache key
        cache_key = ai_cache_service.generate_sentiment_cache_key(
            clean_symbol, news_hash if headline else None
        )

        # 3. Cache lookup
        if not force_refresh:
            cached_entry = await ai_cache_service.get_cached_analysis(cache_key)
            if cached_entry:
                logger.info(f"Cache HIT for sentiment on {clean_symbol}")
                await ai_rate_limiter.log_cache_hit(
                    user_id=user_id,
                    feature=feature,
                    provider=cached_entry["provider"],
                    model=cached_entry["model"],
                    symbol=clean_symbol,
                )
                return {
                    "success": True,
                    "data": cached_entry["result"],
                    "meta": {
                        "cached": True,
                        "provider": cached_entry["provider"],
                        "model": cached_entry["model"],
                        "generatedAt": cached_entry.get("created_at") or datetime.now(timezone.utc).isoformat(),
                        "dataTimestamp": cached_entry.get("data_timestamp", data_timestamp),
                    },
                }

        # 4. Check limits
        await ai_rate_limiter.check_user_limits(
            user_id=user_id, feature=feature, symbol=clean_symbol
        )

        # 5. Single flight execution
        async def _generate_task():
            if not force_refresh:
                recheck = await ai_cache_service.get_cached_analysis(cache_key)
                if recheck:
                    return (
                        recheck["result"],
                        recheck["provider"],
                        recheck["model"],
                        True,
                        recheck.get("created_at"),
                    )

            async with ai_rate_limiter.global_concurrency_guard():
                user_prompt = build_sentiment_prompt(
                    symbol=clean_symbol,
                    company_name=f"{clean_symbol} Ltd.",
                    news_items=news_items,
                )

                (
                    raw_result,
                    provider_name,
                    model_name,
                ) = await provider_manager.execute_task(
                    task_name=feature,
                    system_prompt=SYSTEM_FINANCIAL_ANALYST,
                    user_prompt=user_prompt,
                )

                raw_result["symbol"] = clean_symbol
                raw_result["companyName"] = raw_result.get(
                    "companyName", f"{clean_symbol} Ltd."
                )
                validated = SentimentData(**raw_result).dict()
                gen_time = datetime.now(timezone.utc).isoformat()

                await ai_cache_service.store_analysis(
                    cache_key=cache_key,
                    analysis_type=feature,
                    provider=provider_name,
                    model=model_name,
                    result=validated,
                    input_data_hash=news_hash,
                    ttl_seconds=settings.AI_CACHE_SENTIMENT_TTL,
                    symbol=clean_symbol,
                    exchange="NSE",
                    data_timestamp=data_timestamp,
                )

                await ai_rate_limiter.log_generation_success(
                    user_id=user_id,
                    feature=feature,
                    provider=provider_name,
                    model=model_name,
                    symbol=clean_symbol,
                )

                return validated, provider_name, model_name, False, gen_time

        try:
            (
                result_dict,
                provider,
                model,
                was_cached,
                generated_at,
            ) = await single_flight_manager.execute_or_wait(
                cache_key=cache_key,
                coro_func=_generate_task,
            )
            return {
                "success": True,
                "data": result_dict,
                "meta": {
                    "cached": was_cached,
                    "provider": provider,
                    "model": model,
                    "generatedAt": generated_at,
                    "dataTimestamp": data_timestamp,
                },
            }
        except Exception as e:
            logger.error(f"Sentiment orchestration failed for {clean_symbol}: {e}")
            await ai_rate_limiter.log_generation_failure(
                user_id=user_id,
                feature=feature,
                provider="unknown",
                error_code=getattr(e, "code", "AI_GENERATION_FAILED"),
            )
            raise e

    # --------------------------------------------------------------------------
    # 4. Trading Education & Concept Tutor
    # --------------------------------------------------------------------------
    async def get_education(
        self,
        topic: str,
        user_id: str,
        difficulty: str = "beginner",
    ) -> Dict[str, Any]:
        clean_topic = topic.strip()
        feature = "education"

        # 1. Deterministic cache key (educational content is highly reusable across all users)
        cache_key = ai_cache_service.generate_education_cache_key(
            clean_topic, difficulty
        )

        # 2. Check cache
        cached_entry = await ai_cache_service.get_cached_analysis(cache_key)
        if cached_entry:
            logger.info(f"Cache HIT for education topic '{clean_topic}'")
            await ai_rate_limiter.log_cache_hit(
                user_id=user_id,
                feature=feature,
                provider=cached_entry["provider"],
                model=cached_entry["model"],
            )
            return {
                "success": True,
                "data": cached_entry["result"],
                "meta": {
                    "cached": True,
                    "provider": cached_entry["provider"],
                    "model": cached_entry["model"],
                    "generatedAt": cached_entry["created_at"],
                },
            }

        # 3. Check limits
        await ai_rate_limiter.check_user_limits(user_id=user_id, feature=feature)

        # 4. Single flight execution
        async def _generate_task():
            recheck = await ai_cache_service.get_cached_analysis(cache_key)
            if recheck:
                return recheck["result"], recheck["provider"], recheck["model"], True

            async with ai_rate_limiter.global_concurrency_guard():
                user_prompt = build_education_prompt(
                    topic=clean_topic, difficulty=difficulty
                )

                (
                    raw_result,
                    provider_name,
                    model_name,
                ) = await provider_manager.execute_task(
                    task_name=feature,
                    system_prompt=SYSTEM_EDUCATOR,
                    user_prompt=user_prompt,
                )

                raw_result["topic"] = clean_topic
                raw_result["difficulty"] = difficulty
                validated = EducationData(**raw_result).dict()

                await ai_cache_service.store_analysis(
                    cache_key=cache_key,
                    analysis_type=feature,
                    provider=provider_name,
                    model=model_name,
                    result=validated,
                    input_data_hash="v1",
                    ttl_seconds=settings.AI_CACHE_EDUCATION_TTL,
                )

                await ai_rate_limiter.log_generation_success(
                    user_id=user_id,
                    feature=feature,
                    provider=provider_name,
                    model=model_name,
                )

                return validated, provider_name, model_name, False

        try:
            (
                result_dict,
                provider,
                model,
                was_cached,
            ) = await single_flight_manager.execute_or_wait(
                cache_key=cache_key,
                coro_func=_generate_task,
            )
            return {
                "success": True,
                "data": result_dict,
                "meta": {
                    "cached": was_cached,
                    "provider": provider,
                    "model": model,
                    "generatedAt": datetime.now(timezone.utc).isoformat(),
                },
            }
        except Exception as e:
            logger.error(f"Education orchestration failed for '{clean_topic}': {e}")
            await ai_rate_limiter.log_generation_failure(
                user_id=user_id,
                feature=feature,
                provider="unknown",
                error_code=getattr(e, "code", "AI_GENERATION_FAILED"),
            )
            raise e


ai_orchestrator = AIOrchestrator()
