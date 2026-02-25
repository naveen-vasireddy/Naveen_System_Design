# Real-Time Chat Scale Simulation

**Date:** Day 48

## Results (Delivery Latency - Windows)
*   **Min:** 14-15 ms
*   **p50 (Median / Average):** ~64 ms
*   **p95:** ~111 ms
*   **p99:** ~112 ms
*   **Max:** ~113-118 ms

## Tuning & Observations
1. **OS Socket Limits:** Initially attempted to simulate 10,000 concurrent connections, but hit the Windows `ENOBUFS` limit. Scaled the test down to 2,000 concurrent clients to successfully run the benchmark.
2. **Auth Bypass:** Implemented a temporary bypass for the `mock-token-for-testing` to allow the load tester to connect without generating 2,000 valid JWTs.
3. **Batching Performance:** The Gateway successfully handled the fan-out. The tight grouping between p95 (111ms) and p99 (112ms) proves the 100ms batching interval kept the CPU stable and prevented long-tail latency spikes.
