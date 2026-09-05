import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.services.nse_feed import market_feed
from app.services.squareoff import auto_squareoff_service
from app.api import market, orders, portfolio, charges, ws

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("abhyastrade")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing AbhyasTrade Backend...")
    await init_db()
    
    tick_task = asyncio.create_task(market_feed.update_tick_loop())
    squareoff_task = asyncio.create_task(auto_squareoff_service.schedule_loop())
    
    yield
    
    # Shutdown
    logger.info("Shutting down background tasks...")
    market_feed.is_running = False
    auto_squareoff_service.is_running = False
    tick_task.cancel()
    squareoff_task.cancel()
    try:
        await asyncio.gather(tick_task, squareoff_task, return_exceptions=True)
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Real-Time Virtual Trading Platform tailored to Indian Equity Market (NSE)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(market.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(portfolio.router, prefix=settings.API_V1_STR)
app.include_router(charges.router, prefix=settings.API_V1_STR)
app.include_router(ws.router)

@app.get("/")
async def root():
    return {
        "app": "AbhyasTrade Virtual Trading API",
        "status": "ONLINE",
        "market": "NSE (National Stock Exchange of India)",
        "cached_symbols_count": len(market_feed.market_cache),
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
