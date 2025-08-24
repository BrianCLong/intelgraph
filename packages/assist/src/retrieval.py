"""Simple BM25 retrieval over an in-memory corpus."""
from __future__ import annotations

from typing import List, Tuple

from rank_bm25 import BM25Okapi


class Retriever:
    """In-memory BM25 retriever."""

    def __init__(self, corpus: List[str]):
        self.corpus = corpus
        tokenized = [doc.lower().split() for doc in corpus]
        self._bm25 = BM25Okapi(tokenized)

    def search(self, query: str, k: int = 5) -> List[Tuple[str, float]]:
        tokenized_query = query.lower().split()
        scores = self._bm25.get_scores(tokenized_query)
        ranked = sorted(zip(self.corpus, scores), key=lambda x: x[1], reverse=True)
        return ranked[:k]
