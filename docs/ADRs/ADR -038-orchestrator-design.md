# ADR 038: Multi-Agent AI Orchestrator Design

## Status
Accepted

## Context
As we build a Multi-Agent AI system, we need a reliable way to distribute workloads (prompts/tasks) across various specialized AI agents. A naive direct-messaging approach between agents or clients leads to lost tasks if an agent crashes, API rate-limit bottlenecks, and a lack of observability. We need a robust coordination layer to manage task states, retries, and failures.

## Decision
We will build a centralized **Agentic Orchestrator** pattern comprising the following core components:

1. **Task Queue & State Store:** A centralized database/queue (e.g., Postgres/Redis) to track every task's lifecycle.
2. **The Orchestrator:** A centralized service that receives tasks, schedules them, and routes them to the appropriate agent queues. 
3. **Agent Workers:** Independent, horizontally scalable workers that pull tasks from the Orchestrator, execute the AI logic (SDK interactions), and report back success or failure.
4. **Dead Letter Queue (DLQ):** A specialized queue for tasks that have permanently failed after exceeding their maximum retry count.

### Task Lifecycle states
Tasks will enforce a strict state machine: `PENDING` -> `RUNNING` -> `COMPLETED` | `FAILED`. 
If a task fails, it transitions back to `PENDING` until it exhausts its retries, after which it transitions to `DLQ`.

## Consequences
### Advantages
* **Resilience:** If an agent node crashes mid-task, the Orchestrator's timeout mechanism will catch it and safely requeue the task.
* **Scalability:** We can easily spin up more workers for heavily utilized agent types (e.g., scaling up "Summary Agents" while keeping "Research Agents" at baseline).
* **Observability:** Centralizing state allows us to build a UI dashboard to monitor exactly what every agent is doing at any given moment.

### Limitations
* **Single Point of Failure:** The Orchestrator and its backend State Store become the critical bottleneck for the entire system. We will need to plan for high availability and potential sharding down the line.
