from datetime import datetime, timedelta, timezone

from pipeline.hotspots import compute_hotspots


def test_compute_hotspots_orders_by_score():
    now = datetime.now(timezone.utc)
    points = [
        {"lat": 0.0, "lon": 0.0, "ts": (now - timedelta(minutes=5)).isoformat()},
        {"lat": 0.0, "lon": 0.0, "ts": (now - timedelta(minutes=15)).isoformat()},
        {"lat": 1.0, "lon": 1.0, "ts": (now - timedelta(minutes=5)).isoformat()},
    ]
    cells = compute_hotspots(points, res=5, half_life_mins=60)
    assert cells[0]["score"] >= cells[1]["score"]
    assert len(cells) == 2
