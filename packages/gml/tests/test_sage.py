import torch

from gml.models.sage import GraphSAGEConfig, GraphSAGE
from gml.tasks.link_pred import LinkPredConfig, train_link_pred
from gml.tasks.node_cls import NodeClsConfig, train_node_cls


def build_chain_graph(num_nodes: int = 4):
    neigh = [[] for _ in range(num_nodes)]
    edges = []
    for i in range(num_nodes - 1):
        neigh[i].append(i + 1)
        neigh[i + 1].append(i)
        edges.append((i, i + 1))
    features = torch.eye(num_nodes, dtype=torch.float32)
    return features, neigh, edges


def test_graphsage_forward():
    features, neigh, _ = build_chain_graph()
    model = GraphSAGE(GraphSAGEConfig(in_dim=4, hidden_dim=8, num_layers=2))
    out = model(features, neigh)
    assert out.shape == (4, 8)


def test_link_prediction_training():
    features, neigh, edges = build_chain_graph()
    cfg = LinkPredConfig(GraphSAGEConfig(in_dim=4, hidden_dim=8, num_layers=1), epochs=100)
    encoder, predictor = train_link_pred(features, neigh, edges, cfg)
    z = encoder(features, neigh)
    pos_score = predictor(z, [edges[0]])[0].item()
    neg_score = predictor(z, [(0, 3)])[0].item()
    assert pos_score > neg_score


def test_node_classification_training():
    features, neigh, _ = build_chain_graph()
    labels = torch.tensor([0, 0, 1, 1], dtype=torch.long)
    cfg = NodeClsConfig(GraphSAGEConfig(in_dim=4, hidden_dim=8, num_layers=1), epochs=100)
    encoder, classifier = train_node_cls(features, neigh, labels, cfg)
    z = encoder(features, neigh)
    preds = classifier(z).argmax(dim=1)
    accuracy = (preds == labels).float().mean().item()
    assert accuracy >= 0.5
