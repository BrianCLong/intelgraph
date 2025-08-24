import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_chat_flow():
  s = client.post('/session/open', json={'assistantId': 'a1'}).json()
  r = client.post('/chat/send', json={'sessionId': s['id'], 'text': 'show risk'}).json()
  assert r['messages'][1]['citations']
