# Integration Notes: Ecommerce Event Sourcing & Audit Read Models

## Overview
During the E-commerce Backend project (Project 5), we utilized Saga Orchestration to manage distributed transactions across Catalog, Inventory, Orders, and Payments. While the primary operational databases handle high-throughput CRUD operations, we have integrated an **Event Sourcing (ES) Read Model** to satisfy strict compliance, auditing, and customer support requirements.

## How the Integration Works

1. **Event Capture (Append-Only Log)**
   As the Saga Orchestrator processes an order, it publishes immutable domain events (e.g., `OrderPlaced`, `InventoryReserved`, `PaymentProcessed`, `OrderShipped`) to a Kafka topic. An Audit Consumer listens to this topic and appends these events to our `AuditEventStore`. No data is ever updated or deleted in this store.

2. **Current State Projection (Materialized View)**
   When a customer support agent views an order, they do not need to query 4 different microservices. Instead, they query the `OrderAuditView`. This read model dynamically projects the current state of the order by streaming the event log and applying a reducer pattern (e.g., summing up payments, appending items to an array). 

3. **Time-Travel Debugging**
   Because we store the entire history of facts, our system supports "Time-Travel." If a bug is reported or a financial dispute arises, an admin can pass a specific Unix timestamp to the `getEventsUpTo(orderId, timestamp)` function. The system will replay the event log *only up to that exact millisecond*, allowing the admin to see exactly what the user saw at that specific moment in time.

## Value Delivered
By decoupling the Audit Read Model from the transactional E-commerce databases, we achieved a **tamper-proof audit trail** without slowing down the primary checkout flow (avoiding write amplification on the hot path).
