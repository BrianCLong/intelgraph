from __future__ import annotations

import json
import sqlite3
from typing import Any


class FeatureStore:
    """Abstract feature store interface."""

    def save(
        self, record_id: str, features: dict[str, Any]
    ) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    def get(self, record_id: str) -> dict[str, Any] | None:  # pragma: no cover - interface
        raise NotImplementedError


class SQLiteFeatureStore(FeatureStore):
    """Lightweight SQLite-backed feature store."""

    def __init__(self, path: str = "er_features.db") -> None:
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.execute("CREATE TABLE IF NOT EXISTS features (id TEXT PRIMARY KEY, data TEXT)")

    def save(self, record_id: str, features: dict[str, Any]) -> None:
        payload = json.dumps(features)
        with self.conn:
            self.conn.execute(
                "REPLACE INTO features (id, data) VALUES (?, ?)", (record_id, payload)
            )

    def get(self, record_id: str) -> dict[str, Any] | None:
        cur = self.conn.execute("SELECT data FROM features WHERE id = ?", (record_id,))
        row = cur.fetchone()
        if row:
            return json.loads(row[0])
        return None


__all__ = ["FeatureStore", "SQLiteFeatureStore"]
