from __future__ import annotations

from hashlib import sha256
from typing import Any


def _parent(h1: bytes, h2: bytes) -> bytes:
    """Compute parent hash for two children."""
    return sha256(h1 + h2).digest()


def _merkle_root(leaves: list[bytes]) -> bytes:
    if not leaves:
        return b""
    current = leaves
    while len(current) > 1:
        if len(current) % 2 == 1:
            current.append(current[-1])
        current = [_parent(current[i], current[i + 1]) for i in range(0, len(current), 2)]
    return current[0]


def build_manifest(evidence: list[dict[str, str]]) -> dict[str, Any]:
    """Build a simple manifest with Merkle root over evidence hashes."""
    leaves = [bytes.fromhex(e["hash"]) for e in evidence if e.get("hash")]
    root = _merkle_root(leaves)
    chain = [{"id": e["id"], "hash": e["hash"]} for e in evidence if e.get("hash")]
    return {"version": "1.0", "root": root.hex() if root else "", "chain": chain}
