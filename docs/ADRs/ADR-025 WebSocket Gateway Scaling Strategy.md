
# ADR-025: WebSocket Gateway Scaling and Routing Strategy

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | Day 45 |

---

## 1. Context & Problem Statement

We are building the Gateway for a Real-Time Chat application. Standard REST APIs are stateless, meaning a Load Balancer can route any HTTP request to any available server. However, WebSockets require persistent, stateful TCP connections.

**The Problem:** If User A connects to Gateway Node 1, and User B connects to Gateway Node 2, they cannot directly communicate. Node 1 has no idea that User B exists on Node 2. We need a horizontally scalable architecture that allows cross-node message routing without creating a massive bottleneck.

---

## 2. Alternatives Considered

We evaluated three primary architectures for scaling WebSockets:

### Option A: Database Polling ❌ Rejected

- **Mechanism:** Every time a user sends a message, Node 1 saves it to the PostgreSQL database. Node 2 constantly polls the database (e.g., every 1 second) to see if there are new messages for its connected users.
- **Trade-offs:** Extremely high database load. Latency is bottlenecked by the polling interval, destroying the "real-time" feel.

### Option B: Peer-to-Peer Mesh (Inter-Node RPC) ❌ Rejected

- **Mechanism:** Gateway nodes discover each other (via a service registry like Consul or Zookeeper). When Node 1 receives a message for User B, it uses gRPC to ask all other nodes, "Who has User B?" and forwards the message directly.
- **Trade-offs:** Very complex to implement. As the cluster grows to dozens of nodes, the inter-node chatter grows exponentially (O(N²) connections), making it hard to manage cluster state.

### Option C: Stateless Gateways with a Pub/Sub Backplane ✅ Selected

- **Mechanism:** The WebSocket nodes act only as connection holders. They do not talk to each other directly. Instead, they all connect to a highly optimized message broker (Redis Pub/Sub or Kafka). When a message is sent, it goes to the broker, which broadcasts it to all Gateway nodes.

---

## 3. Decision

**We will implement Option C (Stateless Gateways + Redis Pub/Sub).**

To support this, we will also implement **Centralized Presence Tracking**. Because a single node only knows about its own connections, we cannot rely on local memory to know if a user is "Online". We will use Redis as the source of truth for user presence.

---

## 4. Implementation Details

### Step 1: Connection
When a user connects, the Load Balancer assigns them to a Gateway node using a standard Round-Robin algorithm. Sticky sessions are not strictly required.

### Step 2: Local State
Each Gateway maintains a fast, in-memory `Map<UserId, WebSocket>` strictly for the users connected directly to it.

### Step 3: Presence
Upon connection, the Gateway writes a heartbeat key to Redis:
```
SET user:{id}:presence online EX 60
```
A background interval will refresh this TTL every 45 seconds to keep the user marked as online.

### Step 4: Routing via Pub/Sub
All Gateway nodes subscribe to a global `chat-messages-topic`.

### Step 5: Delivery
When Node 1 receives a message from User A:
1. The message is persisted
2. Published to the Redis topic (via the Outbox worker)
3. Redis fans this out to Node 1, Node 2, Node 3, etc.
4. Node 2 receives the event, checks its local Map
5. Finds User B's socket and pushes the message down the wire

---

## 5. Consequences & Trade-offs

### ✅ Pros

- **Horizontal Scalability:** We can seamlessly add or remove Gateway nodes to handle more concurrent TCP connections without reconfiguring the cluster.
- **Simplicity:** Nodes do not need to know about the existence of other nodes.

### ⚠️ Cons

- **Pub/Sub Bottleneck:** The Redis Pub/Sub cluster becomes the central nervous system. If Redis goes down, cross-node communication completely stops, even if the WebSocket connections remain open.
- **Unnecessary Processing (Fan-out waste):** If we have 50 Gateway nodes, a message published to the topic is sent to all 50 nodes, even if the recipient is only connected to 1 node. *(Note: This can be optimized later by using Room-specific Redis channels instead of a single global topic.)*