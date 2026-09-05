from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "AbhyasTrade"
    API_V1_STR: str = "/api"
    
    # Supabase Configuration (Optional - falls back to local async SQLite if not configured)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    
    # Virtual Trading Defaults
    VIRTUAL_INITIAL_CASH: float = 1000000.0  # ₹10,00,000 baseline
    DEFAULT_USER_ID: str = "00000000-0000-0000-0000-000000000001"
    
    # Market Data
    NSE_REFRESH_INTERVAL: float = 1.5  # seconds
    SIMULATION_MODE_AUTO: bool = True  # Auto-fallback to realistic brownian motion ticks off-hours
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        env_file = (
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", ".env"),
            ".env",
            "backend/.env"
        )
        extra = "allow"

settings = Settings()
