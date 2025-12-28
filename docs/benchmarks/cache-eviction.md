# Day 8 — Cache Eviction & TTL Benchmarks

## Overview
Benchmarks evaluate eviction throughput for a Map + Doubly Linked List LRU implementation and the cost of TTL-based lazy eviction under load.

---

## 1. Eviction Throughput (set-and-evict at max capacity)
- Purpose: Measure cost of evicting on every set when cache is full.
- Total operations: 1,000,000 set calls
- Total duration: 638 ms
- Throughput: 1,567,398 ops/sec
- Key observation: Eviction (pointer updates + tail deletion) operates in O(1); overhead is negligible even under heavy churn.

---

## 2. TTL Stress — Lazy Eviction (get on expired items)
- Purpose: Measure cost of checking TTL lazily on access rather than using background timers.
- Total operations: 500,000 get calls (expired items)
- Total duration: 201 ms
- Per-op cost: ≈0.0004 ms
- Key observation: Lazy TTL checks add minimal overhead to the get path and avoid resource-intensive background tasks.

---

## 3. Summary & Implications
- Constant-time behavior: Core eviction operations remain O(1) and stable across load.
- Minimal TTL overhead: Time-to-live checks are inexpensive and suitable for high-throughput systems.
- Practical impact: Throughput far exceeds earlier 10k-request baseline (Day 5), indicating the cache layer will significantly improve performance for downstream services (e.g., URL shortener).

---

## 4. Recommendations
- Continue using Map + Doubly Linked List for LRU-style caches where strict O(1) eviction is required.
- Prefer lazy TTL eviction unless application requires hard real-time expiration guarantees.
- Monitor tail-pointer operations under multi-threaded or sharded deployments and benchmark under target concurrency.
