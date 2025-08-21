from datetime import datetime
from time import perf_counter

from services.entity_resolution.matchers import probabilistic_match
from services.entity_resolution.models import Record


def test_performance_1k_under_2s() -> None:
    now = datetime.utcnow()
    record = Record(
        id="seed",
        name="Seed Name",
        address="500 Seed Ave",
        latitude=40.0,
        longitude=-70.0,
        timestamp=now,
    )
    candidates = [
        Record(
            id=str(i),
            name=f"Candidate {i}",
            address="500 Seed Ave",
            latitude=40.0 + i * 0.001,
            longitude=-70.0 - i * 0.001,
            timestamp=now,
        )
        for i in range(1000)
    ]
    start = perf_counter()
    for cand in candidates:
        probabilistic_match("default", record, cand)
    duration = perf_counter() - start
    assert duration < 2
