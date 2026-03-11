# Design Document: Event Sourcing & CQRS Operational Challenges

## 1. Write Amplification in CQRS
In a traditional CRUD system, an update usually means a single write to a database row. In a CQRS (Command Query Responsibility Segregation) architecture, a single action can result in massive **write amplification**. 

When an event (e.g., `OrderCreated`) is appended to the Event Store, it is subsequently broadcasted to a message broker. Multiple isolated consumers listen to this event to update their own Materialized Views (Read Models). 

* **The Challenge:** A single command might trigger writes to an `OrderHistoryDB`, a `UserDashboardCache`, a `FinancialLedgerDB`, and an `InventorySearchIndex`. If the message broker or database is not provisioned for this high write throughput, the replication lag increases, making the read models highly eventually consistent (stale data).
* **Mitigation:** Batch processing events before updating read models, and scaling the read-model consumer microservices independently based on their specific database write speeds.

## 2. Replay Cost & Snapshotting
One of the primary benefits of Event Sourcing is the ability to destroy a materialized view and rebuild it perfectly by replaying every event since the beginning of time. 

* **The Challenge:** If a user has an order with 10,000 status changes and item additions over 5 years, calculating their current state requires fetching and processing all 10,000 events. If we need to rebuild the entire system's read model from a log of 500 million events, the CPU and memory **replay cost** could take days.
* **Mitigation (Snapshots):** We must implement **Snapshotting**. Every *N* events (e.g., every 100 events), the system calculates the current state and saves it as a "Snapshot." When a read model needs to be rebuilt, it fetches the most recent Snapshot and only replays the events that occurred *after* that snapshot was taken.

## 3. Schema Evolution (Immutability vs. Change)
Because Event Sourcing relies on an append-only log of immutable facts, you cannot run an `ALTER TABLE` or update historical events when your business requirements change. 

* **The Challenge:** Suppose we change our `ItemAdded` event schema to include a `currency` field. We now have 1 million old events without a `currency` field, and new events with one. Our materialized view logic will crash when replaying old events because it expects a field that doesn't exist.
* **Mitigation (Upcasting & Versioning):** 
  1. **Event Versioning:** We append the version to the event name (e.g., `ItemAdded_V1`, `ItemAdded_V2`). The read model must contain `switch` cases to handle both versions appropriately.
  2. **Upcasting:** We build an "Upcaster" middleware. When old `ItemAdded_V1` events are pulled from the database, the Upcaster intercepts them and dynamically transforms them into `ItemAdded_V2` objects (e.g., by injecting a default `currency: "USD"`) *before* handing them to the read model. The database remains untouched, but the application code only ever deals with the newest schema.