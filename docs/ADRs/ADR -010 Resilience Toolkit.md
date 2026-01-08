# ADR-010: Resilience Toolkit (Retries vs. CB vs. Timeouts)

## Status
Accepted

## Context
In a distributed system, downstream services may experience failure or latency spikes. During our        
Day 16 Chaos Test, we simulated a service with a 20% failure rate across 1,000 requests and
evaluated three strategies:
1. Baseline: No protection.
2. Retries Only: Using the exponential backoff and jitter logic from Day 6.
3. Integrated: A multi-layered stack combining Circuit Breakers (CB), Retries, and Timeouts.

## Decision
We will implement a layered resilience strategy where the Circuit Breaker (from Day 15) acts as the      
outermost guard, wrapping the Retry with Jitter and Timeout logic (from Day 6).

## Rationale
The decision is based on the following benchmarking results and design principles:
- Handling Transient vs. Persistent Failures: Retries are effective for "transient blips," but they      
fail to protect the system during persistent outages. By wrapping retries in a Circuit Breaker, we       
can "fail-fast" once a threshold of failures is reached, preventing the system from wasting
resources on a doomed request.
- Performance Optimization: Our benchmarks showed that Retries Only took 84,871ms to complete, 
while the Integrated CB + Retries approach reduced this to 81,601ms. This 3.2-second improvement
demonstrates that the Circuit Breaker prevents "retry storms" that bloat tail latency.
- Bounded Latency: Integrating Timeouts ensures that the p99 latency does not hang indefinitely 
when a downstream service becomes unresponsive.
- System Stability: The Circuit Breaker's Open and Half-Open states allow the struggling downstream      
service the "breathing room" it needs to recover, rather than being continuously bombarded by retry      
attempts.

## Consequences
- Success Rate Trade-off: The integrated approach had a slightly lower success rate (99.9%) 
compared to pure retries (100%). This is an acceptable trade-off to ensure System Availability and       
prevent cascading failures.
- State Management: The load balancer and service callers must now maintain the state of the 
Circuit Breaker (Closed, Open, Half-Open), adding minor memory overhead.
- Complexity: Developers must carefully tune thresholds (failure counts and reset timeouts) to
ensure the circuit does not trip too easily or stay open too long.

## Deliverables Correlation
This ADR is supported by the data recorded in `docs/benchmarks/resilience.md` and the logic
implemented in `shared/resilienceProvider.ts`.