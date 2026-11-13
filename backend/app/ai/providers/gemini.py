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

logger = logging.getLogger("abhyastrade.ai.gemini")


class GeminiProvider(BaseAIProvider):
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL or "gemini-2.5-flash"

    @property
    def provider_name(self) -> str:
        return "gemini"

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
            raise AIProviderUnavailableError("Gemini API key is not configured")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=35.0) as client:
            try:
                response = await client.post(url, json=payload)
            except httpx.TimeoutException:
                logger.error("Gemini request timed out after 35s")
                raise AIProviderUnavailableError("Google Gemini request timed out")
            except Exception as e:
                logger.error(f"Gemini connection error: {e}")
                raise AIProviderUnavailableError(
                    f"Connection to Google Gemini failed: {e}"
                )

        if response.status_code == 429:
            logger.warning("Gemini rate limit 429 received")
            raise AIProviderRateLimitedError("Google Gemini rate limit reached")
        elif response.status_code in (401, 403):
            logger.error(f"Gemini authentication failed ({response.status_code})")
            raise AIException(
                "Gemini API key authentication failed",
                code="AI_PROVIDER_AUTH_FAILED",
                status_code=502,
            )
        elif response.status_code >= 500:
            logger.error(f"Gemini server error {response.status_code}")
            raise AIProviderUnavailableError(
                f"Google Gemini server error ({response.status_code})"
            )
        elif response.status_code != 200:
            logger.error(
                f"Gemini unexpected status {response.status_code}: {response.text}"
            )
            raise AIProviderUnavailableError(
                f"Google Gemini error: {response.text[:200]}"
            )

        res_data = response.json()
        try:
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise AIResponseInvalidError("No candidates returned from Gemini")

            raw_text = (
                candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            )
            if not raw_text.strip():
                raise AIResponseInvalidError("Empty text received from Gemini")

            # Clean any possible markdown fences
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned)

            parsed = json.loads(cleaned)
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Gemini JSON parse failed: {e}. Raw text: {raw_text[:200]}")
            raise AIResponseInvalidError("Gemini output was not valid JSON")
