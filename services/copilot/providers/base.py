from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Dict, Tuple


class BaseProvider(ABC):
    """Abstract interface for LLM providers used by the copilot service."""

    @abstractmethod
    async def translate(self, text: str) -> Tuple[str, Dict[str, str], str, str]:
        """
        Translate natural language into a query.

        Returns a tuple of (query, parameter_hints, explanation, query_type)
        where ``query_type`` is either ``"cypher"`` or ``"graphql"``.
        """


def get_provider(name: str) -> BaseProvider:
    if name == "mock":
        from .mock import MockProvider

        return MockProvider()
    if name in {"openai", "ollama"}:
        raise NotImplementedError(f"Provider '{name}' is not implemented")
    raise ValueError(f"Unknown provider '{name}'")
