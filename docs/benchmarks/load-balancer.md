 # Simulation Environment

The following details outline the environment for the simulation:

## Total Requests
1,000

## Cluster Configuration

5 Servers with varying processing times are present in this cluster.

- Servers 1–3 have a fast processing time of **10ms**.
- Server 4 has a slower processing time of **100ms**.
- Server 5, the struggling server, has an even slower processing time of **500ms**.

Each server has a maximum queue size for requests; exceeding this capacity results in dropped 
requests.

## Backpressure

Backpressure is present in each server to control the number of concurrent requests processed.

## Comparative Results

| Metric               | Round-Robin           | Least-Connections |
|----------------------|-----------------------|-------------------|
| p95 Latency         | 2,000ms              | 100ms             |
| p99 Latency         | 10,000ms             | 500ms             |
| Dropped Requests    | 242                   | 0                 |

## Key Insights

1. Failure of Load-Aware Routing (Round-Robin)
The Round-robin algorithm distributed traffic equally to each node, without considering server
health or speed. This led to:
   - Tail Latency Explosion: The slow processing time of Server 5 caused its backpressure queue to       
remain permanently full, resulting in an extremely high p99 latency.
   - Service Degradation: Despite the excessive backpressure on Server 5, the Round-robin algorithm      
continued to send work to this server, leading to a significant number (24.2%) of dropped requests.
2. Resilience of Pressure-Aware Routing (Least-connections)
The Least-connections algorithm utilized real-time feedback (active connections + queue depth) for       
routing decisions. This resulted in:
   - Dynamic Steering: The balancer diverted traffic from Servers 4 and 5 to the faster nodes as
their backpressure increased, thus preventing unnecessary delays.
   - Tail Latency Stability: p99 latency was capped at the processing time of the slowest server         
(500ms) because the balancer only utilized the struggling node when the faster nodes were also
occupied.
   - High Availability: This algorithm achieved 0 dropped requests, demonstrating the importance of      
backpressure awareness in maintaining availability in heterogeneous clusters.

## Conclusion

In environments with uneven loads, Round-robin leads to "head-of-line blocking" and cascading
failures on slower nodes. On the other hand, Least-connections is the superior choice for 
minimizing p95/p99 tail latencies and preventing unnecessary request drops. This data serves as
foundational evidence for the adoption of ADR-009 LB algorithm choice.