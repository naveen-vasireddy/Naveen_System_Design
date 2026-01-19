
# ADR-016: Caching Strategy (Cache-Aside vs. Write-Through)

**Status:** Accepted
**Date:** Day 26

## Context
The URL Shortener is a read-heavy system (approx. 100 reads per 1 write). We need to serve redirects with low latency (p95 < 200ms) while ensuring data persistence.

## Decision
We chose the **Cache-Aside (Lazy Loading)** pattern.

## Implementation
1.  **Read Path:** Application checks Redis.
    *   *Hit:* Return immediately.
    *   *Miss:* Fetch from DB, write to Redis (with TTL), return to user.
2.  **Write Path:** Application writes to DB. (We rely on the next read to populate the cache).

## Rationale
*   **Efficiency:** URL shorteners often have "long-tail" links that are created but rarely visited. Cache-Aside ensures only *active* links occupy Redis memory.
*   **Resilience:** If Redis fails, the application naturally degrades to reading from the Database; it does not crash (Fail-Open).
*   **Simplicity:** We avoid the complexity of distributed transactions required to keep Cache and DB perfectly synchronized during writes.

## Alternatives Considered
*   **Write-Through:** Rejected because it would fill the cache with cold data immediately upon creation, increasing Redis costs.
