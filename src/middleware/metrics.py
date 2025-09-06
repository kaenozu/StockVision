"""
Prometheus metrics middleware and endpoint for FastAPI.

Enable by setting environment variable `ENABLE_METRICS=true`.
Exposes `/metrics` endpoint in Prometheus text format and records
HTTP request counts and latency histograms.
"""

from __future__ import annotations

import os
import time
from typing import Callable, List

from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import ipaddress

try:
    from prometheus_client import Counter, Histogram, CONTENT_TYPE_LATEST, generate_latest
except Exception:  # pragma: no cover - optional dependency path
    Counter = None  # type: ignore
    Histogram = None  # type: ignore
    CONTENT_TYPE_LATEST = "text/plain; version=0.0.4; charset=utf-8"  # type: ignore
    def generate_latest():  # type: ignore
        return b""  # minimal fallback


REQUEST_COUNT = None
REQUEST_LATENCY = None
DB_PING_LATENCY = None
DB_QUERY_LATENCY = None
EXTERNAL_API_REQUESTS = None
EXTERNAL_API_LATENCY = None


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

    # DB ping latency (e.g., readiness checks)
    DB_PING_LATENCY = Histogram(
        "db_ping_duration_seconds",
        "Database ping latency (seconds)",
        buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
    )

    DB_QUERY_LATENCY = Histogram(
        "db_query_duration_seconds",
        "Database query latency (seconds)",
        buckets=(0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25),
    )

    # External API metrics (e.g., Yahoo Finance)
    EXTERNAL_API_REQUESTS = Counter(
        "external_api_requests_total",
        "External API requests",
        labelnames=("service", "operation", "status"),
    )
    EXTERNAL_API_LATENCY = Histogram(
        "external_api_duration_seconds",
        "External API latency in seconds",
        labelnames=("service", "operation", "status"),
        buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
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
            REQUEST_LATENCY.labels(method=method, path=path_tmpl, status=status).observe(duration)
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
    async def metrics_endpoint(request: Request) -> Response:
        # Optional Basic Auth
        basic_auth = os.getenv("METRICS_BASIC_AUTH", "").strip()
        if basic_auth:
            # Expect header: Authorization: Basic base64(user:pass)
            auth = request.headers.get("authorization", "")
            if not auth.lower().startswith("basic "):
                return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="metrics"'})
            try:
                import base64

                encoded = auth.split(" ", 1)[1]
                decoded = base64.b64decode(encoded).decode("utf-8")
                if decoded != basic_auth:
                    return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="metrics"'})
            except Exception:
                return Response(status_code=401, headers={"WWW-Authenticate": 'Basic realm="metrics"'})

        # Optional IP allowlist via CIDRs or IPs
        allow_cidrs = os.getenv("METRICS_ALLOW_CIDRS", "").strip()
        if allow_cidrs:
            if not _is_ip_allowed(request, allow_cidrs):
                return Response(status_code=403)

        content = generate_latest()
        return Response(content=content, media_type=CONTENT_TYPE_LATEST)


def _is_ip_allowed(request: Request, cidrs_csv: str) -> bool:
    """Check if request IP is within any of the allowed CIDRs or exact IPs.

    Supports comma-separated list like "127.0.0.1, 10.0.0.0/8, ::1".
    Considers X-Forwarded-For (first) if present; falls back to client.host.
    """
    # Determine client IP
    xff = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    host = xff or (request.client.host if request.client else "")
    try:
        client_ip = ipaddress.ip_address(host)
    except ValueError:
        # Unknown host format; deny
        return False

    # Parse allow list
    networks: List[ipaddress._BaseNetwork] = []
    for raw in cidrs_csv.split(","):
        entry = raw.strip()
        if not entry:
            continue
        try:
            # Try network first
            net = ipaddress.ip_network(entry, strict=False)
            networks.append(net)
            continue
        except ValueError:
            try:
                # Single IP fallback -> convert to /32 or /128
                ip = ipaddress.ip_address(entry)
                net = ipaddress.ip_network(f"{ip}/{ip.max_prefixlen}")
                networks.append(net)
            except ValueError:
                # Skip invalid entry
                pass

    return any(client_ip in net for net in networks)


# Helper APIs for code outside FastAPI modules
def observe_db_ping(duration_seconds: float) -> None:
    if DB_PING_LATENCY is None:
        return
    try:
        DB_PING_LATENCY.observe(duration_seconds)
    except Exception:
        pass


def record_external_api_metric(service: str, operation: str, status: str, duration_seconds: float) -> None:
    if EXTERNAL_API_REQUESTS is None or EXTERNAL_API_LATENCY is None:
        return
    try:
        EXTERNAL_API_REQUESTS.labels(service=service, operation=operation, status=status).inc()
        EXTERNAL_API_LATENCY.labels(service=service, operation=operation, status=status).observe(duration_seconds)
    except Exception:
        pass


def observe_db_query(duration_seconds: float) -> None:
    if DB_QUERY_LATENCY is None:
        return
    try:
        DB_QUERY_LATENCY.observe(duration_seconds)
    except Exception:
        pass
