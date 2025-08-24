"""OPRF tokenization helpers used for PSI joins."""

from collections.abc import Iterable
from typing import List


def create_tokens(ids: Iterable[str]) -> List[str]:
    """Return deterministic placeholder tokens for identifiers.

    This stub does not implement real cryptography but illustrates the
    interface expected by the federation gateway.
    """
    return [f"token:{value}" for value in ids]
