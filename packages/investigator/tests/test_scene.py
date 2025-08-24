from fastapi.testclient import TestClient
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1] / 'src'))
from main import app

def test_create_and_open():
    client = TestClient(app)
    resp = client.post('/scene/create', json={'title': 'A'})
    assert resp.status_code == 200
    scene = resp.json()
    assert scene['title'] == 'A'
    open_resp = client.post('/scene/open', json={'sceneId': scene['id']})
    assert open_resp.json()['id'] == scene['id']
