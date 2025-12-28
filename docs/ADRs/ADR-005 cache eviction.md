# ADR-005: Cache Strategy Selection

## Status
Accepted

## Context
Our system requires a strategy for data movement between the application, the LRU cache (built on Day 7), and the underlying data store. We need to choose a pattern that balances latency, consistency, and availability—the core trade-offs established on Day 2.

## Options Considered

### 1. Cache-Aside (Lazy Loading)
- **Mechanism**: The application code is responsible for managing the cache. It checks the cache first; if the data is missing (a "miss"), it queries the database, then stores the result in the cache for future requests.
- **Pros**: 
    - Resilient to cache failures (the system stays up even if the cache crashes).
    - Highly efficient for read-heavy workloads.
- **Cons**: 
    - Data can become stale if the database is updated without invalidating the cache.
    - The first request always results in a "cache miss" penalty.

### 2. Write-Through
- **Mechanism**: Data is written to the cache and the database simultaneously.
- **Pros**: 
    - Data in the cache is never stale.
    - High consistency between the cache and the database.
- **Cons**: 
    - Higher write latency because every write must succeed in two places.
    - "Wasted" cache space if data is written but never read.

## Decision
We will prioritize Cache-Aside as our primary strategy for Phase 1 and 2 projects.

## Rationale
1. **Resilience**: In accordance with our Day 2 design principles, we prioritize availability. Cache-aside allows the application to continue functioning using only the database if the cache layer fails.
2. **Suitability**: Our first major project is a URL Shortener (Day 23), which is a classic read-heavy system where Cache-Aside excels.
3. **Simplicity**: It decouples the cache logic from the database, making it easier to implement across different types of data stores (Postgres vs. Mongo) as planned for Day 17.

## Consequences
- **Stale Data**: We must implement robust TTL (Time-To-Live) logic to minimize the window of stale data.
- **Implementation**: Tomorrow (Day 9), we will implement Stale-While-Revalidate (SWR) to further mitigate the latency impact of cache misses and stale data.