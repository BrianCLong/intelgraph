import sys
import pathlib
from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / 'src'))
from main import app

client = TestClient(app)

def test_full_pipeline(tmp_path):
  sample = tmp_path / 'sample.txt'
  sample.write_text('Alice emailed bob@example.com about the project.')
  with sample.open('rb') as f:
    res = client.post('/doc/upload', files={'file': ('sample.txt', f, 'text/plain')})
  doc_id = res.json()['documentId']

  res = client.post('/ner/run', json={'documentId': doc_id})
  entities = res.json()['entities']
  assert any(e['type'] == 'EMAIL' for e in entities)

  res = client.post('/search', json={'q': 'Alice'})
  hits = res.json()['hits']
  assert hits and hits[0]['documentId'] == doc_id

  res = client.post('/redact/apply', json={'documentId': doc_id})
  assert res.json()['count'] == 1

  res = client.post('/package/export', json={'documentId': doc_id})
  assert res.json()['size'] > 0
