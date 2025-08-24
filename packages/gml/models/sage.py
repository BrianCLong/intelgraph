"""Minimal GraphSAGE implementation using PyTorch.

This module provides a mean-aggregator GraphSAGE encoder that operates on
an adjacency list representation. It is intentionally lightweight and does
not depend on external graph learning libraries.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence

import torch
from torch import nn
import torch.nn.functional as F


def _mean_aggregate(x: torch.Tensor, neigh_indices: List[Sequence[int]]) -> torch.Tensor:
    """Compute mean of neighbors for each node.

    Args:
        x: Node feature matrix of shape ``(N, F)``.
        neigh_indices: List where ``neigh_indices[i]`` is a sequence of neighbor
            indices for node ``i``.

    Returns:
        Tensor of shape ``(N, F)`` with averaged neighbor features. Nodes with no
        neighbors receive a zero vector.
    """

    device = x.device
    out = torch.zeros_like(x, device=device)
    for i, neigh in enumerate(neigh_indices):
        if len(neigh) == 0:
            continue
        neigh_feat = x[torch.tensor(list(neigh), device=device)]
        out[i] = neigh_feat.mean(dim=0)
    return out


class GraphSAGELayer(nn.Module):
    """Single GraphSAGE layer with mean aggregation."""

    def __init__(self, in_dim: int, out_dim: int) -> None:
        super().__init__()
        self.linear = nn.Linear(in_dim * 2, out_dim)

    def forward(self, x: torch.Tensor, neigh: List[Sequence[int]]) -> torch.Tensor:
        neigh_mean = _mean_aggregate(x, neigh)
        h = torch.cat([x, neigh_mean], dim=1)
        return F.relu(self.linear(h))


@dataclass
class GraphSAGEConfig:
    in_dim: int
    hidden_dim: int = 64
    num_layers: int = 2


class GraphSAGE(nn.Module):
    """Simple multi-layer GraphSAGE encoder."""

    def __init__(self, cfg: GraphSAGEConfig) -> None:
        super().__init__()
        layers = []
        in_dim = cfg.in_dim
        for _ in range(cfg.num_layers):
            layers.append(GraphSAGELayer(in_dim, cfg.hidden_dim))
            in_dim = cfg.hidden_dim
        self.layers = nn.ModuleList(layers)

    def forward(self, x: torch.Tensor, neigh: List[Sequence[int]]) -> torch.Tensor:
        for layer in self.layers:
            x = layer(x, neigh)
        return x


class LinkPredictor(nn.Module):
    """MLP link predictor over GraphSAGE embeddings."""

    def __init__(self, emb_dim: int, hidden_dim: int = 64) -> None:
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(emb_dim * 4, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, 1),
        )

    def forward(self, z: torch.Tensor, edges: Iterable[tuple[int, int]]) -> torch.Tensor:
        feats = []
        for u, v in edges:
            zu, zv = z[u], z[v]
            feats.append(torch.cat([torch.abs(zu - zv), zu * zv, zu, zv]))
        x = torch.stack(feats)
        return self.mlp(x).squeeze(-1)


class NodeClassifier(nn.Module):
    """Softmax classifier over node embeddings."""

    def __init__(self, emb_dim: int, num_classes: int) -> None:
        super().__init__()
        self.lin = nn.Linear(emb_dim, num_classes)

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        return self.lin(z)
