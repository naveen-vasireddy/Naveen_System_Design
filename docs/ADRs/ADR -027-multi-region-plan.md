# ADR 027: Multi-Region Deployment Plan for Real-Time Chat

## Status

Accepted
------------

## Context & Problem Statement

Currently, our real-time chat application (WebSocket Gateway, Outbox Worker, Redis, and PostgreSQL) runs        
within a single datacenter (DC) or cloud region. In the event of a catastrophic failure, such as a total        
network partition, power outage, or natural disaster, all active WebSocket connections will drop, making        
it impossible for users to send or receive messages. We need a comprehensive disaster recovery (DR)
strategy to route users to a secondary geographic region. The solution must address:

1. The Thundering Herd Problem: Thousands of disconnected clients instantly trying to reconnect to a 
backup server.
2. State Management: How to handle ephemeral data (Redis pub/sub) versus persistent data (PostgreSQL
messages and outbox) across vast geographic distances.
3. Traffic Routing: How to seamlessly redirect global user traffic to the backup region.

## Decision

We will adopt an Active-Passive (Warm Standby) Multi-Region Architecture with the following specific
configurations:

### Global Traffic Routing (DNS & Load Balancing)

1. Implement DNS-based failover (e.g., AWS Route 53 or Cloudflare Global Anycast) with active health 
checks monitoring our primary WebSocket Gateways.
2. If the primary region fails health checks for 3 consecutive intervals, DNS will automatically failover       
to the secondary region's IP addresses.
3. Maintain a low DNS TTL (Time to Live) of 60 seconds to ensure clients resolve the new regional IP
quickly.

### Client-Side Resilience (Mitigating the Thundering Herd)

1. Clients are not allowed to reconnect immediately upon a WebSocket onClose event.
2. Clients must implement Exponential Backoff with Jitter.
   - Formula: Delay = min(2^attempt * 100ms, max_delay) + random_jitter. This ensures that when the DNS
switch occurs, the influx of traffic to the backup region is smoothed out over several seconds or minutes,      
preventing the secondary region from immediately crashing under the load.

### Database Replication & State (PostgreSQL)

1. PostgreSQL will be configured with a cross-region asynchronous read-replica.
2. In the event of a primary DC failure, the replica in the secondary DC will be automatically promoted to      
the primary master.
   - Trade-off: Because replication is asynchronous to avoid penalizing standard message write latency, we      
accept an RPO (Recovery Point Objective) of a few seconds. A handful of the very last messages sent right       
before the crash may be lost and will require users to resend them.

### Ephemeral State (Redis Pub/Sub)

1. Redis will not be replicated cross-region. Cross-region Redis replication introduces severe latency and      
complexity.
2. Instead, the secondary region will run its own isolated, empty Redis cluster.
   - Since our chat system uses Redis strictly as an ephemeral pub/sub fan-out mechanism (Day 47) and 
relies on PostgreSQL as the ultimate source of truth (Day 46), losing in-flight Redis messages during a
hard region crash is an acceptable product trade-off.

## Consequences

### Positive (Pros)

1. High Availability: The system can survive a complete regional cloud provider outage.
2. Self-Healing: Because of the client-side backoff and jitter, human operators do not need to manually
throttle traffic during a recovery event; the system inherently protects itself.
3. Low Primary Latency: By choosing asynchronous DB replication and no Redis replication, we don't 
penalize the day-to-day speed of the application just to support our disaster recovery plan.

### Negative (Cons)

1. Cost: Maintaining a warm standby Postgres replica and secondary Redis cluster doubles our 
infrastructure baseline costs.
2. Temporary Data Loss: Asynchronous replication means a hard crash will inevitably lose a few seconds of       
data (messages written to the primary DB but not yet synced to the backup).
3. Failover Lag: DNS propagation is never instant. Even with a 60-second TTL, some clients may experience       
1-2 minutes of downtime while ISPs update their DNS caches.