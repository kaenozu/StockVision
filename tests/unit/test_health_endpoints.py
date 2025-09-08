from fastapi.testclient import TestClient

from src.main import app


def test_live_endpoints():
    client = TestClient(app)
    r1 = client.get("/live")
    assert r1.status_code == 200
    assert r1.json().get("status") in {"alive", "ok", "ready"}

    r2 = client.get("/api/live")
    assert r2.status_code == 200
    assert r2.json().get("status") in {"alive", "ok", "ready"}

