import entity_resolution as er
import pytest


def test_explain_all_features_match():
    a = {
        "email": "a@example.com",
        "phone": "123",
        "name": "Alice",
        "dob": "1990-01-01",
        "lat": 0,
        "lon": 0,
    }
    b = {
        "email": "a@example.com",
        "phone": "123",
        "name": "Alice",
        "dob": "1990-01-01",
        "lat": 0,
        "lon": 0,
    }
    result = er.explain(a, b)
    assert result["features"]["email_match"] == 1.0
    assert result["features"]["phone_match"] == 1.0
    assert result["features"]["name_dob_similarity"] == 1.0
    assert result["features"]["geo_proximity"] == 1.0
    assert result["score"] == pytest.approx(1.0)


def test_explain_no_features_match():
    a = {
        "email": "a@example.com",
        "phone": "123",
        "name": "Alice",
        "dob": "1990-01-01",
        "lat": 0,
        "lon": 0,
    }
    b = {
        "email": "b@example.com",
        "phone": "999",
        "name": "Bob",
        "dob": "1980-01-01",
        "lat": 10,
        "lon": 10,
    }
    result = er.explain(a, b)
    assert result["features"]["email_match"] == 0.0
    assert result["features"]["phone_match"] == 0.0
    assert result["features"]["name_dob_similarity"] == 0.0
    assert result["features"]["geo_proximity"] == 0.0
    assert result["score"] == 0.0
