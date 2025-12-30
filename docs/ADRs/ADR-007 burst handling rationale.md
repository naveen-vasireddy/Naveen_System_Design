# ADR-007: Burst Handling Rationale

## Status
Accepted

## Context
As established in our Day 2 design principles, we must protect our system from being overwhelmed by traffic spikes while ensuring a smooth user experience. We need a rate-limiting algorithm that doesn't just block traffic at rigid boundaries but allows for the natural "burstiness" of real-world internet usage.

## Decision
We have implemented the Token Bucket algorithm as our primary rate-limiting mechanism for Phase 1.

## Rationale

### 1. Burst Support
Unlike a Fixed Window counter, which might reset and allow a double-quota hit at the edge of a window, the Token Bucket explicitly defines a capacity. This allows a user to perform multiple actions rapidly if they haven't made requests recently, which is common for legitimate human behavior (e.g., refreshing a page twice).

### 2. Smoothing Traffic
By defining a refillRate, we ensure that once the burst capacity is exhausted, the user is strictly throttled to a steady flow. This prevents the "thundering herd" effect where everyone gets their quota back at the same exact second.

### 3. Efficiency (O(1))
As demonstrated in our implementation, the "lazy refill" strategy allows us to calculate available tokens on-demand using timestamps. This avoids the memory and CPU overhead of background timers or interval loops, adhering to our core performance goals.

## Consequences

- **Memory Usage**: We must store a timestamp and a token count for every unique identifier (e.g., IP address). For a high-traffic production system, this would require a distributed store like Redis, which we will address on Day 12.
- **Parameter Tuning**: Finding the right balance between capacity (how much burst we allow) and refillRate (the sustainable load) requires ongoing monitoring.