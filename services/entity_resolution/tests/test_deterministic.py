from datetime import date

from services.entity_resolution.matchers import deterministic_match
from services.entity_resolution.models import Record


def test_email_match() -> None:
    rec = Record(id="1", email="a@test.com")
    cand = Record(id="2", email="a@test.com")
    result = deterministic_match(rec, cand)
    assert result is not None
    assert result["decision"] == "merge"


def test_dob_name_match() -> None:
    rec = Record(id="1", name="Jane Doe", dob=date(1990, 1, 1))
    cand = Record(id="2", name="Jane Doe", dob=date(1990, 1, 1))
    result = deterministic_match(rec, cand)
    assert result is not None
    assert result["decision"] == "merge"


def test_no_match() -> None:
    rec = Record(id="1", email="a@test.com")
    cand = Record(id="2", email="b@test.com")
    assert deterministic_match(rec, cand) is None
