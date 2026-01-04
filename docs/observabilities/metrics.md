# Rate Limiter Metrics

To monitor the health and effectiveness of the Redis-backed rate limiter, we track the following counters. These metrics help identify traffic spikes, potential attacks, and infrastructure health.

| Metric Name | Type | Description |
| :--- | :--- | :--- |
| `rate_limit_allowed_total` | Counter | Incremented every time a request is within limits and allowed to proceed. |
| `rate_limit_blocked_total` | Counter | Incremented when a request exceeds the defined limit (results in an HTTP 429). |
| `rate_limit_error_total` | Counter | Incremented when the limiter encounters a Redis connection error or timeout. |
| `rate_limit_fail_open_total`| Counter | Tracks how many requests were allowed specifically because the Redis check failed (resilience path). |

## **Usage in Dashboards**
- **Success Rate:** `rate_limit_allowed_total` / (`rate_limit_allowed_total` + `rate_limit_blocked_total`)
- **Error Rate:** Monitoring `rate_limit_error_total` helps detect issues with the Redis cluster or network latency.
- **Resilience Health:** If `rate_limit_fail_open_total` is high, it indicates that the rate limiting is currently ineffective because the system is prioritizing availability over strict limits [1].

--------------------------------------------------------------------------------