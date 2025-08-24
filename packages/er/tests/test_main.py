from fastapi.testclient import TestClient
import importlib.util, sys, pathlib

MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / 'src'
sys.path.append(str(MODULE_PATH))
from main import app

def test_health():
    client = TestClient(app)
    resp = client.get('/health')
    assert resp.json()['status'] == 'ok'
