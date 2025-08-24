from fastapi.testclient import TestClient
from packages.case.src.main import app

def test_create_and_list_case():
  client = TestClient(app)
  resp = client.post("/cases", json={"title": "Test", "description": "d"})
  assert resp.status_code == 200
  case = resp.json()
  assert case["id"] == 1
  list_resp = client.get("/cases")
  assert list_resp.status_code == 200
  cases = list_resp.json()
  assert len(cases) == 1
  assert cases[0]["title"] == "Test"
