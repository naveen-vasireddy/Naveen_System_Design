# ADR-018: Kafka Partitioning Strategy

**Status:** Accepted
**Date:** Day 30

## Context
In our future distributed systems (Rate Limiter, Chat, E-commerce), we need to process high volumes of events. We must decide how to distribute these events across Kafka partitions to balance **scalability** (parallel processing) against **ordering guarantees**.

## Options Considered
1.  **Round Robin (Random):** Producer sends messages to partitions P0, P1, P2... in a loop.
    *   *Pros:* Perfectly even load balancing.
    *   *Cons:* No ordering guarantees. "Order Created" and "Order Paid" for the same ID might land on different partitions and be processed out of order.
2.  **Key-based Partitioning (Semantic):** We hash a key (e.g., `user_id` or `order_id`) to select the partition.
    *   *Pros:* Guarantees that all events for a specific entity land on the same partition, ensuring strict ordering.
    *   *Cons:* Risk of "Hot Partitions" if one user generates 1000x more data than others.

## Decision
We will use **Key-based Partitioning** by default.

## Rationale
For our use cases, **Message Ordering** is critical:
1.  **Chat:** Messages in a room must appear in the order they were sent.
2.  **E-commerce:** A "Payment Processed" event cannot happen before "Order Created".
3.  **Rate Limiter:** Counters must be atomic and sequential for a specific user.

## Implementation Rules
*   **Chat:** Key = `room_id` (Ensures conversation consistency).
*   **E-commerce:** Key = `order_id` (Ensures order lifecycle consistency).
*   **Analytics:** Key = `null` (Round robin is acceptable for stateless logs).

