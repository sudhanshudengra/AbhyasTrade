import json
import logging
import re
from typing import Any, Dict
import httpx
from app.core.config import settings
from app.ai.providers.base import BaseAIProvider
from app.ai.errors import (
    AIException,
    AIProviderRateLimitedError,
    AIProviderUnavailableError,
    AIResponseInvalidError,
)

logger = logging.getLogger("abhyastrade.ai.openrouter")


class OpenRouterProvider(BaseAIProvider):
    """
    OpenRouter API Provider used as an emergency tertiary fallback when
    both Google Gemini and Groq are unavailable or rate-limited.
    """

    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL or "nvidia/nemotron-3.5-lightning:free"
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def model_name(self) -> str:
        return self.model

    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        task_name: str,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        if not self.is_configured():
            raise AIProviderUnavailableError("OpenRouter API key is not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key.strip()}",
            "HTTP-Referer": "https://abhyastrade.com",
            "X-Title": "AbhyasTrade Virtual Trading",
            "Content-Type": "application/json",
        }

        json_instructed_system = (
            f"{system_prompt}\n\n"
            "CRITICAL INSTRUCTION: Output ONLY a valid JSON object matching the requested schema. "
            "Do not include any thought process, markdown code fences, or text outside the JSON."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": json_instructed_system},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            try:
                response = await client.post(self.base_url, headers=headers, json=payload)
            except httpx.TimeoutException:
                logger.error("OpenRouter request timed out after 35s")
                raise AIProviderUnavailableError("OpenRouter request timed out")
            except Exception as e:
                logger.error(f"OpenRouter connection error: {e}")
                raise AIProviderUnavailableError(f"Connection to OpenRouter failed: {e}")

        if response.status_code == 429:
            logger.warning("OpenRouter rate limit 429 received")
            raise AIProviderRateLimitedError("OpenRouter daily limit (10 req/day) reached")
        elif response.status_code in (401, 403):
            logger.error(f"OpenRouter authentication failed ({response.status_code})")
            raise AIException(
                "OpenRouter API key authentication failed",
                code="AI_PROVIDER_AUTH_FAILED",
                status_code=502,
            )
        elif response.status_code >= 500:
            logger.error(f"OpenRouter server error {response.status_code}")
            raise AIProviderUnavailableError(
                f"OpenRouter upstream server error ({response.status_code})"
            )
        elif response.status_code != 200:
            logger.error(
                f"OpenRouter unexpected status {response.status_code}: {response.text}"
            )
            raise AIProviderUnavailableError(f"OpenRouter error: {response.text[:200]}")

        res_data = response.json()
        try:
            choices = res_data.get("choices", [])
            if not choices:
                raise AIResponseInvalidError("No choices returned from OpenRouter")

            raw_text = choices[0].get("message", {}).get("content", "")
            if not raw_text.strip():
                raise AIResponseInvalidError("Empty text received from OpenRouter")

            # Strip markdown code blocks if wrapped
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            # Robust JSON extraction
            match = re.search(r"(\{.*\})", clean_text, re.DOTALL)
            if match:
                clean_text = match.group(1)

            parsed = json.loads(clean_text)
            if not isinstance(parsed, dict):
                raise AIResponseInvalidError("Parsed JSON is not a dictionary")

            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON from OpenRouter: {e}")
            raise AIResponseInvalidError(f"Invalid JSON returned by OpenRouter: {e}")
