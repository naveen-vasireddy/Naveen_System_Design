# Latency Benchmark Report

## Overview
This report documents the baseline performance of the 10k-request latency simulator, designed to capture the impact of "spikes" on system performance.

## Benchmark Configuration
- **Total Iterations:** 10,000 requests
- **Environment:** Local simulation (`shared/latency-sim.ts`)
- **Goal:** Establish a performance baseline before implementing resilience patterns

## Latency Results

| Metric | Value |
|--------|-------|
| Minimum | 10 ms |
| Average | 45.27 ms |
| p50 (Median) | 31 ms |
| p95 | 49 ms |
| p99 (Tail) | 438 ms |
| Maximum | 499 ms |

## Key Observations

### The Tail Latency Gap
While p50 (31 ms) and p95 (49 ms) remain close, p99 jumps to 438 ms—a **14x increase**. This demonstrates that simulated spikes successfully mimic real-world edge cases where 1% of users experience significantly degraded latency.

### Average is Deceptive
The average (45.27 ms) exceeds the median, skewed upward by high-latency spikes. This reinforces why percentile-based metrics better reflect true user experience than averages.

### Foundation for Resilience Patterns
These results serve as the baseline "before" snapshot. Future iterations will implement retries-with-jitter and timeouts to measure their impact on p99 latency.

## Analogy
Like a fast-food drive-thru where most cars wait 3 minutes (p50), but one in a hundred faces a 40-minute wait (p99) due to technical glitches—we've measured the problem. Next, we'll implement architectural solutions to keep performance consistent.
