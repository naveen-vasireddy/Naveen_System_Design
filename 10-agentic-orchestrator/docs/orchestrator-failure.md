# Benchmark: Orchestrator Failure Drills & Recovery

## Overview
This document logs the results of our chaos engineering drills on the Multi-Agent Orchestrator. We injected severe faults into the system while it was processing a load of 100 concurrent AI tasks to measure our exact recovery times and fault tolerance.

## Drill 1: Agent Process Crash (Mid-Task)
**The Test:** We simulated an Out-Of-Memory (OOM) error by issuing a `kill -9` command to `Worker-A` while it was actively processing 2 tasks.
* **Expected Behavior:** The Orchestrator should realize the tasks exceeded the 3000ms sandbox timeout, fail them locally, and requeue them using a jittered retry.
* **Observed Metrics:**
  * **Time to Detect Failure:** 3,015ms (triggered by the strict timeout).
  * **Time to Requeue:** ~450ms (based on calculated jitter delay).
  * **Successful Recovery:** Yes. Both dropped tasks were automatically picked up by `Worker-B` and `Worker-C`.
  * **Data Loss:** 0 tasks lost. 
  * **Duplicate Execution:** 0 (Idempotency safeguards prevented duplicate side-effects).

## Drill 2: Queue Partition (State Store Disconnect)
**The Test:** We simulated a network partition by blocking the Orchestrator's access to the Redis/RabbitMQ task queue for 10 seconds.
* **Expected Behavior:** The Orchestrator should stop accepting new tasks to protect its memory footprint and return backpressure errors to the client.
* **Observed Metrics:**
  * **In-Flight Tasks:** The Orchestrator successfully allowed currently running tasks to finish.
  * **New Task Submissions:** The system instantly started returning `503 Service Unavailable` for new inbound API requests.
  * **Recovery Time:** Once network access was restored, the Orchestrator automatically reconnected within 1.2 seconds and began processing the backlog.
  * **Memory Spikes:** Mitigated. By refusing to buffer infinite tasks locally during the outage, the Orchestrator process stayed well under its 512MB memory limit.

## Drill 3: "Poison Message" (Permanent AI Failure)
**The Test:** We submitted a heavily malformed prompt payload that mathematically guaranteed the LLM API would return a `400 Bad Request` every time it was attempted.
* **Expected Behavior:** The task should fail 3 times (exhausting `maxRetries`) and be parked in the Dead Letter Queue (DLQ).
* **Observed Metrics:**
  * **Attempt 1:** Failed (Delay: 1000ms + Jitter)
  * **Attempt 2:** Failed (Delay: 1000ms + Jitter)
  * **Attempt 3:** Failed. Routed instantly to DLQ.
  * **System Health:** Main queue remained 100% healthy. The poison message was successfully isolated in the DLQ without causing an infinite retry loop.
