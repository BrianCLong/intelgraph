import random

from services.geospatial.main import cluster, ClusterRequest


def test_perf_smoke():
    pts = [[random.random(), random.random()] for _ in range(1000)]
    req = ClusterRequest(points=pts, eps=0.1, min_samples=5)
    res = cluster(req)
    assert "clusters" in res.model_dump()
