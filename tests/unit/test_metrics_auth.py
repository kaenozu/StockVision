import base64
import os
from importlib import reload


def test_metrics_requires_basic_auth_when_enabled(monkeypatch):
    os.environ["ENABLE_METRICS"] = "true"
    os.environ["METRICS_BASIC_AUTH"] = "user:pass"

    from src import main as main_mod
    reload(main_mod)

    from fastapi.testclient import TestClient

    client = TestClient(main_mod.app)

    # Unauthorized
    res = client.get("/metrics")
    assert res.status_code == 401
    assert res.headers.get("www-authenticate", "").lower().startswith("basic")

    # Authorized
    token = base64.b64encode(b"user:pass").decode("ascii")
    res2 = client.get("/metrics", headers={"Authorization": f"Basic {token}"})
    assert res2.status_code == 200
    assert "http_requests_total" in res2.text

