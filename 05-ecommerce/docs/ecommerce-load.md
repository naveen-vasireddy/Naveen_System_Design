# E-Commerce Flash Sale Load Test

## Context
To simulate a "Flash Sale" where thousands of users attempt to buy a limited-stock item at the exact same time, we need to test our system's burst capacity and define autoscaling triggers.

## 1. Burst Scenarios
We simulated a massive traffic spike hitting the checkout flow (`Reserve -> Charge -> Finalize`).

* **Scenario A: 1,000 Requests Per Second (RPS)**
  * *Observation:* The API Gateway and Orders service handled the load smoothly.
  * *Bottleneck:* The external Payment Gateway mock began to show increased latency, pushing our p95 latency closer to our 800ms SLO threshold.
* **Scenario B: 5,000 Requests Per Second (RPS)**
  * *Observation:* The Postgres database for the Orders service experienced connection pooling limits. 
  * *Bottleneck:* Redis successfully handled the high-concurrency inventory deductions without overselling! However, the Orders service requires more instances to handle the Saga orchestration under this load.

## 2. Autoscaling Notes
To ensure reliability during future flash sales, we will implement the following autoscaling policies:

* **Orders Service (CPU/Memory):** Scale out (add pods) when CPU utilization reaches 70%. Because this service manages the Saga Orchestration, it is compute-intensive.
* **Inventory Service:** Handled primarily by Redis. We will ensure our Redis cluster is scaled appropriately to handle high write throughput.
* **Database (Postgres):** Increase the maximum connection pool size and consider adding read replicas for Catalog browsing so the primary node is strictly dedicated to checkout writes.
* **Message Queue (Kafka):** If the `orders.events` topic experiences high lag, we will dynamically scale the number of consumer workers processing the orchestrator steps.
