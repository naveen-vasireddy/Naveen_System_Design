# Rate Limiter Benchmarks

**Date:** Day 34
**Environment:** Localhost (Windows/Node)
**Max VUs:** 1100

## Test Results
| Metric | Result | Target | Status |
| :--- | :--- | :--- | :--- |
| **Throughput** | 750 RPS | 1000 RPS | ⚠️ Saturated |
| **Success Rate** | 92.23% | 99% | ⚠️ Degraded |
| **Latency (p95)** | 1.27s | <50ms | ❌ Failed |

## Failure Analysis
During the "Stress Spike" scenario (1000+ users), the system encountered two limits:

1.  **Network Saturation (OS Level):**
    *   **Error:** `dial tcp 127.0.0.1:3000: connectex: No connection could be made`
    *   **Cause:** The OS ran out of ephemeral ports due to opening 1,100 concurrent TCP connections instantly. This resulted in a **7.76%** failure rate at the network layer.

2.  **Redis Connection Exhaustion:**
    *   **Log:** `[RateLimiter] ⚠️ Redis failed... Falling back to In-Memory`
    *   **Effect:** The Redis client timed out waiting for a connection. This timeout caused the high latency (**1.27s** p95).

## Resilience Verification (Success)
Despite the infrastructure collapsing, the application logic **did not crash**.
*   **Circuit Breaker:** The code successfully caught the Redis timeout.
*   **Fallback:** Traffic was rerouted to the In-Memory limiter.
*   **Result:** **92.23%** of requests were processed (returning either 200 OK or 429 Too Many Requests) instead of crashing entirely.

