# Prometheus Scrape Config (Sample)

Add a scrape job for the backend `/metrics` endpoint. Protect with `METRICS_BASIC_AUTH` and/or `METRICS_ALLOW_CIDRS` as needed.

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "stockvision-backend"
    metrics_path: /metrics
    scheme: http
    static_configs:
      - targets: ["stockvision-backend:8000"]
        labels:
          service: stockvision
          env: production
    # If Basic Auth is enabled
    basic_auth:
      username: "user"
      password: "pass"
    # If behind a proxy that sets X-Forwarded-For, keep headers
    # relabel_configs:
    #   - action: replace
    #     source_labels: [__address__]
    #     target_label: instance
```

Exposed metrics include:
- `http_requests_total{method,path,status}`
- `http_request_duration_seconds{method,path,status}`
- `db_ping_duration_seconds`
- `db_query_duration_seconds`
- `external_api_requests_total{service,operation,status}`
- `external_api_duration_seconds{service,operation,status}`

