# ADR-025: WebSocket Gateway Scaling Strategy

**Status:** Accepted
**Date:** Day 45

## Context
We are building a real-time chat gateway using WebSockets. Unlike HTTP requests which are stateless and can be routed to any server, WebSockets create long-lived, stateful TCP connections. We need a strategy to scale this gateway horizontally to support tens of thousands of concurrent users.

## Decision
1.  **Stateless Gateway Nodes:** The WebSocket servers themselves will only hold connection state (the active socket). They will not hold business logic or chat history.
2.  **Redis Pub/Sub for Routing:** When a message is sent to a chat room, the Gateway will publish it to a Redis Pub/Sub channel (or Kafka topic). All Gateway nodes will subscribe to these channels and push the message down to any connected clients on their specific node.
3.  **Presence Tracking:** User online/offline status will be tracked using Redis (`SET user:status online EX 60`), with the Gateway sending periodic heartbeats to maintain the status.

## Consequences
*   **Pros:** We can add as many Gateway nodes as needed. Load balancers can simply use round-robin (no sticky sessions strictly required for the WebSocket handshake, though helpful).
*   **Cons:** High reliance on the pub/sub backplane. If the pub/sub broker fails, cross-node communication halts.