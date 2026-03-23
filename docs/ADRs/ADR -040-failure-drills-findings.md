# ADR 040: Failure Drills & Chaos Engineering Findings

## Status
Accepted

## Context
Our Multi-Agent Orchestrator is a distributed system. In production, network partitions will happen, Agent Node processes will crash (OOM errors, hardware failures), and LLM APIs will unexpectedly hang. To ensure our system is genuinely resilient, we conducted "Chaos Engineering" failure drills. We specifically tested two scenarios:
1. **Agent Termination Mid-Task:** Simulating a worker process crashing while actively processing an AI prompt.
2. **Queue Partitioning/Network Dropping:** Simulating a scenario where the Orchestrator cannot communicate with the Redis/RabbitMQ queue.

## Expected Behavior & Decisions
Based on the architecture we built over the last few days, we rely on the following mechanisms to handle these failures:

### 1. Handling Dead Agents (Timeout & Retry)
If we `kill -9` an Agent process while it is running a task:
* The Orchestrator's internal timer must detect that the task exceeded its maximum execution window.
* The Orchestrator should cleanly fail the active task, increment the `retryCount`, and reschedule it using our **Jittered Retry** logic.
* **Finding:** We must ensure idempotency keys are strictly respected so that if an agent died *after* completing the work but *before* acknowledging it, a retry doesn't cause duplicate side effects.

### 2. Handling Queue Partitions (Backpressure)
If the task queue becomes unreachable:
* The Orchestrator must not infinitely accept new HTTP requests and crash its own memory. 
* It must apply strict **Backpressure**, returning `503 Service Unavailable` or `429 Too Many Requests` to the client until the queue connection is restored.

## Consequences
By explicitly running and documenting these failure drills, we prove that our `DLQ` (Dead Letter Queue), timeout, and retry mechanisms actually work under duress, validating our "Thick Orchestrator, Thin SDK" design (ADR-039). Any tasks that completely fail these recovery mechanisms will be safely parked in the DLQ for human review without clogging the active system.
