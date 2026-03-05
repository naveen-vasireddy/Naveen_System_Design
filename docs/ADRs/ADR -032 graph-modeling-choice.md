# ADR 032: Graph Modeling Choice for Social Feed

## Status
Accepted

## Context
We are starting Project 6: Social Feed Service. To generate a user's timeline, we must model the social graph (who follows whom) and efficiently query this data during the fan-out process when a new post is published. We need to decide whether to introduce a dedicated Graph Database (e.g., Neo4j) or use our existing PostgreSQL infrastructure.

## Decision
We will use an **Adjacency List in PostgreSQL** to model the graph. 

The schema will consist of a `follows` table with `follower_id` and `followee_id`, utilizing composite primary keys and B-Tree indexes on both columns.

## Justification
1. **Query Depth:** The feed generation process only requires 1-level deep graph traversals (e.g., "Get all users that User A follows" or "Get all followers of User A"). Graph databases shine when doing deep, multi-hop traversals (e.g., "friends of friends of friends"), which is not required for our core publish/read paths.
2. **Operational Simplicity:** We are already utilizing Postgres for our other microservices. Introducing a new database paradigm adds operational overhead, deployment complexity, and a new query language to learn.
3. **Performance:** With proper indexing, Postgres can easily handle adjacency list lookups in milliseconds, which is more than sufficient for the fan-out worker payloads we will build tomorrow.

## Consequences
* **Pros:** Zero new infrastructure required; standard SQL queries; easy to shard by `userId` later if the table grows too large.
* **Cons:** If product requirements change to include complex recommendation engines (e.g., "suggested users based on mutual connections"), Postgres will struggle with the recursive JOINs, and we may need to migrate those specific read-models to a Graph DB in the future.
