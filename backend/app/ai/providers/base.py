from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'gemini', 'groq')"""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Configured model identifier"""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the required API key or credentials are present"""
        pass

    @abstractmethod
    async def generate_json(
        self,
        system_prompt: str,
        user_prompt: str,
        task_name: str,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Executes generation against the model and returns a parsed JSON dictionary.
        Must raise an exception on network failure, rate limit, or invalid response.
        """
        pass
