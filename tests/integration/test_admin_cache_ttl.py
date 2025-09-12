"""
Admin TTL update API test.
"""

import os

from fastapi.testclient import TestClient

os.environ.setdefault("USE_REAL_YAHOO_API", "false")
os.environ["ADMIN_TOKEN"] = "test-token"

from src.main import app  # noqa: E402

client = TestClient(app)


def test_update_cache_ttls_admin():
    r = client.post(
        "/api/admin/cache/ttl",
        json={"current_price_ttl": 15.0},
        headers={"X-Admin-Token": "test-token"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["applied"]["current_price_ttl"] == 15.0
