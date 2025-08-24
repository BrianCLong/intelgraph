# GNN Methodology

This document describes the GraphSAGE-based approach used in the demo
GML service. The encoder computes node embeddings via mean aggregation of
neighbor features and supports link prediction and node classification
tasks through simple MLP heads.

Training routines are implemented in `packages/gml/tasks` and demonstrate
negative sampling for link prediction and cross-entropy optimization for
node classification.
