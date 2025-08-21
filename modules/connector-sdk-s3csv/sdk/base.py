from __future__ import annotations

from abc import ABC, abstractmethod
from typing import IO, Iterable, Dict, Any


class BaseConnector(ABC):
    """Interface for batch ingestion connectors."""

    @abstractmethod
    def discover(self) -> Iterable[Dict[str, Any]]:
        """Discover available data sources."""
        raise NotImplementedError

    @abstractmethod
    def preview(self, n: int) -> Iterable[Dict[str, Any]]:
        """Return an iterator over a preview of *n* records."""
        raise NotImplementedError

    @abstractmethod
    def ingest(self, stream: IO[str]) -> None:
        """Stream newline-delimited JSON to *stream*."""
        raise NotImplementedError

    @abstractmethod
    def emit(self, path: str) -> None:
        """Emit a manifest JSON file for this connector to *path*."""
        raise NotImplementedError
