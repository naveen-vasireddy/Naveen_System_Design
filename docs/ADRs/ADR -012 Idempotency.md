# ADR-012: Idempotency Strategy

## Status
Accepted

## Context
With the implementation of the Resilience Toolkit on Day 16, our system now utilizes 
retries-with-jitter and timeouts to handle transient failures. However, retrying a "write" 
operation (such as creating a short URL or processing a payment) can lead to duplicate side effects      
if the initial request succeeded but the response was lost due to a network timeout. We need a
mechanism to ensure that performing the same operation multiple times results in the same system
state as a single execution.

## Decision
We will implement a mandatory idempotency layer for all non-idempotent HTTP methods (POST, PATCH)        
using the following specifications:
1. Identification: Clients must provide a unique X-Idempotency-Key (UUID v4) in the request header.
2. Storage: For this Phase 1 demonstration, we utilize the LRU Cache with TTL developed on Day 7 to      
store keys and responses. In production-scale environments (Phase 2), this will transition to a 
Redis-backed store for distributed consistency.
3. Concurrency Control: A "Processing" state will be used to track active requests. If a second
request arrives with the same key while the first is still active, the server will return a 409 
Conflict.
4. Retention: Keys and their associated responses will be cached with a 24-hour TTL to allow a
sufficient window for client-side retries.

## Rationale
• Consistency: This strategy prevents the "double-spend" or "duplicate record" problem inherent in       
high-availability systems (AP) where retries are frequent.
• Performance: By caching the final response, subsequent retries avoid the overhead of re-executing      
business logic or database writes, significantly reducing tail latency for retried requests.
• Safety: The use of the "Processing" flag prevents race conditions where two identical requests
might be processed simultaneously by different worker threads.

## Consequences
• Storage Overhead: Maintaining a cache of request/response pairs increases memory usage. This is        
mitigated by the LRU eviction policy and a strict TTL.
• Client Responsibility: Clients must be updated to generate and store these keys until they 
receive a definitive response.
• Complexity: The server must now manage a state machine for every write request (Miss -> 
Processing -> Success/Failure).