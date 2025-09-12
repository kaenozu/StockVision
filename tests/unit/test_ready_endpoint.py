from fastapi.testclient import TestClient

from src.main import app


def test_ready_endpoint_returns_ready_and_latency():
    client = TestClient(app)
    res = client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ready"
    assert isinstance(data.get("db_ping_ms"), (int, float))
