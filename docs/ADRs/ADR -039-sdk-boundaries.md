# ADR 039: Agent SDK Boundaries

## Status
Accepted

## Context
We are building an **Agent SDK** that will allow developers to easily create specialized AI workers (e.g., a "Research Agent" or "Summary Agent") and connect them to our central Orchestrator. We need to clearly define what logic belongs inside this SDK versus what belongs in the central Orchestrator. 

If the SDK handles too much (e.g., managing its own advanced retry logic or complex queue polling mechanisms), it becomes incredibly difficult to maintain SDKs across different languages (like TypeScript and Python).

## Decision
We will enforce a **"Thick Orchestrator, Thin SDK"** boundary model.

### 1. Orchestrator Responsibilities (The "Thick" Brain)
* **Retries & DLQ:** The Orchestrator decides if a failed task should be retried or sent to the Dead Letter Queue.
* **Backpressure & Rate Limiting:** The Orchestrator manages concurrency limits.
* **Routing:** The Orchestrator handles consistent hashing and task assignment.

### 2. Agent SDK Responsibilities (The "Thin" Sandbox)
The SDK provides a strict, sandboxed interface (`init`, `handle`, `shutdown`) for the agent to execute tasks [1]. It is strictly responsible for:
* **Timeouts:** Wrapping the `handle` execution in a strict timeout. If the underlying LLM call hangs indefinitely, the SDK terminates the execution and reports a failure to the Orchestrator [1].
* **Idempotency Safeguards:** Ensuring that if the Orchestrator sends the exact same task twice (due to a network timeout), the agent safely handles the duplicate execution without causing unintended side effects [1].
* **Lifecycle Management:** Gracefully connecting to the Orchestrator (`init`) and disconnecting (`shutdown`) [1].

## Consequences
### Advantages
* **Multi-Language Support:** Because the SDK is "thin", we can easily build a Python version of the SDK in the future for data science teams.
* **Predictability:** All complex failure routing is centralized in the Orchestrator, making debugging much easier.

### Limitations
* Agents are entirely dependent on the Orchestrator to survive. If an agent loses its connection to the Orchestrator, it cannot independently pull tasks from the queue.