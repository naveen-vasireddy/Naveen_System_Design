# Cache Failure Benchmark

**Date:** Day 40
**Scenario:** 3-Node Cluster (6379, 6380, 6381). Hard failure of Node 6380.

## Methodology
*   **Total Requests:** 500 sequential operations.
*   **Failure Injection:** Manually killed Node 6380 (Ctrl+C) at request #100.
*   **Client Configuration:** 200ms timeout, no automatic retry enabled in test script.

## Results
*   **Success:** 440
*   **Failures:** 60
*   **Availability:** 88.00%

## Analysis
1.  **Partial Outage:** The system did not collapse entirely. Only keys belonging to the dead node partition failed (`ECONNREFUSED` or Timeout).
2.  **Impact:** Roughly 12% of total traffic failed. In a production scenario (without the initial 100 safe requests), this would likely represent a ~33% failure rate for a 3-node cluster if a node vanishes.
3.  **Remediation:** To achieve 99.99% availability, the client must catch these specific connection errors and immediately retry on the **replica node** (as defined in `ADR-023`).
