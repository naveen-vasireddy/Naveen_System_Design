# ADR: When to Use Logical vs. Wall-Clock Time

## Status
Accepted

## Context
Following our implementation of Lamport timestamps to resolve physical clock skew, we now have two distinct concepts of "time" within our distributed architecture:
1. **Wall-Clock Time:** Physical time derived from standard NTP servers (e.g., `2026-03-18T14:05:00Z`).
2. **Logical Time:** Integer counters used to determine causality (e.g., `Lamport: 42`).

We need a strict policy on when developers should use which type of time. Relying on physical time for system operations causes race conditions and data corruption during network delays. Conversely, exposing logical integers to end-users creates a confusing User Experience (UI).

## Decision
We will enforce a strict boundary between machine-time and human-time across all services:

### 1. When to Use Logical Clocks (Causality & Ordering)
Logical clocks (Lamport timestamps or Vector Clocks) MUST be used for all internal distributed system operations where **exact ordering matters**. 
* **Database Writes & Conflict Resolution:** Deciding which update to a user's profile happened "last."
* **Event Sourcing & Message Queues:** Ordering events arriving out-of-sequence in Kafka or RabbitMQ.
* **Distributed Locks:** Determining which node requested a lock first during leader election.

### 2. When to Use Wall-Clock Time (UI & Analytics)
Physical wall-clock time MUST be used whenever the data interfaces with humans or external reporting systems where **causality is less important than readability**.
* **User Interfaces (UI):** Displaying "Message sent at 2:05 PM" to users on the frontend.
* **Application Logging:** Writing `stdout` logs for developers to read during debugging.
* **Business Analytics & Billing:** Grouping transactions by daily/monthly intervals for human reports.

## Consequences
By cleanly separating these two concepts, we protect the structural integrity of our distributed backend (avoiding clock skew failures) while maintaining a natural, intuitive experience for our end-users. UI clients will pass physical timestamps strictly for display purposes, but backend routers will append logical timestamps to ensure safe processing.
