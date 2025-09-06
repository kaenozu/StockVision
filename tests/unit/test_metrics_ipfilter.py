import base64
import os
from importlib import reload


def _client(app):
    from fastapi.testclient import TestClient

    return TestClient(app)


def test_metrics_ip_allowlist_allows_matching_ip(monkeypatch):
    os.environ["ENABLE_METRICS"] = "true"
    os.environ["METRICS_ALLOW_CIDRS"] = "127.0.0.1/32, ::1"
    # no auth
    os.environ.pop("METRICS_BASIC_AUTH", None)

    from src import main as main_mod
    reload(main_mod)

    client = _client(main_mod.app)

    # Provide X-Forwarded-For to match allowlist
    res = client.get("/metrics", headers={"X-Forwarded-For": "127.0.0.1"})
    assert res.status_code == 200
    assert "http_requests_total" in res.text


def test_metrics_ip_allowlist_blocks_non_matching_ip(monkeypatch):
    os.environ["ENABLE_METRICS"] = "true"
    os.environ["METRICS_ALLOW_CIDRS"] = "10.0.0.0/8"
    os.environ.pop("METRICS_BASIC_AUTH", None)

    from src import main as main_mod
    reload(main_mod)

    client = _client(main_mod.app)
    # IP not allowed
    res = client.get("/metrics", headers={"X-Forwarded-For": "1.2.3.4"})
    assert res.status_code == 403

