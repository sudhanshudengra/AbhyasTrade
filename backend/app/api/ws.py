import asyncio
import json
import logging
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.nse_feed import market_feed
from app.services.order_matcher import order_matcher

logger = logging.getLogger("abhyastrade.ws")

router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/market")
async def websocket_market_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/market")
    
    # Send initial snapshot of all symbols
    initial_snapshot = {
        "type": "SNAPSHOT",
        "data": list(market_feed.market_cache.values())
    }
    await websocket.send_json(initial_snapshot)
    
    # Subscribe to feed queue
    queue = market_feed.subscribe()
    
    async def listen_client():
        try:
            while True:
                msg = await websocket.receive_text()
                # Respond to client ping with pong
                if msg == "ping":
                    await websocket.send_text("pong")
        except Exception:
            pass

    client_task = asyncio.create_task(listen_client())
    
    try:
        while True:
            try:
                # Wait for next tick update payload with 4s timeout for heartbeat
                payload = await asyncio.wait_for(queue.get(), timeout=4.0)
            except asyncio.TimeoutError:
                # Heartbeat snapshot when queue has no tick diffs
                payload = {
                    "type": "SNAPSHOT",
                    "data": list(market_feed.market_cache.values()),
                    "timestamp": int(time.time()) if 'time' in globals() else 0
                }
            
            # Match pending orders on every tick update / heartbeat
            try:
                await order_matcher.match_all_pending_orders()
            except Exception as e:
                logger.error(f"Error matching pending orders in WS loop: {e}")
                
            await websocket.send_json(payload)
            
    except (WebSocketDisconnect, asyncio.CancelledError):
        logger.info("WebSocket client disconnected from /ws/market")
    except Exception as e:
        logger.debug(f"WebSocket connection closed: {e}")
    finally:
        client_task.cancel()
        market_feed.unsubscribe(queue)
