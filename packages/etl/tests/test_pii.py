import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.main import detect_pii, Record, app
from fastapi.testclient import TestClient

def test_detect_pii():
    assert detect_pii(Record(name='Bob', ssn='123'))
    assert not detect_pii(Record(name='Alice'))

def test_ingest_json_license():
    client = TestClient(app)
    resp = client.post('/ingest-json', json={'name': 'Bob', 'license': 'CC-BY'})
    assert resp.json()['license'] == 'CC-BY'
