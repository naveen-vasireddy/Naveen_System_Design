# Benchmark Results: URL Shortener

**Date:** Day 26
**Tool:** k6 v0.47.0

## Scenario
- **Traffic:** Ramp up to 1000 Virtual Users (VUs) over 2 minutes.
- **Operations:** 
  1. Write (POST /shorten)
  2. Read (GET /:code) - Cache Hit expected
- **Conditions:** Rate Limit middleware disabled to measure raw throughput.

## Results
| Metric | Value | Target | Status |
| :--- | :--- | :--- | :--- |
| **Max Throughput** | ~701 RPS | 100+ RPS | ✅ PASS |
| **p95 Latency** | 90.6 ms | < 200 ms | ✅ PASS |
| **p99 Latency** | 158.63 ms | < 500 ms | ✅ PASS |
| **Error Rate** | 0.00% | < 1% | ✅ PASS |

## Analysis
- **Latency:** The p95 latency of 90.6ms confirms that the **Cache-Aside** strategy is working. Most requests are served directly from the Redis mock without hitting the "database" logic.
- **Stability:** The system handled 1000 concurrent VUs without dropping a single request.
- **Notes:** The "High Cardinality" warning in the logs suggests we should group metrics by URL path in future tests, but it did not affect performance here.

