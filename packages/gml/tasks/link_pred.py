"""Training routine for link prediction using GraphSAGE."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence, Iterable

import random
import torch
from torch import nn

from ..models.sage import GraphSAGE, GraphSAGEConfig, LinkPredictor


def _negative_samples(num_nodes: int, pos: Iterable[tuple[int, int]], k: int) -> List[tuple[int, int]]:
    pos_set = {tuple(sorted(e)) for e in pos}
    neg = set()
    while len(neg) < k:
        u = random.randrange(num_nodes)
        v = random.randrange(num_nodes)
        if u == v:
            continue
        e = tuple(sorted((u, v)))
        if e in pos_set or e in neg:
            continue
        neg.add(e)
    return list(neg)


@dataclass
class LinkPredConfig:
    sage: GraphSAGEConfig
    lr: float = 0.01
    epochs: int = 50


def train_link_pred(
    features: torch.Tensor,
    neigh: List[Sequence[int]],
    pos_edges: List[tuple[int, int]],
    cfg: LinkPredConfig,
) -> tuple[GraphSAGE, LinkPredictor]:
    """Train link predictor; returns encoder and predictor models."""

    num_nodes = features.size(0)
    encoder = GraphSAGE(cfg.sage)
    predictor = LinkPredictor(cfg.sage.hidden_dim)
    opt = torch.optim.Adam(list(encoder.parameters()) + list(predictor.parameters()), lr=cfg.lr)
    criterion = nn.BCEWithLogitsLoss()

    pos_edges = [tuple(map(int, e)) for e in pos_edges]

    for _ in range(cfg.epochs):
        neg_edges = _negative_samples(num_nodes, pos_edges, len(pos_edges))
        all_edges = pos_edges + neg_edges
        labels = torch.tensor([1] * len(pos_edges) + [0] * len(neg_edges), dtype=torch.float32)

        z = encoder(features, neigh)
        logits = predictor(z, all_edges)
        loss = criterion(logits, labels)

        opt.zero_grad()
        loss.backward()
        opt.step()

    return encoder, predictor
