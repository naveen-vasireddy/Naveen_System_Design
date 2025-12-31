# Rate Limiter Comparison: Token Bucket vs. Sliding Window

## Core Performance Comparison

| Feature | Token Bucket (Day 10) | Sliding Window Log (Day 11) |
|---------|----------------------|----------------------------|
| Memory Complexity | O(1) (Constant) | O(k) (Linear to max requests) |
| Time Complexity | O(1) (Lazy refill) | O(n) (Requires filtering/cleanup) |
| Burst Support | High (Native capacity) | Low (Strictly follows window) |
| Fairness/Precision | Medium (Refill over time) | Highest (Perfectly accurate) |

## Memory Impact

**Token Bucket:** Highly efficient. Stores only two values per user: `currentTokens` and `lastRefillTimestamp`. Ideal for systems with millions of users where memory is a primary constraint.

**Sliding Window Log:** Significantly higher memory usage. Stores the timestamp of every request. For a limit of 1,000 requests per minute, requires storing 1,000 integers per active user.

## Fairness and the "Boundary Problem"

**Precision:** Sliding Window Log is the fairest algorithm, using an exact look-back period. Ensures users never exceed the limit within the specified duration, even momentarily.

**Bursting:** Token Bucket is more permissive by design, allowing users to "save up" quota for burst activity (see ADR-007).

## Strategic Recommendation

- **Token Bucket:** Use for generic API protection where low latency and memory overhead are critical.
- **Sliding Window Log:** Use for sensitive operations (payments, login retries) where strict fairness and limit adherence outweigh memory costs.