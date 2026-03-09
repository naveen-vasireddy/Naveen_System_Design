# ADR 034: Recovery Plan and Duplicate Suppression

## Status
Accepted

## Context
Our Social Feed Service utilizes an asynchronous, hybrid fan-out architecture. If our background workers crash or our message broker experiences an outage, published posts will not be distributed to followers' timelines. Furthermore, most robust message brokers guarantee "at-least-once" delivery, meaning when the system recovers, it might accidentally deliver the same fan-out job to our workers multiple times. 

## Decision
We will implement the following strategies for outage recovery and duplicate suppression:

1. **Backfill Strategy (Cursor Replay):**
   * We will maintain a persistent, append-only log of all published posts in our primary database.
   * If the fan-out workers experience an extended outage, an admin can trigger a "Backfill Script." This script will query the primary database for all posts created after the recorded downtime timestamp and push them back into the message broker queue for processing.

2. **Duplicate Suppression (Idempotency):**
   * To prevent the same post from showing up multiple times in a user's feed (due to worker retries or backfill replays), the timeline insert operation must be **idempotent**.
   * We will enforce this at the database level. The `timeline` table on each shard will have a `UNIQUE` constraint on `(user_id, post_id)`.
   * When the worker attempts to write a post to a timeline, it will use an `INSERT ... ON CONFLICT DO NOTHING` SQL command.

## Consequences
* **Pros:** The system can recover from total message broker loss without dropping data. Timelines will remain clean and duplicate-free even if jobs are processed multiple times.
* **Cons:** Adding unique constraints to the timeline shards introduces a slight performance overhead during the database write phase, but it is a necessary trade-off for data integrity.
