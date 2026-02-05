# ADR-019: Rate Limiting Identity Strategy (Keys)

**Status:** Accepted
**Date:** Day 31

## Context
A Rate Limiter Service must know *who* it is limiting. We need a strategy for generating keys that is flexible enough for IP-based limiting (DDoS protection) and User-based limiting (Tiered plans).

## Options Considered
1.  **IP Address Only:** Easiest to implement. Fails for users behind NATs (e.g., offices, universities) who share one IP.
2.  **User ID Only:** Precise. Fails for unauthenticated traffic (login endpoints).
3.  **Composite Keys (Strategy Pattern):** The client constructs the key based on context.

## Decision
We will use **Composite Keys** passed by the client.
The Rate Limiter Service is "dumb"; it does not extract IPs or headers. It accepts a `key` string string.

## Implementation
*   **Unauthenticated:** `ip:<ip_address>`
*   **Authenticated:** `user:<user_id>`
*   **Specific Route:** `ip:<ip>:/login` or `user:<id>:upload`

## Consequences
*   **Flexibility:** The calling service (API Gateway) decides the granularity.
*   **Simplicity:** The Rate Limiter Service doesn't need to parse HTTP headers or JWTs.
