# ADR 029: Saga Orchestration vs. Choreography

## Status
Accepted

## Context
Our checkout process spans three distinct Bounded Contexts: Orders, Inventory, and Payments. We need a way to manage distributed transactions. If a payment fails after inventory has already been reserved, we must reliably release that inventory (compensation) to avoid permanent stock lock-ups.

## Decision
We will implement the **Saga Pattern using Orchestration** (controlled by the Orders Service) rather than Choreography.

*   **Flow:** The Orders Service will act as the "Brain." It will command the Inventory service to `Reserve`. If successful, it commands the Payments service to `Charge`. If successful, it updates the order to `FINALIZED`.
*   **Compensation:** If the `Charge` fails, the Orders Service explicitly commands the Inventory service to `Release` (compensate) the previously reserved stock, and marks the order as `FAILED`.

## Consequences
*   **Pros:** The entire state machine of an order is visible in one place (the Orders database). It is much easier to debug and track the status of a complex checkout flow.
*   **Cons:** The Orders Service becomes a slight central point of coupling. It must know about the commands for Inventory and Payments. However, for a core domain like e-commerce checkout, this centralized control is worth the trade-off to prevent "lost" events and complex circular dependencies.

