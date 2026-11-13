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

logger = logging.getLogger("abhyastrade.ai.groq")


class GroqProvider(BaseAIProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL or "openai/gpt-oss-120b"

    @property
    def provider_name(self) -> str:
        return "groq"

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
            raise AIProviderUnavailableError("Groq API key is not configured")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except httpx.TimeoutException:
                logger.error("Groq request timed out after 25s")
                raise AIProviderUnavailableError("Groq request timed out")
            except Exception as e:
                logger.error(f"Groq connection error: {e}")
                raise AIProviderUnavailableError(f"Connection to Groq failed: {e}")

        if response.status_code == 429:
            logger.warning("Groq rate limit 429 received")
            raise AIProviderRateLimitedError("Groq rate limit reached")
        elif response.status_code in (401, 403):
            logger.error(f"Groq authentication failed ({response.status_code})")
            raise AIException(
                "Groq API key authentication failed",
                code="AI_PROVIDER_AUTH_FAILED",
                status_code=502,
            )
        elif response.status_code >= 500:
            logger.error(f"Groq server error {response.status_code}")
            raise AIProviderUnavailableError(
                f"Groq server error ({response.status_code})"
            )
        elif response.status_code != 200:
            logger.error(
                f"Groq unexpected status {response.status_code}: {response.text}"
            )
            raise AIProviderUnavailableError(f"Groq error: {response.text[:200]}")

        res_data = response.json()
        try:
            choices = res_data.get("choices", [])
            if not choices:
                raise AIResponseInvalidError("No choices returned from Groq")

            raw_text = choices[0].get("message", {}).get("content", "")
            if not raw_text.strip():
                raise AIResponseInvalidError("Empty text received from Groq")

            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)

            parsed = json.loads(cleaned)
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Groq JSON parse failed: {e}. Raw text: {raw_text[:200]}")
            raise AIResponseInvalidError("Groq output was not valid JSON")
