# ADR 028: Domain Boundaries for E-Commerce

## Status
Accepted

## Context
We are building an e-commerce backend. If we put all logic into a single database and service (a monolith), a massive spike in product searches could consume all database resources and crash our ability to process checkout payments. We need to isolate failure domains and scale them independently.

## Decision
We will use Domain-Driven Design (DDD) to split the system into four Bounded Contexts:
1. **Catalog:** Read-heavy. Handles product listings, descriptions, and pricing.
2. **Inventory:** High-concurrency write-heavy. Strictly handles stock levels (e.g., reserving 1 item of SKU-123).
3. **Orders:** The Saga Orchestrator. Manages the state machine of an order (Pending -> Reserved -> Paid -> Finalized).
4. **Payments:** An isolated wrapper around external payment gateways (e.g., Stripe) to handle charges and refunds securely.

## Consequences
* **Pros:** Independent scaling (Catalog can scale up during a flash sale without affecting Orders). Isolated databases prevent database-level locking issues.
* **Cons:** Distributed transactions. Since an Order spans the Inventory and Payments services, we cannot use standard SQL transactions and must use a Saga pattern with compensations to roll back failures.
