# ADR 030: E-Commerce SLO Targets

## Status
Accepted

## Context
As we move our e-commerce system to a distributed microservices architecture (using Saga orchestration), we need clear metrics to alert us if the checkout flow degrades. We cannot solely rely on monitoring CPU and memory; we must monitor the actual user experience and business outcomes. 

## Decision
We are defining the following Service Level Objectives (SLOs) for the Orders and Payments Bounded Contexts:

1. **Checkout Latency (p95): < 800ms**
   * *Definition:* 95% of all `Reserve -> Charge -> Finalize` checkout flows must complete in under 800 milliseconds.
   * *Why:* Anything slower increases the chance of a user abandoning the cart, refreshing the page, or double-clicking the checkout button (which our idempotency keys from Day 64 protect against, but we still want to avoid).

2. **Payment Success Rate: > 99%**
   * *Definition:* 99% of all payment attempts sent to our external gateway (e.g., Stripe) must return a definitive Success or Insufficient Funds response, excluding 5xx network timeouts.
   * *Why:* If the success rate dips below 99%, it indicates our retry-safe payments module is failing or the external gateway is experiencing an outage, requiring immediate engineering intervention.

## Consequences
* **Pros:** We now have actionable business metrics. If the p95 latency breaches 800ms, our on-call engineers will immediately know that the checkout state machine is sluggish, likely due to a bottleneck in the Inventory Redis cache or the Orders Postgres database.
* **Cons:** We must now instrument our orchestrator to accurately measure these spans and emit metrics to our dashboards, adding slight code complexity.
