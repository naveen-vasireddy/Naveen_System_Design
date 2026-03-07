# ADR 033: Hybrid Fan-out Policy and Sharding Strategy

## Status
Accepted

## Context
Our Social Feed Service currently uses a pure "Fan-out on Write" (push) model. When a user posts, a background worker copies that post to every follower's timeline. This works perfectly for average users. However, if a "mega user" (celebrity) with millions of followers posts, the worker queue gets overwhelmed, causing severe delays for the entire system (the "celebrity problem"). Additionally, a single database node can no longer handle the sheer volume of feed data.

## Decision
We will implement a **Hybrid Fan-out Architecture** and introduce **Database Sharding** [1]:

1. **Hybrid Fan-out (Push + Pull):**
   * **Normal Users (< 100k followers):** We will continue using the "Push" model. When they post, we write the post ID directly into all of their followers' timelines.
   * **Mega Users (>= 100k followers):** We will use the "Pull" model. When they post, we do *not* push the post to their followers. Instead, when a user loads their feed, the system will fetch the user's pre-computed timeline AND pull recent posts from any mega users they follow, merging them together in memory at read-time.

2. **Database Sharding (userId modulo N):**
   * To distribute the massive volume of timeline data, we will partition our database into `N` shards (e.g., `N = 4` to start). 
   * A user's timeline will be stored on a specific shard calculated using a hashing algorithm: `shard_id = userId % N`. 
   * All feed reads and writes for a specific user will be routed to their designated shard.

## Consequences
* **Pros:** Drastically reduces the time it takes for a celebrity's post to go live. Prevents message queue backlogs. Distributes storage and CPU load evenly across multiple database instances.
* **Cons:** Increases read-time latency, as generating a feed now requires fetching the user's timeline from their specific shard *plus* executing additional queries to fetch and merge mega user posts. 

