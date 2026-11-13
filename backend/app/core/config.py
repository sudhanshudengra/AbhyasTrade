from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "AbhyasTrade"
    API_V1_STR: str = "/api"

    # Supabase Configuration (Optional - falls back to local async SQLite if not configured)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None

    # AI Integration Settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"

    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "nvidia/nemotron-3.5-lightning:free"

    AI_DEFAULT_PROVIDER: str = "gemini"
    AI_ENABLE_FALLBACK: bool = True

    # AI Cache TTLs (in seconds)
    AI_CACHE_STOCK_TTL: int = 10800  # 3 hours (refreshes analysis hash every 3 hours)
    AI_CACHE_PEER_TTL: int = 10800  # 3 hours
    AI_CACHE_SENTIMENT_TTL: int = 1800  # 30 minutes
    AI_CACHE_EDUCATION_TTL: int = 2592000  # 30 days

    # AI Rate Limiting & Quotas (per user)
    AI_STOCKS_DAILY_LIMIT: int = 15  # 15 unique stocks per user per day
    AI_USER_DAILY_LIMIT: int = 10  # Lightweight requests (Sentiment, Education)
    AI_HEAVY_DAILY_LIMIT: int = 5  # Legacy fallback
    AI_PER_MINUTE_LIMIT: int = 5
    AI_GLOBAL_CONCURRENCY_LIMIT: int = 10

    # Virtual Trading Defaults
    VIRTUAL_INITIAL_CASH: float = 1000000.0  # ₹10,00,000 baseline
    DEFAULT_USER_ID: str = "00000000-0000-0000-0000-000000000001"

    # Market Data
    NSE_REFRESH_INTERVAL: float = 1.5  # seconds
    SIMULATION_MODE_AUTO: bool = (
        False  # Strictly disabled by default: only real NSE exchange prices used
    )

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = (
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
            ),
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "backend",
                ".env",
            ),
            ".env",
            "backend/.env",
        )
        extra = "allow"


settings = Settings()
