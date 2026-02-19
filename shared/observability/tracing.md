# Tracing and Correlation Strategy

**Date:** Day 44

## Concept
To debug requests spanning multiple microservices (e.g., API Gateway -> Order Service -> Payment Service), we use a **Correlation ID**. 

## Implementation Rules
1.  **Ingress (Gateway):** Every external request entering the system must pass through the `tracingMiddleware`. If the client does not provide an `X-Correlation-ID` header, the gateway will generate a UUIDv4.
2.  **Propagation (Service to Service):** When Service A makes an HTTP/gRPC call to Service B, it **must** inject the `X-Correlation-ID` into the outgoing request headers.
3.  **Logging:** Every log entry (INFO, WARN, ERROR) written by our structured logger must include the `correlationId` field if it is processing a request.
4.  **Async/Events:** When publishing an event to Kafka or a Queue (e.g., `OrderCreated`), the Correlation ID must be included in the event payload or metadata headers so the consuming worker can continue the trace.

## Example Flow
`Client -> [X-Correlation-ID: 123] -> API Gateway -> [X-Correlation-ID: 123] -> Payment Service`
