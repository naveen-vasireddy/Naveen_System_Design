# ADR-017: Delivery Semantics in Distributed Systems

**Status:** Accepted
**Date:** Day 28

## Context
In a distributed system, components communicate over unreliable networks. Messages can be lost, and acknowledgments (ACKs) can be dropped. We need to decide how to handle message delivery guarantees for our future services (Chat, E-commerce).

## Concepts
1.  **At-Most-Once (Fire & Forget):** Producer sends 1 time. If lost, it's gone.
    *   *Use case:* Sensor metrics, log streams where gaps are okay.
2.  **At-Least-Once (Standard):** Producer retries until it gets an ACK.
    *   *Side Effect:* If the ACK is lost, the Consumer receives duplicates.
    *   *Use case:* Payments, Orders, Chat messages (cannot lose data).
3.  **Exactly-Once:** Ideally, the message is processed exactly 1 time.
    *   *Reality:* This is mathematically impossible to guarantee at the network level (FLP Impossibility).
    *   *Implementation:* We achieve "effectively" exactly-once by using **At-Least-Once delivery + Idempotency Keys** on the consumer side.

## Decision
We will use **At-Least-Once** delivery for all critical flows (Orders, Payments, Chat).
To handle duplicates, we will enforce **Idempotency** on the consumer side using unique keys (e.g., `order_id`, `msg_nonce`).

## Consequences
-   **Producers:** Must implement retry logic (with backoff).
-   **Consumers:** Must track processed IDs (in Redis or DB unique constraints) to discard duplicates.
-   **Complexity:** Increases slightly, but guarantees data integrity.
