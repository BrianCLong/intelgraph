"""Training routine for node classification using GraphSAGE."""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

import torch
from torch import nn

from ..models.sage import GraphSAGE, GraphSAGEConfig, NodeClassifier


@dataclass
class NodeClsConfig:
    sage: GraphSAGEConfig
    lr: float = 0.01
    epochs: int = 50


def train_node_cls(
    features: torch.Tensor,
    neigh: List[Sequence[int]],
    labels: torch.Tensor,
    cfg: NodeClsConfig,
) -> tuple[GraphSAGE, NodeClassifier]:
    num_nodes = features.size(0)
    encoder = GraphSAGE(cfg.sage)
    classifier = NodeClassifier(cfg.sage.hidden_dim, int(labels.max().item()) + 1)
    opt = torch.optim.Adam(list(encoder.parameters()) + list(classifier.parameters()), lr=cfg.lr)
    criterion = nn.CrossEntropyLoss()

    for _ in range(cfg.epochs):
        z = encoder(features, neigh)
        logits = classifier(z)
        loss = criterion(logits, labels)
        opt.zero_grad()
        loss.backward()
        opt.step()

    return encoder, classifier
