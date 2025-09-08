"""
FastAPI API smoke tests to verify basic endpoints respond and shapes match expectations.
These tests avoid external dependencies by relying on mock data (USE_REAL_YAHOO_API=false).
"""
import os
import pytest
from fastapi.testclient import TestClient

# Set environment before any imports
os.environ["USE_REAL_YAHOO_API"] = "false"
os.environ["DATABASE_URL"] = "sqlite:///test.db"
# Disable performance middleware compression for tests to avoid StreamingResponse issues
os.environ["MIDDLEWARE_RESPONSE_COMPRESSION_ENABLED"] = "false"

from src.main import app  # noqa: E402


client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body.get("message")


def test_get_stock_info_mock():
    r = client.get("/api/stocks/7203")
    assert r.status_code == 200
    data = r.json()
    assert data["stock_code"] == "7203"
    assert "company_name" in data


def test_get_current_price_mock():
    r = client.get("/api/stocks/7203/current")
    assert r.status_code == 200
    data = r.json()
    assert data["stock_code"] == "7203"
    assert "current_price" in data


def test_get_history_default_mock():
    r = client.get("/api/stocks/7203/history")
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    if items:
        assert items[0]["stock_code"] == "7203"
