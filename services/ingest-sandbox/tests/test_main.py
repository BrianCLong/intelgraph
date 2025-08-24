import importlib.util
from pathlib import Path
from fastapi.testclient import TestClient

spec = importlib.util.spec_from_file_location(
    'main', Path(__file__).resolve().parent.parent / 'main.py'
)
main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(main)  # type: ignore

client = TestClient(main.app)

def test_validate_mapping():
    resp = client.post('/ingest-sandbox/validate-mapping', json={
        'mapping': {
            'version': '1.0.0',
            'entities': [{ 'type': 'Person', 'fields': { 'id': 'id' } }],
            'relationships': [{ 'type': 'KNOWS', 'from': 'Person', 'to': 'Person' }]
        }
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data['valid'] is True

def test_validate_mapping_errors():
    resp = client.post('/ingest-sandbox/validate-mapping', json={'mapping': {}})
    assert resp.status_code == 200
    data = resp.json()
    assert data['valid'] is False
    assert len(data['errors']) > 0
