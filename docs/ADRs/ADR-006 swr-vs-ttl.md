# ADR-006: Selection Criteria for SWR vs. TTL

## Status
**Accepted**

## Context
Both standard TTL (Day 7) and SWR (Day 9) manage cached data temporal validity but prioritize different trade-offs between Latency and Consistency (from Day 2). Clear guidance is needed on when to apply each strategy.

## Decision Criteria

### Use Standard TTL (Hard Expiry) When:
- **High Data Sensitivity**: Serving stale data risks significant business errors (e.g., account balances, inventory during checkout)
- **Low Write-Frequency**: Data changes infrequently; simple TTL is more efficient than background revalidation
- **Consistency Prioritized**: System leans toward CP (Consistency/Partition Tolerance) in CAP theorem

### Use SWR (Stale-While-Revalidate) When:
- **Latency Critical**: 1-second cache miss penalty is unacceptable (e.g., social feeds, product descriptions)
- **High Read Volume**: Prevents cache stampedes; first user triggers background refresh while others see stale data
- **Availability Prioritized**: System leans toward AP (Availability/Partition Tolerance); slightly old data beats failure

## Comparison

| Feature | Standard TTL | SWR |
|---------|--------------|-----|
| Primary Goal | Data Freshness | Low Latency |
| User Experience | Variable (slow on expiry) | Predictable (always fast) |
| Complexity | Low | Medium |
| Consistency | Stronger | Eventual |

## Rationale
For Project 1: URL Shortener (Day 23), SWR fits redirection mappings—redirects must be near-instant. Serving a destination updated 10 seconds ago is preferable to a 1000ms synchronous database lookup.

## Consequences
- **Background Load**: Increased invisible database requests from background revalidations
- **Observability**: Track "SWR Hit" metrics separately from "Fresh Hits" to monitor stale data frequency