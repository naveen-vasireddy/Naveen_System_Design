# ADR-026: Backpressure and Load Shedding Policy for WebSocket Fan-out

Status: Accepted
## Day 47

### 1. Context & Problem Statement

Our Real-Time Chat Gateway handles thousands of concurrent WebSocket connections per node. During high traffic events like       
livestreams, servers must broadcast messages to all connected clients. However, due to varying network conditions, clients       
consume data at different speeds. If Node.js writes to a slow client's WebSocket faster than the underlying TCP connection       
can acknowledge, it buffers unsent data in memory. If 5,000 clients have slow connections during a message spike, the 
server's RAM will fill up with buffered messages, leading to an Out-Of-Memory (OOM) crash that takes down the node for all       
users.

### 2. Alternatives Considered

- Option A: Unbounded Buffering (Naive Approach)
  - Mechanism: Keep queuing messages in memory until the TCP socket catches up.
  - Trade-off: Guarantees message delivery, but risks catastrophic server failure (OOM) under load. (Rejected)
- Option B: Pause Consumption (Upstream Backpressure)
  - Mechanism: If one client is slow, stop reading new messages from the Redis Pub/Sub topic until the slow client catches       
up.
  - Trade-off: Unfairly penalizes users with fast connections. One user on a bad network ruins the chat experience for
everyone else. (Rejected)
- Option C: Aggressive Disconnect
  - Mechanism: If a client's outbound buffer exceeds a certain threshold, forcefully close their WebSocket connection.
  - Trade-off: Protects the server, but results in a terrible User Experience (UX). The client will immediately try to 
reconnect, creating a "thundering herd" problem that adds more load to the server. (Rejected)
- Option D: Ring Buffer with Load Shedding (Drop Strategy)
  - Mechanism: Maintain a fixed-size queue (e.g., 100 messages) per client. If the queue fills up, drop the oldest messages      
to make room for the newest, and send the client a warning that they missed data. (Selected)

### 3. Decision

We will implement Option D (Ring Buffer with Load Shedding) combined with Time-based Batching:

1. Batching: Instead of sending individual WebSocket frames for every message, the server will buffer incoming messages and      
flush them to the client every 100ms as a single JSON array. This drastically reduces TCP packet overhead.
2. Ring Buffer Limit: Each client connection will have a maximum buffer size of 100 messages.
3. Drop Strategy: If a client's buffer exceeds 100 messages, we will slice the buffer to keep only the newest 50 messages.       
We will insert a special event `{ "type": "gap_detected" }` at the beginning of their queue.

### 4. Implementation Details

The BroadcastService will maintain a `messageBuffer` array for each client. Every 100ms, a `setInterval` loop will iterate       
through all clients. If a client's WebSocket `readyState` is OPEN, the server stringifies the array, sends it, and clears        
the buffer. If the array length exceeds 100 before the interval fires, the slicing logic executes.

### 5. Consequences & Trade-offs

- Pros:
    - Server Stability: Memory consumption per WebSocket connection is strictly capped. The server cannot OOM due to slow        
clients.
    - CPU Efficiency: Batching reduces the number of expensive I/O system calls.
- Cons:
    - Message Loss: Slow clients will permanently lose live messages if they fall too far behind.
    - Client Complexity: The frontend application must be smart enough to listen for the `gap_detected` event. When it
receives this event, the frontend must pause rendering, make a REST API call to `GET /rooms/:id/messages` to fetch the
missing history from the database, and then stitch the timeline back together.
