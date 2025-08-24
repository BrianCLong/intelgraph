from fastapi.testclient import TestClient

from services.geospatial.main import app, EVENTS

client = TestClient(app)


def test_geofence_point_in_polygon():
    req = {
        "point": [0.5, 0.5],
        "fences": [[[0, 0], [1, 0], [1, 1], [0, 1]]],
    }
    res = client.post("/geo/geofence/check", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["inside"] is True
    assert data["fences"] == [0]
    assert ("alerts.geo.v1", {"fence": 0, "event": "enter"}) in EVENTS


def test_cluster_dbscan():
    req = {
        "points": [[0, 0], [0.01, 0], [1, 1], [10, 10]],
        "eps": 0.05,
        "min_samples": 1,
    }
    res = client.post("/geo/cluster", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["stats"]["clusters"] == 3


def test_trajectory_stitching():
    req = {
        "points": [
            {"lon": 0, "lat": 0, "ts": 0},
            {"lon": 1, "lat": 1, "ts": 10},
            {"lon": 2, "lat": 2, "ts": 100},
        ],
        "gap_threshold": 50,
    }
    res = client.post("/geo/trajectory", json=req)
    assert res.status_code == 200
    data = res.json()
    assert len(data["tracks"]) == 2
    assert data["gaps"] == [2]
