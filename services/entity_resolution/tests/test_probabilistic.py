from datetime import datetime

from services.entity_resolution.matchers import probabilistic_match
from services.entity_resolution.models import Record


def test_probabilistic_link() -> None:
    now = datetime.utcnow()
    rec = Record(
        id="1",
        name="John Doe",
        address="123 Main St",
        latitude=40.0,
        longitude=-70.0,
        timestamp=now,
    )
    cand = Record(
        id="2",
        name="Jon Doe",
        address="123 Main Street",
        latitude=40.1,
        longitude=-70.1,
        timestamp=now,
    )
    result = probabilistic_match("default", rec, cand)
    assert result["decision"] in {"merge", "link"}
    assert result["score"] > 0
