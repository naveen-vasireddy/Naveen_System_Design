# ADR 036: Raft Properties & Limitations

## Status
Accepted

## Context
As we move into advanced distributed systems, we need a mechanism to ensure multiple nodes in a cluster agree on shared state, even if some nodes crash or network partitions occur. Traditional primary-replica replication can lead to split-brain scenarios or data loss during failovers. To solve this, we are exploring the **Raft Consensus Algorithm**, which relies on leader election and log replication to maintain a strictly consistent state across a cluster.

## Decision
We will prototype a "Raft-lite" system to demonstrate leader election and log replication. In evaluating Raft for our systems, we acknowledge the following properties and limitations:

### Core Properties (Advantages)
1. **Strong Leader Model:** Raft routes all write requests through a single elected Leader, drastically simplifying the process of resolving conflicts compared to leaderless protocols (like Paxos).
2. **Quorum-Based Commits:** A log entry is only considered "committed" when the Leader successfully replicates it to a *majority* (quorum) of the cluster nodes. This prevents split-brain.
3. **Understandability:** Raft explicitly separates the consensus problem into three independent sub-problems: Leader Election, Log Replication, and Safety.
4. **Fault Tolerance:** As long as a majority of nodes are operational and can communicate, the cluster continues to function and process requests.

### Limitations (Disadvantages)
1. **Leader Bottleneck:** Because every single write must go through the Leader, write throughput is fundamentally limited by the CPU, memory, and network capacity of that single machine.
2. **Latency Overhead:** A write operation requires a network round-trip from the Leader to the Followers to achieve a quorum *before* acknowledging success to the client. This adds latency compared to asynchronous replication.
3. **Availability vs. Consistency:** Raft prioritizes Consistency over Availability (CP in the CAP theorem). If a network partition leaves no partition with a majority of nodes, the system halts writes entirely rather than risking data divergence.

## Consequences
By using Raft-style consensus, we guarantee strong consistency and safety at the cost of write scalability and slightly higher write latency. This makes it ideal for critical metadata storage, configuration management, and distributed locks, but unsuitable for high-throughput user data streams.