import asyncio
import os
import sys
import unittest.mock
from datetime import datetime, timezone, timedelta

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath("backend"))

os.environ["TESTING"] = "1"
os.environ["AI_CACHE_STOCK_TTL"] = "2"
os.environ["AI_USER_DAILY_LIMIT"] = "5"
os.environ["AI_HEAVY_DAILY_LIMIT"] = "2"
os.environ["AI_PER_MINUTE_LIMIT"] = "5"

from app.core.config import settings
import app.core.database

app.core.database.supabase_client = None
app.core.database.SQLITE_DB_PATH = "backend/test_ai.db"
from app.core.database import init_db, DatabaseService

from app.ai.errors import AIUsageLimitExceededError
from app.ai.providers.mock import MockProvider
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.manager import ProviderManager
from app.ai.schemas import (
    StockAnalysisData,
    PeerComparisonData,
    SentimentData,
    EducationData,
)
from app.ai.services.single_flight import SingleFlightManager
from app.ai.services.cache_service import ai_cache_service
from app.ai.services.rate_limiter import ai_rate_limiter
from app.ai.services.data_provider import data_provider
from app.ai.services.orchestrator import ai_orchestrator


async def run_ai_tests():
    print("=== Initializing Test DB ===", flush=True)
    await init_db()
    print("Database initialized.", flush=True)

    print("\n=== Test 1: Mock Provider Schema Validation ===")
    provider = MockProvider()
    assert provider.is_configured(), "MockProvider should be configured"

    sa = await provider.generate_json("", "", "stock-analysis")
    validated_sa = StockAnalysisData(**sa)
    assert validated_sa.symbol == "DEMO"
    assert len(validated_sa.strengths) > 0
    print("✓ StockAnalysis schema validation passed.")

    peers = await provider.generate_json("", "", "peer-comparison")
    validated_peers = PeerComparisonData(**peers)
    assert len(validated_peers.peers) == 2
    print("✓ PeerComparison schema validation passed.")

    sent = await provider.generate_json("", "", "sentiment")
    validated_sent = SentimentData(**sent)
    assert validated_sent.overallSentiment in ["POSITIVE", "NEGATIVE", "NEUTRAL"]
    print("✓ Sentiment schema validation passed.")

    edu = await provider.generate_json("", "", "education")
    validated_edu = EducationData(**edu)
    assert len(validated_edu.quizzes) > 0
    print("✓ Education schema validation passed.")

    print("\n=== Test 2: Provider Chain Task Routing ===")
    mgr = ProviderManager()
    heavy_chain = mgr.get_provider_chain("stock-analysis")
    light_chain = mgr.get_provider_chain("education")
    assert len(heavy_chain) > 0
    assert len(light_chain) > 0
    heavy_names = [p.provider_name for p in heavy_chain]
    light_names = [p.provider_name for p in light_chain]
    print(f"✓ Task routing passed. Heavy chain: {heavy_names}, Light chain: {light_names}")

    # Verify OpenRouterProvider properties
    test_or = OpenRouterProvider(api_key="test-key", model="nvidia/nemotron-3.5-lightning:free")
    assert test_or.is_configured() is True
    assert test_or.provider_name == "openrouter"
    assert test_or.model_name == "nvidia/nemotron-3.5-lightning:free"

    # If openrouter is in chain, verify it is strictly at the tail (fallback position)
    if "openrouter" in heavy_names:
        assert heavy_names[-1] == "openrouter", "OpenRouter must be the last fallback in heavy chain"
    if "openrouter" in light_names:
        assert light_names[-1] == "openrouter", "OpenRouter must be the last fallback in light chain"
    print("✓ OpenRouter provider & fallback position verified.")

    print("\n=== Test 3: Single-Flight Stampede Protection ===")
    sf = SingleFlightManager()
    execution_count = 0

    async def _slow_generation():
        nonlocal execution_count
        execution_count += 1
        await asyncio.sleep(0.05)
        return {"status": "ok", "run": execution_count}

    tasks = [sf.execute_or_wait("test_flight_key", _slow_generation) for _ in range(5)]
    results = await asyncio.gather(*tasks)
    assert execution_count == 1, f"Expected 1 execution, got {execution_count}"
    for r in results:
        assert r["status"] == "ok"
        assert r["run"] == 1
    print(
        "✓ Single-flight concurrent lock passed: 5 concurrent callers made only 1 generation."
    )

    print("\n=== Test 4: AI Result Cache Hit and TTL Expiry ===")
    cache_key = "test_cache_reliance:v1"
    data = {"symbol": "RELIANCE", "overview": "Reliance test overview"}

    await ai_cache_service.store_analysis(
        cache_key=cache_key,
        analysis_type="stock-analysis",
        provider="mock",
        model="mock-v1",
        result=data,
        input_data_hash="hash123",
        ttl_seconds=1,
        symbol="RELIANCE",
    )

    cached = await ai_cache_service.get_cached_analysis(cache_key)
    assert cached is not None, "Cache lookup should hit"
    assert cached["result"]["overview"] == "Reliance test overview"
    print("✓ Cache hit verified.")

    await asyncio.sleep(1.1)
    expired = await ai_cache_service.get_cached_analysis(cache_key)
    assert expired is None, "Cache entry should expire after TTL"
    print("✓ Cache TTL expiration verified.")

    print("\n=== Test 5: Rate Limiting & Quota Tracking ===")
    test_user = "test_user_quota_01"
    settings.AI_STOCKS_DAILY_LIMIT = 2
    await ai_rate_limiter.log_generation_success(
        test_user, "stock-analysis", "mock", "mock-v1", symbol="STOCKA"
    )
    await ai_rate_limiter.log_generation_success(
        test_user, "stock-analysis", "mock", "mock-v1", symbol="STOCKB"
    )

    # Re-accessing STOCKA should be permitted even at limit:
    await ai_rate_limiter.check_user_limits(test_user, "stock-analysis", symbol="STOCKA")
    print("✓ Re-visiting already analyzed stock permitted at limit.")

    limit_raised = False
    try:
        # Trying a 3rd new stock should be blocked:
        await ai_rate_limiter.check_user_limits(test_user, "stock-analysis", symbol="STOCKC")
    except AIUsageLimitExceededError:
        limit_raised = True
    assert limit_raised, "User should be blocked after exceeding daily stock limit (2)"
    print("✓ Daily stock quota limit enforcement passed.")

    print("\n=== Test 6: Full Orchestrator End-to-End & Cross-User Cache Sharing ===")
    user_a = "test_user_a"
    user_b = "test_user_b"
    mock_equity = {
        "symbol": "TCS",
        "companyName": "Tata Consultancy Services Ltd.",
        "sector": "Information Technology",
        "industry": "IT Services",
        "verifiedMetrics": {
            "currentPrice": 4200.0,
            "currentPriceVsSma20": 1.2,
            "marketCap": "₹15,20,000 Cr",
            "peRatio": 31.5,
            "debtToEquity": 0.05,
        },
        "technicalIndicators": {
            "rsi14": 58.0,
            "sma20": 4150.0,
            "sma50": 4100.0,
        },
        "inputDataHash": "tcs_data_hash_01",
        "dataTimestamp": datetime.now(timezone.utc).isoformat(),
    }

    with unittest.mock.patch.object(
        data_provider, "get_stock_financial_data", return_value=mock_equity
    ):
        # 1. User A analyzes TCS -> fresh generation
        res1 = await ai_orchestrator.analyze_stock("TCS", user_id=user_a)
        assert res1["success"] is True
        assert res1["meta"]["cached"] is False
        first_gen_at = res1["meta"]["generatedAt"]
        print("✓ User A fresh stock analysis generation succeeded.")

        # 2. User A closes and re-opens TCS -> instant cache hit with same generatedAt
        res2 = await ai_orchestrator.analyze_stock("TCS", user_id=user_a)
        assert res2["success"] is True
        assert res2["meta"]["cached"] is True
        assert res2["meta"]["generatedAt"] == first_gen_at
        print("✓ User A re-opening TCS hits cache instantly with preserved generation timestamp.")

        # 3. User B opens TCS -> cross-user cache hit! User B gets User A's cached analysis immediately
        # Simulate price tick change to 4250.0
        mock_equity_new_price = dict(mock_equity)
        mock_equity_new_price["verifiedMetrics"] = dict(mock_equity["verifiedMetrics"])
        mock_equity_new_price["verifiedMetrics"]["currentPrice"] = 4250.0
        
        with unittest.mock.patch.object(
            data_provider, "get_stock_financial_data", return_value=mock_equity_new_price
        ):
            res3 = await ai_orchestrator.analyze_stock("TCS", user_id=user_b)
            assert res3["success"] is True
            assert res3["meta"]["cached"] is True
            assert res3["meta"]["generatedAt"] == first_gen_at
            # Live price overlay test
            assert res3["data"]["verifiedMetrics"]["currentPrice"] == 4250.0
            print("✓ User B cross-user cache hit: immediately loaded User A's analysis with live price overlay.")

            # 4. User B checks quota
            usage_b = await DatabaseService.get_user_daily_ai_usage(user_b)
            assert "TCS" in usage_b["analyzed_stocks"]
            assert usage_b["stocks_used_count"] == 1
            assert usage_b["stocks_remaining"] == settings.AI_STOCKS_DAILY_LIMIT - 1
            print("✓ Quota tracked 1 unique stock for User B (TCS).")

            # 5. User B re-opening TCS does NOT consume additional quota
            res4 = await ai_orchestrator.analyze_stock("TCS", user_id=user_b)
            assert res4["success"] is True
            assert res4["meta"]["cached"] is True
            usage_b_again = await DatabaseService.get_user_daily_ai_usage(user_b)
            assert usage_b_again["stocks_used_count"] == 1
            print("✓ User B re-accessing TCS did not burn extra stock quota.")

            # 6. Force refresh test
            res5 = await ai_orchestrator.analyze_stock("TCS", user_id=user_b, force_refresh=True)
            assert res5["success"] is True
            assert res5["meta"]["cached"] is False
            print("✓ Force refresh successfully bypassed cache and generated fresh analysis.")

    # Education topic
    edu_res = await ai_orchestrator.get_education("RSI Indicator", user_id=user_a)
    assert edu_res["success"] is True
    assert "quizzes" in edu_res["data"]
    print("✓ Education topic generated with quizzes.")

    # Clean up test DB
    try:
        if os.path.exists("backend/test_ai.db"):
            os.remove("backend/test_ai.db")
    except Exception:
        pass

    print("\n🎉 ALL AI INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n")


if __name__ == "__main__":
    asyncio.run(run_ai_tests())
