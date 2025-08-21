from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import List, Dict, Any


class RagEngine:
    """Simple SQLite FTS based retrieval engine."""

    def __init__(self, db_path: str = ":memory:") -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS documents USING fts5(doc_id UNINDEXED, content)"
        )

    def add_document(self, doc_id: str, content: str) -> None:
        self.conn.execute(
            "INSERT INTO documents(doc_id, content) VALUES (?, ?)", (doc_id, content)
        )
        self.conn.commit()

    def load_directory(self, directory: Path) -> None:
        for path in directory.glob("*.txt"):
            self.add_document(path.name, path.read_text(encoding="utf-8"))

    def search(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        cur = self.conn.execute(
            "SELECT doc_id, content FROM documents WHERE documents MATCH ? LIMIT ?",
            (query, limit),
        )
        results = []
        for row in cur.fetchall():
            content = row["content"]
            idx = content.lower().find(query.lower())
            if idx == -1:
                idx = 0
            snippet = content[max(0, idx - 30) : idx + 30]
            results.append(
                {
                    "doc_id": row["doc_id"],
                    "snippet": snippet,
                    "start": idx,
                    "end": idx + len(query),
                }
            )
        return results
