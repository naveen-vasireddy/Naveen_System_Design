# ADR-024: Observability Minimal SLI/SLO

**Status:** Accepted
**Date:** Day 43

## Context
We need standard targets to determine if our services (e.g., Rate Limiter, Cache) are performing acceptably.

## Decision
We will track the following minimal SLIs and enforce these SLOs:

1.  **Availability (Error Rate):** 
    *   **SLI:** Percentage of successful HTTP requests (Status < 500).
    *   **SLO:** 99.9% success rate over a rolling 7-day window.
2.  **Latency (Duration):**
    *   **SLI:** 95th percentile (p95) response time.
    *   **SLO:** 95% of requests must complete in < 50ms.

## Consequences
*   If the error rate drops below 99.9%, alerts will trigger.
*   Dashboards will prominently display the p95 latency and error rate to ensure we are meeting these objectives.
