from __future__ import annotations

from typing import List

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer


class TextEmbedder:
    """Simple TF-IDF + SVD embedder used as fallback when no ONNX model is available."""

    def __init__(self, dim: int = 384):
        self.dim = dim
        self.vectorizer = TfidfVectorizer()
        self.svd: TruncatedSVD | None = None
        self._fitted = False

    def fit(self, texts: List[str]) -> None:
        tfidf = self.vectorizer.fit_transform(texts)
        self.svd = TruncatedSVD(n_components=min(self.dim, tfidf.shape[1] - 1))
        self.svd.fit(tfidf)
        self._fitted = True

    def embed(self, texts: List[str]) -> np.ndarray:
        if not self._fitted:
            self.fit(texts)
        tfidf = self.vectorizer.transform(texts)
        if self.svd:
            return self.svd.transform(tfidf)
        return tfidf.toarray()
