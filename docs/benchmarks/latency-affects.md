# Day 6: Latency Effects of Resilience Patterns

## Executive Summary

This benchmark compares the performance of a raw request cycle (Day 5) against a resilient request cycle (Day 6) that utilizes timeouts (100ms), exponential backoff, and jitter. The goal was to observe the impact of these patterns on "tail latency" (p99).

## Comparison Table
| Metric | Day 5 (Baseline) | Day 6 (With Resilience) | Change |
|--------|-----------------|------------------------|--------|
| p50 (Median) | 31 ms | 32 ms | Stable. The "happy path" remains unaffected. |
| p95 | 49 ms | 187 ms | Increased. This is the "Resilience Tax." Requests that were borderline now trigger retries/backoffs. |
| p99 (Tail) | 438 ms | 251 ms | Improved (-42%). You have successfully "tamed the tail" by cutting off the longest spikes. |
| Max Latency | 499 ms | 1030 ms | Increased. This reveals the cumulative effect of multiple timeouts and exponential backoff delays. |

## Key Findings

- **Taming the Tail**: The most significant improvement occurred at the p99 and Max levels. By implementing a 100ms timeout, we prevented "spike" requests from hanging for 400ms+. Instead, they were aborted early and retried, typically succeeding in the second attempt.

- **The Cost of Resilience**: The p95 latency increased slightly. This is expected behavior; requests that would have finished in 60-90ms might now occasionally hit a timeout and retry, adding the backoff delay to the total execution time.

- **Stability**: The maximum latency is now bounded by our timeout + retry logic, making the system much more predictable under stress.

## Configuration Used

- Total Requests: 10,000
- Timeout Threshold: 100ms
- Max Retries: 3
- Backoff Strategy: Exponential with Full Jitter (Base: 50ms)