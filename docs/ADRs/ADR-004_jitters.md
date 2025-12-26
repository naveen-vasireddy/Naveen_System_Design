# ADR-004: Jittered Retries

Status: Accepted

## Context
On Day 5 our latency simulator showed a severe tail-latency problem: p50 = 31ms, p99 = 438ms. We need a retry strategy to improve availability and reduce tail latency. The choice is between naive immediate retries and a retry strategy with exponential backoff plus jitter.

## Problem — the "Retry Storm"
Naive, immediate retries create a feedback loop when a downstream service is slow or failing:
- Resource exhaustion: immediate retries multiply load (initial + retries) and can crash or further degrade the backend.
- Tail latency amplification: requests already in the p99 bucket are retried while the system is congested, pushing p99 higher.
- Synchronization: simultaneous retries from many clients create massive traffic spikes instead of a smooth retry spread.

## Decision
Do not use naive retries. Implement a resilient retry pattern in `shared/retry.ts` that includes:
- Timeouts: fail fast to avoid waiting through long latency spikes.
- Exponential backoff: increase wait between attempts to allow downstream recovery.
- Jitter: add randomness to retry intervals to avoid client synchronization.

## Consequences
- Positive: Expect a significant reduction in p99 latency because slow requests are cut off and retried when spikes have likely subsided.
- Positive: Improved stability during partial outages.
- Negative: Added complexity in `shared/` (retry logic needs testing, observability).
- Negative: Slight increase in p95 latency for some flows due to backoff delays.

<!-- Implementation notes: keep `shared/retry.ts` small, well-tested, and instrumented (metrics for attempts, retries, backoff durations). -->