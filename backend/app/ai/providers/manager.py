import asyncio
import logging
import random
from typing import Any, Dict, Optional, Tuple
from app.core.config import settings
from app.ai.providers.base import BaseAIProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.groq import GroqProvider
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.mock import MockProvider
from app.ai.errors import (
    AIException,
    AIProviderRateLimitedError,
    AIProviderUnavailableError,
    AIResponseInvalidError,
)

logger = logging.getLogger("abhyastrade.ai.manager")


class ProviderManager:
    def __init__(self):
        self.gemini = GeminiProvider()
        self.groq = GroqProvider()
        self.openrouter = OpenRouterProvider()
        self.mock = MockProvider()

    def get_provider_chain(self, task_name: str) -> list[BaseAIProvider]:
        """
        Returns an ordered list of providers to attempt for the given task type.
        Heavy tasks: Gemini -> Groq -> OpenRouter (fallback).
        Lightweight tasks: Groq -> Gemini -> OpenRouter (fallback).
        OpenRouter is strictly the final fallback to conserve its daily quota.
        """
        heavy_tasks = {"stock-analysis", "peer-comparison", "financial-analysis"}
        chain = []

        if task_name in heavy_tasks:
            if self.gemini.is_configured():
                chain.append(self.gemini)
            if settings.AI_ENABLE_FALLBACK and self.groq.is_configured():
                chain.append(self.groq)
            if settings.AI_ENABLE_FALLBACK and self.openrouter.is_configured():
                chain.append(self.openrouter)
        else:
            # Lightweight task
            if self.groq.is_configured():
                chain.append(self.groq)
            if settings.AI_ENABLE_FALLBACK and self.gemini.is_configured():
                chain.append(self.gemini)
            if settings.AI_ENABLE_FALLBACK and self.openrouter.is_configured():
                chain.append(self.openrouter)

        # Fallback to mock provider if no real provider is configured
        if not chain:
            chain.append(self.mock)

        return chain

    async def execute_task(
        self,
        task_name: str,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
    ) -> Tuple[Dict[str, Any], str, str]:
        """
        Executes an AI task through the provider chain with exponential backoff on retryable errors.
        Returns: (parsed_json_result, actual_provider_name, actual_model_name)
        """
        providers = self.get_provider_chain(task_name)
        last_error = None

        for index, provider in enumerate(providers):
            provider_name = provider.provider_name
            model_name = provider.model_name
            logger.info(
                f"Attempting task '{task_name}' with provider '{provider_name}' ({model_name})"
            )

            # Max 2 attempts per provider for transient network issues
            max_attempts = 2 if provider_name != "mock" else 1
            for attempt in range(1, max_attempts + 1):
                try:
                    result = await provider.generate_json(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        task_name=task_name,
                        temperature=temperature,
                    )
                    logger.info(
                        f"Task '{task_name}' succeeded via '{provider_name}' on attempt {attempt}"
                    )
                    return result, provider_name, model_name
                except (AIProviderRateLimitedError, AIProviderUnavailableError) as err:
                    last_error = err
                    logger.warning(
                        f"Provider '{provider_name}' error on attempt {attempt}: {err}. "
                        f"Retryable: {attempt < max_attempts or index + 1 < len(providers)}"
                    )
                    if attempt < max_attempts:
                        jitter = random.uniform(0.5, 1.2)
                        await asyncio.sleep(jitter * attempt)
                    break  # Fall back to next provider in chain
                except AIException as err:
                    # Non-retryable error (e.g. auth failure, invalid schema)
                    last_error = err
                    logger.error(
                        f"Provider '{provider_name}' non-retryable error: {err}"
                    )
                    if "AUTH" in err.code:
                        # Skip this provider and try next
                        break
                    raise err
                except Exception as err:
                    last_error = err
                    logger.error(f"Unexpected error in '{provider_name}': {err}")
                    break

        # If all configured providers failed, fall back to MockProvider for continuity if enabled
        if self.mock not in providers:
            logger.warning(
                "All primary AI providers failed. Falling back to MockProvider for continuity."
            )
            try:
                result = await self.mock.generate_json(
                    system_prompt, user_prompt, task_name, temperature
                )
                return result, self.mock.provider_name, self.mock.model_name
            except Exception as e:
                logger.error(f"Mock fallback failed: {e}")

        if last_error:
            raise last_error
        raise AIProviderUnavailableError(
            "All available AI providers failed to process the request."
        )


provider_manager = ProviderManager()
