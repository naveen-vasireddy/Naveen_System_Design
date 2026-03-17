# ADR 037: Ordering Guarantees & Logical Clocks

## Status
Accepted

## Context
As our distributed system scales, we frequently need to order events that happen across different servers (e.g., in a chat system or an e-commerce saga). Relying on physical wall clocks (NTP) is fundamentally unsafe due to **clock skew**; individual server clocks drift at different rates. If Server A creates an event and sends it to Server B, Server B's physical clock might be slightly behind Server A's, making it look like the event was received *before* it was created. This destroys our ability to guarantee causal ordering.

## Decision
To guarantee reliable event ordering, we will implement **Lamport Timestamps** (a type of logical clock) to establish a "happens-before" relationship. 

Instead of attaching a physical time (e.g., `10:05:01.123 PM`) to events, every node maintains a simple integer counter. 
1. When a node performs an action, it increments its counter and attaches this logical timestamp to the event.
2. When a node receives a message, it updates its own counter to be `max(local_counter, message_counter) + 1`.

## Consequences
### Advantages
* **Causal Ordering:** We can mathematically guarantee the order of events that causally affect each other, regardless of how badly the physical servers' clocks have drifted.
* **Simplicity:** It requires only a single integer counter attached to messages, adding virtually zero network or storage overhead.

### Limitations
* **Concurrent Events:** Lamport timestamps can tell us if Event A *caused* Event B. However, if two events happen at the exact same logical time on two independent servers that haven't communicated, Lamport clocks cannot tell us which one happened first in the real world. 
* **Intrusion:** We must ensure that *every* message passed between our microservices includes the logical timestamp in its payload or headers.