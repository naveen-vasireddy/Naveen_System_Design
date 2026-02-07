# ADR-020: Fairness, Bursts, and Resilience Strategy

**Status:** Accepted
**Date:** Day 33

## Context
Our Rate Limiter serves multiple tenants (Free, Pro, Enterprise).
1.  **Fairness:** Heavy usage by one tenant must not degrade others.
2.  **Bursts:** Real traffic is spikey. Strict rate limiting (e.g., exactly 10 req every 100ms) hurts user experience during page loads.
3.  **Reliability:** Redis is a single point of failure for the rate calculations.

## Decisions
1.  **Isolation:** We will use namespaced Redis keys (e.g., `rl:user:<id>`) to ensure total isolation between tenants.
2.  **Burst Allowance:** We will configure the **Token Bucket Capacity** to be **2x** the Refill Rate.
    *   *Example:* A 10 req/sec plan has a bucket size of 20. This allows short bursts without being blocked, while maintaining the long-term average.
3.  **Circuit Breaker / Fallback:**
    *   If Redis times out or throws an error, we **Fail Open** to a local In-Memory limiter.
    *   *Trade-off:* Local limiting is not distributed (limits apply per server node), but availability is prioritized over strict enforcement during outages.

## Consequences
*   **Complexity:** The application must manage two limiters (Redis + Memory).
*   **Consistency:** During a Redis outage, the effective global limit increases by factor N (where N is the number of API server nodes). This is an acceptable risk for short durations.
