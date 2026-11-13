import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Header, HTTPException, status
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import DatabaseService
from app.ai.errors import AIException
from app.ai.schemas import (
    EducationRequest,
    PeerComparisonRequest,
    SentimentRequest,
    StockAnalysisRequest,
)
from app.ai.services.orchestrator import ai_orchestrator

logger = logging.getLogger("abhyastrade.api.ai")

router = APIRouter(prefix="/ai", tags=["AI & Financial Analysis"])


def get_user_id_from_header(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> str:
    """Extracts verified user ID from header or falls back to standard demo ID"""
    return x_user_id or settings.DEFAULT_USER_ID


@router.post("/stock-analysis")
async def analyze_stock(
    req: StockAnalysisRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Dict[str, Any]:
    """Generates structured AI fundamental, financial, and technical analysis for an NSE stock"""
    user_id = get_user_id_from_header(x_user_id)
    try:
        res = await ai_orchestrator.analyze_stock(
            symbol=req.symbol,
            user_id=user_id,
            exchange=req.exchange,
            force_refresh=req.force_refresh,
        )
        return res
    except AIException as e:
        logger.warning(f"AIException in /stock-analysis: {e.code} - {e.message}")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": e.code, "message": e.message}},
        )
    except Exception as e:
        logger.error(f"Unexpected error in /stock-analysis: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_GENERATION_FAILED",
                    "message": "An unexpected error occurred while generating AI analysis. Please try again later.",
                },
            },
        )


@router.post("/peer-comparison")
async def compare_peers(
    req: PeerComparisonRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Dict[str, Any]:
    """Performs deep comparative analysis across 2 to 5 peer companies in the same sector"""
    user_id = get_user_id_from_header(x_user_id)
    try:
        res = await ai_orchestrator.compare_peers(
            symbols=req.symbols,
            user_id=user_id,
            exchange=req.exchange,
            force_refresh=req.force_refresh,
        )
        return res
    except AIException as e:
        logger.warning(f"AIException in /peer-comparison: {e.code} - {e.message}")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": e.code, "message": e.message}},
        )
    except Exception as e:
        logger.error(f"Unexpected error in /peer-comparison: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_GENERATION_FAILED",
                    "message": "Failed to compare peer companies. Please try again later.",
                },
            },
        )


@router.post("/sentiment")
async def analyze_sentiment(
    req: SentimentRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Dict[str, Any]:
    """Analyzes real-time news headlines to determine objective market sentiment and reasoning"""
    user_id = get_user_id_from_header(x_user_id)
    try:
        res = await ai_orchestrator.analyze_sentiment(
            symbol=req.symbol,
            user_id=user_id,
            headline=req.headline,
            force_refresh=req.force_refresh,
        )
        return res
    except AIException as e:
        logger.warning(f"AIException in /sentiment: {e.code} - {e.message}")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": e.code, "message": e.message}},
        )
    except Exception as e:
        logger.error(f"Unexpected error in /sentiment: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_GENERATION_FAILED",
                    "message": "Failed to analyze news sentiment. Please try again later.",
                },
            },
        )


@router.post("/education")
async def get_education(
    req: EducationRequest,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Dict[str, Any]:
    """Generates beginner-friendly trading concept lessons, real-world examples, and interactive quizzes"""
    user_id = get_user_id_from_header(x_user_id)
    try:
        res = await ai_orchestrator.get_education(
            topic=req.topic,
            user_id=user_id,
            difficulty=req.difficulty,
        )
        return res
    except AIException as e:
        logger.warning(f"AIException in /education: {e.code} - {e.message}")
        return JSONResponse(
            status_code=e.status_code,
            content={"success": False, "error": {"code": e.code, "message": e.message}},
        )
    except Exception as e:
        logger.error(f"Unexpected error in /education: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": {
                    "code": "AI_GENERATION_FAILED",
                    "message": "Failed to load educational module. Please try again later.",
                },
            },
        )


@router.get("/usage")
async def get_ai_usage(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
) -> Dict[str, Any]:
    """Returns current user's daily free AI quotas, remaining requests, and reset information"""
    user_id = get_user_id_from_header(x_user_id)
    usage = await DatabaseService.get_user_daily_ai_usage(user_id)
    return {
        "success": True,
        "data": {
            "stocksRemaining": usage.get("stocks_remaining", usage.get("remaining_heavy", 0)),
            "stocksLimit": usage.get("stocks_limit", settings.AI_STOCKS_DAILY_LIMIT),
            "stocksUsedToday": usage.get("stocks_used_count", 0),
            "analyzedStocksToday": usage.get("analyzed_stocks", []),
            "heavyRemaining": usage.get("stocks_remaining", usage.get("remaining_heavy", 0)),
            "heavyLimit": usage.get("stocks_limit", settings.AI_STOCKS_DAILY_LIMIT),
            "heavyUsedToday": usage.get("stocks_used_count", 0),
            "lightRemaining": usage["remaining_light"],
            "lightLimit": usage["light_limit"],
            "lightUsedToday": usage["light_count"],
            "resetInfo": "Free daily AI quota allows up to 5 unique stocks per day, resetting at midnight UTC (05:30 AM IST). Viewing previously analyzed stocks is always free & unlimited.",
        },
    }
