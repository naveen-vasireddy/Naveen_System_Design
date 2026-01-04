# ADR-008: Rate Limiter Choice & Resilience

The final deliverable for today is the Architectural Decision Record (ADR).

## ADR-008: Rate Limiter Choice & Resilience

- Status: Accepted
- Context: We are moving from single-instance memory limiters to a distributed architecture. This introduces a dependency on Redis. We need a strategy that ensures accuracy across nodes without introducing a single point of failure that could crash the API.
- Decision: We have implemented a Fixed Window rate limiter using Lua scripts for atomicity. To handle Redis downtime, we use a Fail-Open strategy.
- Rationale:
   - Accuracy: Lua scripts ensure that the INCR and EXPIRE operations are atomic, preventing race conditions.
   - Resilience: In accordance with our AP (Availability/Partition Tolerance) preference from Day 3, we choose to allow requests if the rate limiter is down. It is better to risk a minor traffic spike than to deny service to 100% of users due to a cache failure.
- Consequences:
   - Dependency: Adds Redis as a critical component.
   - Consistency: In rare fail-open scenarios, rate limits may be temporarily bypassed.