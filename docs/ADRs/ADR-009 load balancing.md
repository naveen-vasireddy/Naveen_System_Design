## Status
Accepted

## Context
We are implementing a load balancing strategy for a cluster of 5 servers, where backend nodes may        
exhibit uneven performance due to resource contention or varying hardware capabilities. To
accurately model this, we have introduced backpressure queues at the server level to hold requests       
when a node reaches its capacity. The primary goal is to select an algorithm that maintains low p95      
and p99 tail latencies and prevents request drops in specific nodes like the "struggling" 500ms 
node.

## Decision
The Least-Connections algorithm will be implemented as the primary routing strategy for the system,      
replacing the baseline Round-robin approach.

## Rationale
Based on benchmarking data, the following observations justify this decision:
- Handling Head-of-Line Blocking: In a Round-robin setup, traffic is distributed equally regardless      
of server speed. This caused the "struggling" node's backpressure queue to overflow and resulted in      
242 dropped requests and a p99 latency spike of 10,000ms.
- Pressure Awareness: The Least-Connections algorithm uses real-time state (active connections +
queue depth) to divert traffic away from overwhelmed nodes.
- Availability: Under the same load, Least-Connections achieved 0 dropped requests by dynamically        
steering traffic toward the three "fast" (10ms) servers once it sensed backpressure on the slower        
nodes.
- Tail Latency Optimization: Least-Connections maintained a p99 of 500ms, which is a 20x 
improvement over Round-robin's 10,000ms in the same uneven environment.

## Consequences
- Complexity: The load balancer must now maintain an internal state of active connections/queue
sizes for all 5 servers, whereas Round-robin only required a simple counter.
- Overhead: There is a minor computational cost to performing the reduce operation to find the
server with the least load for every incoming request.
- Stability: The system will be significantly more resilient to "gray failures" where a node is not      
completely down but is performing poorly.

## Deliverables Correlation
This decision is supported by data recorded in `benchmarks/lb.md`, which fulfills the requirement        
to chart p95/p99 for uneven loads.