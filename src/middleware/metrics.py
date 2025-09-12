"""
Prometheus metrics middleware and endpoint for FastAPI.

Enable by setting environment variable `ENABLE_METRICS=true`.
Exposes `/metrics` endpoint in Prometheus text format and records
HTTP request counts and latency histograms.
"""

from __future__ import annotations

import os
import time
from typing import Callable

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

try:
    from prometheus_client import (
        CONTENT_TYPE_LATEST,
        Counter,
        Histogram,
        generate_latest,
    )
except Exception:  # pragma: no cover - optional dependency path
    Counter = None  # type: ignore
    Histogram = None  # type: ignore
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"  # type: ignore

    def generate_latest():  # type: ignore
        return b""  # minimal fallback


REQUEST_COUNT = None
REQUEST_LATENCY = None


def _init_metrics():
    global REQUEST_COUNT, REQUEST_LATENCY
    if REQUEST_COUNT is not None:
        return
    if Counter is None or Histogram is None:
        return

    REQUEST_COUNT = Counter(
        "http_requests_total",
        "Total HTTP requests",
        labelnames=("method", "path", "status"),
    )
    REQUEST_LATENCY = Histogram(
        "http_request_duration_seconds",
        "HTTP request latency in seconds",
        labelnames=("method", "path", "status"),
        buckets=(
            0.005,
            0.01,
            0.025,
            0.05,
            0.1,
            0.25,
            0.5,
            1.0,
            2.5,
            5.0,
        ),
    )


def _get_path_template(request: Request) -> str:
    # Use route path template if available to avoid high-cardinality labels
    try:
        route = request.scope.get("route")
        if route and hasattr(route, "path"):
            return route.path or request.url.path
    except Exception:
        pass
    return request.url.path


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if REQUEST_COUNT is None or REQUEST_LATENCY is None:
            return await call_next(request)

        start = time.perf_counter()
        response: Response = await call_next(request)
        duration = time.perf_counter() - start

        path_tmpl = _get_path_template(request)
        method = request.method
        status = str(response.status_code)

        try:
            REQUEST_COUNT.labels(method=method, path=path_tmpl, status=status).inc()
            REQUEST_LATENCY.labels(
                method=method, path=path_tmpl, status=status
            ).observe(duration)
        except Exception:
            # Metrics must never break request handling
            pass

        return response


def setup_metrics(app: FastAPI) -> None:
    """Setup Prometheus metrics if ENABLE_METRICS=true."""
    enabled = os.getenv("ENABLE_METRICS", "false").lower() == "true"
    if not enabled:
        return

    _init_metrics()

    # Add middleware for request metrics
    app.add_middleware(PrometheusMiddleware)

    # Expose /metrics endpoint
    @app.get("/metrics", include_in_schema=False)
    async def metrics_endpoint() -> Response:
        content = generate_latest()
        return Response(content=content, media_type=CONTENT_TYPE_LATEST)
