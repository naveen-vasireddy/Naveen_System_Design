# ADR-022: Replication and Consistency Strategy

**Status:** Accepted
**Date:** Day 38

## Context
In a distributed cache, nodes can fail. We need data to survive single-node failures.
We need to decide how many copies to keep and how to ensure they stay in sync.

## Decision
1.  **Replication Factor (N=3):** We will store every key on the Primary node (determined by Hash) and the **next 2 nodes** in the ring.
2.  **Consistency Level:**
    *   **Write:** `W=2` (Consider successful if acknowledged by 2 nodes).
    *   **Read:** `R=2` (Read from 2 nodes, compare results).
3.  **Read Repair:** If a read detects a mismatch (e.g., Node A says "v1", Node B says "null"), the client will push the correct value to the outdated node in the background.

## Consequences
*   **Pros:** High availability; data survives if 1 node crashes.
*   **Cons:** Higher latency (network calls to multiple nodes); complexity in handling conflicts.
