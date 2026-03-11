# ADR 035: Event Sourcing vs CRUD Trade-offs

## Status
Accepted

## Context
As we move into advanced distributed systems concepts, we are evaluating Event Sourcing (ES) combined with CQRS (Command Query Responsibility Segregation) as an alternative to traditional CRUD data modeling for high-compliance or highly complex domains (like Orders or Payments). In CRUD, the database stores the *current state*, meaning historical transitions are lost unless explicitly logged. In ES, the database stores the *history of events* in an append-only log, and the current state is derived from these events.

## Decision
We will build an Event Store Prototype featuring an append-only log and separate materialized views for reading Order states. We acknowledge the following trade-offs when choosing ES over CRUD:

### Advantages of Event Sourcing (Pros)
1. **Perfect Audit Log:** Because every state change is recorded as an immutable event, we get a 100% accurate, tamper-proof history out of the box. 
2. **Time-Travel Debugging:** We can easily determine the exact state of the system at any given point in the past by replaying events up to that timestamp.
3. **Decoupled Read Models (CQRS):** We can build multiple specialized "read models" (materialized views) optimized for different UI screens without affecting the write path.
4. **Retroactive Projections:** If business requirements change, we can spin up a new read model and replay the entire event log from the beginning of time to populate it.

### Disadvantages of Event Sourcing (Cons)
1. **High Complexity:** Developers are highly accustomed to CRUD. ES requires a massive paradigm shift, steep learning curve, and the implementation of CQRS.
2. **Eventual Consistency:** Because the write log (Command) and the materialized views (Query) are separated, there is a replication lag. The read models are eventually consistent.
3. **Storage Costs:** Storing every single event forever requires significantly more storage space than simply overwriting a single row in a table.
4. **Schema Evolution:** Changing the structure of an event that has already been saved thousands of times in the append-only log is notoriously difficult (often requiring upcasting).

## Consequences
By prototyping this Event Store, we accept the added complexity of CQRS and eventual consistency in exchange for the absolute data certainty and decoupled read performance that Event Sourcing provides.