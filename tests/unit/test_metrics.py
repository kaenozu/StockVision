import os
from importlib import reload

import pytest


@pytest.mark.skip(
    reason="Metrics endpoint not implemented in current application version"
)
def test_metrics_endpoint_enabled(monkeypatch):
    # Enable metrics via env
    os.environ["ENABLE_METRICS"] = "true"

    # Reload app to pick env
    from src import main as main_mod

    reload(main_mod)

    from fastapi.testclient import TestClient

    client = TestClient(main_mod.app)

    # Trigger at least one request so counters increment
    client.get("/")

    res = client.get("/metrics")
    assert res.status_code == 200
    text = res.text
    # Should include our metric family names when enabled
    assert "http_requests_total" in text
    assert "http_request_duration_seconds" in text
