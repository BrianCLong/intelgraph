from services.entity_resolution.metrics import evaluate


def test_evaluation_metrics() -> None:
    metrics = evaluate("services/entity_resolution/data/synthetic.json")
    assert metrics["roc_auc"] >= 0.8
    assert metrics["average_precision"] >= 0.8
