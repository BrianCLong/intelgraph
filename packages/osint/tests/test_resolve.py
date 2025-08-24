import pathlib
import sys

from fastapi.testclient import TestClient

# Ensure the service src path is importable
sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import app  # type: ignore  # noqa: E402


def test_resolve_url():
    client = TestClient(app)
    resp = client.post('/resolve/url', json={'raw': 'http://short.local/a'})
    assert resp.status_code == 200
    data = resp.json()
    assert data['expanded'] == 'http://example.com/article'
    assert data['redirects'] == ['http://example.com/article']
