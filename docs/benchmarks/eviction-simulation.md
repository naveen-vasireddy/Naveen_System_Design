# Cache Eviction Benchmarks: LRU vs. Workloads

**Date:** Day 39
**Cache Capacity:** 5 items

## 1. LRU-Friendly Workload (Recency Based)
*   **Pattern:** Repeated access to a small working set (`1, 2, 3`) that fits within cache capacity.
*   **Result:** High Hit Ratio (~75%).
*   **Observation:** LRU is ideal here. Once `1, 2, 3` are loaded, they stay in the cache because they are constantly refreshed (moved to the head of the list).

## 2. Scan Workload (LFU Ideal)
*   **Pattern:**
    1.  Access `1, 2` multiple times (Hot items).
    2.  Access unique items `10, 11, 12, 13, 14, 15` (One-time Scan).
    3.  Access `1, 2` again.
*   **Result:** Low Hit Ratio (~29%).
*   **Observation:** This is the **"LRU Weakness"**.
    *   Even though `1` and `2` were accessed frequently (3 times each), the "Scan" filled the cache with garbage data (`10` through `15`).
    *   Because LRU only cares about *when* data was last touched, the scan pushed `1` and `2` out.
    *   When we requested `1` and `2` at the end, they were cache misses.
*   **Conclusion:** For workloads with large scans (e.g., database table dumps, logging), LRU performs poorly. An **LFU (Least Frequently Used)** or **TinyLFU** algorithm would be better, as it would recognize `1` and `2` had high frequency counts and resist evicting them for the low-frequency scan items.
