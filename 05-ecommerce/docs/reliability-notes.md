# Reliability & Idempotency Strategy

## Context
In distributed systems, network requests can fail or timeout *after* the server has successfully processed the request, but *before* the client receives the response. If a user retries a checkout request, they risk being charged twice and draining our inventory.

## Decision
We will implement an **Idempotency Key** pattern across our write-heavy APIs (Orders and Payments).

1. **Client-Generated Keys:** The web/mobile client must generate a unique UUID (Idempotency-Key) when the user clicks "Checkout" and send it in the HTTP headers.
2. **Order Idempotency:** The Orders service will store this key. If a request arrives with an already-processed key, the server will skip the Saga Orchestration and simply return the cached `SUCCESS` response.
3. **Retry-Safe Payments:** The Payments service will pass this same key to the external payment gateway (e.g., Stripe). Stripe natively supports idempotency keys, ensuring the actual credit card is only charged once, no matter how many times our Orchestrator accidentally retries the `Charge` command.
