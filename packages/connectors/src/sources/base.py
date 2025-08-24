from __future__ import annotations

"""Connector source SDK.

This is a very small portion of the envisioned SDK.  Sources implement two
methods: ``discover`` which inspects available streams and ``read_full`` which
returns an iterator of records.  Incremental/CDC is omitted for brevity.
"""

from typing import Dict, Iterable, Iterator, List


class BaseSource:
    """Base class for sources."""

    def __init__(self, config: Dict[str, str]) -> None:
        self.config = config

    def discover(self) -> List[Dict[str, str]]:
        """Return a list of stream definitions."""
        raise NotImplementedError

    def read_full(self, stream: Dict[str, str]) -> Iterator[Dict[str, str]]:
        """Yield dictionaries for each record in the stream."""
        raise NotImplementedError
