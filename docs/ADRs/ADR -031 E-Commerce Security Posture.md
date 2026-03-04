# ADR 031: E-Commerce Security Posture (RBAC, Validation, and Audit)

## Status
Accepted

## Context
As our e-commerce microservices (Catalog, Inventory, Orders, Payments) expand, we must secure our endpoints against malicious data and unauthorized access. We need to differentiate between standard customers placing orders and administrators managing products or issuing refunds. Furthermore, for compliance and debugging, all critical administrative actions must be traceable.

## Decision
We will implement a three-tiered security posture across our API Gateway and microservices:

1. **Input Validation:** All incoming API requests will undergo strict schema validation (e.g., via Zod, Joi, or OpenAPI middleware) before hitting business logic. Any payload containing unexpected fields or malformed data types will be immediately rejected with a `400 Bad Request`.
2. **Admin RBAC (Role-Based Access Control):** Authentication JWTs will now include a `role` claim (`customer` vs `admin`). We will introduce a centralized authorization middleware that restricts sensitive endpoints (e.g., `POST /catalog/products`, `POST /refunds`) strictly to users with the `admin` role.
3. **Audit Logs:** Any state-mutating action performed by an `admin` will be recorded in an append-only Audit Log. This log will capture the `adminId`, `action` (e.g., `UPDATE_INVENTORY`), `targetResource`, `timestamp`, and the `payload`.

## Consequences
* **Pros:** Drastically reduces the attack surface for injection attacks and privilege escalation. Provides clear traceability for destructive actions.
* **Cons:** Adds slight latency to API requests due to JWT decoding and schema validation. The audit log will require its own storage management and rotation strategy over time.
