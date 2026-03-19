# Multi-Agent AI Orchestrator: Architecture & Schemas

## 1. High-Level Architecture
The Orchestrator system is composed of five core components that work together to guarantee reliable AI task execution:

1. **Orchestrator Service:** The central brain. It exposes a REST API to accept new tasks, schedules them into the queue, and monitors agent health.
2. **State Store (PostgreSQL):** The ultimate source of truth. It records every task's current state, retry count, and final output.
3. **Task Queue (Redis/RabbitMQ):** A fast, in-memory message broker that routes tasks from the Orchestrator to the appropriate Agent worker based on `agentType`.
4. **Agents (Workers):** Stateless, horizontally scalable Node.js/Python processes. They pull tasks from the queue, execute the AI logic (e.g., calling OpenAI APIs), and report the result back to the Orchestrator.
5. **Minimal UI:** A simple React dashboard that polls the State Store to display task progress and Dead Letter Queue (DLQ) metrics in real-time.

## 2. Task Lifecycle States
Every task strictly follows this state machine:
* **PENDING:** Task is saved in the State Store and waiting in the Task Queue.
* **RUNNING:** An Agent has picked up the task and is actively executing it.
* **COMPLETED:** The Agent successfully finished the task and saved the output.
* **FAILED:** The Agent encountered an error. If `retryCount < maxRetries`, the task reverts to `PENDING`.
* **DLQ (Dead Letter Queue):** The task has failed repeatedly and exceeded `maxRetries`. It is parked here for manual human review.

## 3. Core Schemas (TypeScript)

### Task Schema
```typescript
enum TaskState {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  DLQ = 'DLQ'
}

interface Task {
  id: string;                  // UUID
  agentType: string;           // e.g., 'RESEARCH_AGENT', 'SUMMARY_AGENT'
  payload: Record<string, any>; // The prompt or input data for the AI
  state: TaskState;            // Current lifecycle state
  result?: string;             // AI output (populated when COMPLETED)
  error?: string;              // Last error message (if FAILED or DLQ)
  
  // Retry & DLQ Mechanics
  retryCount: number;          // Defaults to 0
  maxRetries: number;          // Defaults to 3
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
Agent Registration Schema
enum AgentStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE'
}

interface AgentNode {
  id: string;                  // Worker UUID
  type: string;                // The type of tasks this agent can handle
  status: AgentStatus;         
  lastHeartbeat: Date;         // Used by Orchestrator to detect crashed agents
}

```