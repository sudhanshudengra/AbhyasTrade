import asyncio
import logging
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger("abhyastrade.ai.single_flight")


class FlightCall:
    def __init__(self):
        self.event = asyncio.Event()
        self.result: Any = None
        self.error: Optional[Exception] = None


class SingleFlightManager:
    """
    Prevents cache stampedes and redundant duplicate AI calls.
    Ensures that for any given cache_key, only one asynchronous call executes at a time;
    all other concurrent requests wait and share the exact same result.
    """

    def __init__(self):
        self._flights: Dict[str, FlightCall] = {}
        self._lock = asyncio.Lock()

    async def execute_or_wait(
        self,
        cache_key: str,
        coro_func: Callable[[], Any],
        timeout: float = 45.0,
    ) -> Any:
        flight = None
        is_leader = False

        async with self._lock:
            if cache_key in self._flights:
                # Another worker is already executing this exact request
                flight = self._flights[cache_key]
                logger.info(
                    f"SingleFlight: Waiter joined in-flight request for key {cache_key[:16]}..."
                )
            else:
                # We are the designated leader responsible for executing the generation
                flight = FlightCall()
                self._flights[cache_key] = flight
                is_leader = True
                logger.info(
                    f"SingleFlight: Leader started execution for key {cache_key[:16]}..."
                )

        if not is_leader:
            # Wait for leader to finish with timeout
            try:
                await asyncio.wait_for(flight.event.wait(), timeout=timeout)
                if flight.error:
                    raise flight.error
                return flight.result
            except asyncio.TimeoutError:
                logger.warning(
                    f"SingleFlight: Waiter timed out waiting for key {cache_key[:16]}"
                )
                raise TimeoutError(
                    "AI generation timed out while waiting for in-flight request"
                )

        # Leader execution block
        try:
            result = await coro_func()
            flight.result = result
            return result
        except Exception as e:
            flight.error = e
            raise e
        finally:
            flight.event.set()
            async with self._lock:
                if cache_key in self._flights and self._flights[cache_key] is flight:
                    del self._flights[cache_key]


single_flight_manager = SingleFlightManager()
