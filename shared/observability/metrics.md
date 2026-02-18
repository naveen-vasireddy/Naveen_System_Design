# Observability Metrics Strategy (RED Method)

**Date:** Day 42
**Status:** Draft

## 1. Global Metrics (All Services)
These metrics apply to every HTTP/TCP service we build.

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total number of HTTP requests received. |
| `http_request_duration_seconds` | Histogram | `method`, `route` | Latency distribution (buckets: 0.1s, 0.5s, 1s, ...). |
| `app_errors_total` | Counter | `type` (db, logic, network) | Count of internal application exceptions. |

## 2. Service-Specific Metrics

### Rate Limiter
*   `ratelimit_decisions_total`: Counter (labels: `decision=allowed|blocked`, `policy_id`)
*   `ratelimit_redis_latency_seconds`: Histogram (Latency of Redis checks)

### Distributed Cache
*   `cache_hits_total`: Counter
*   `cache_misses_total`: Counter
*   `cache_evictions_total`: Counter
*   `cluster_rebalance_events_total`: Counter (When nodes join/leave)

## 3. Implementation Plan
We will use **Prometheus** format.
*   **Middleware:** An Express middleware will automatically track `http_requests_total` and `duration`.
*   **Exporters:** Services will expose a `/metrics` endpoint for Prometheus to scrape.
