import hashlib
import json
from typing import Any


def compute_hash(value: Any) -> str:
    """Compute deterministic SHA-256 hash of a value.

    Handles dicts/lists by JSON serializing with sorted keys, normalizes newlines,
    and ensures consistent UTF-8 encoding. Bytes and strings are supported.
    """
    if isinstance(value, (dict, list)):
        canonical = json.dumps(value, sort_keys=True, ensure_ascii=False)
    elif isinstance(value, bytes):
        canonical = value.decode("utf-8")
    else:
        canonical = str(value)
    canonical = canonical.replace("\r\n", "\n").encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()
