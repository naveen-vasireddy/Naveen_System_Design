# Kafka Design & Configuration

## 1. Core Concepts
*   **Topic:** A category of messages (e.g., `orders`, `chat-messages`).
*   **Partition:** The unit of parallelism. A topic is split into logs (P0, P1, P2).
*   **Offset:** The unique ID of a message within a partition.

## 2. Topic Definitions
We will use the naming convention: `domain.entity.event`.

| Topic Name | Partitions | Replication Factor | Key Strategy | Retention |
| :--- | :--- | :--- | :--- | :--- |
| `chat.room.events` | 6 | 3 | `room_id` | 30 Days |
| `ecommerce.orders` | 3 | 3 | `order_id` | Permanent (Compact) |
| `system.logs` | 12 | 1 | `null` (Round Robin) | 7 Days |

## 3. Producer Design
We prioritize **Durability** over Latency.
*   **`acks=all`**: The leader must wait for all replicas to acknowledge the write. Prevents data loss if a broker crashes.
*   **`retries=MAX_INT`**: Retry indefinitely on transient network errors.
*   **`enable.idempotence=true`**: Prevents duplicates if the network drops the ACK (solves the issue we simulated on Day 28).

## 4. Consumer Design
We prioritize **Consistency**.
*   **Consumer Groups:** Services will scale by adding instances to a group. If a topic has 6 partitions, we can scale up to 6 consumer instances.
*   **Auto-Commit:** `false`. We will manually commit offsets *after* successfully processing logic to ensure **At-Least-Once** processing.

## 5. Scaling Plan
*   If `chat.room.events` becomes too slow, we increase partitions from 6 to 12.
*   *Note:* Changing partition count breaks key-hashing mapping, so we must be careful with stateful re-processing.

