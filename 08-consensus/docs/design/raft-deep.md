# Design Document: Raft Failure & Safety Mechanisms

## 1. Heartbeat Intervals & Timing Constraints
In Raft, leadership is maintained purely through periodic heartbeats (empty `AppendEntries` RPCs). If a follower does not receive a heartbeat within its **Election Timeout**, it assumes the leader has crashed and starts a new election. 

To prevent split votes and infinite election loops, Raft relies heavily on a specific timing equation:
`broadcastTime ≪ electionTimeout ≪ MTBF`

* **Broadcast Time (e.g., 0.5ms - 20ms):** The time it takes a leader to send network requests to cluster nodes and receive responses.
* **Election Timeout (e.g., 150ms - 300ms):** The randomized timer on followers. It must be significantly larger than the broadcast time so followers don't trigger false elections due to minor network jitter.
* **MTBF (Mean Time Between Failures) (e.g., Months):** The average time between server crashes.

## 2. The Commit Index & Log Matching
When a client sends a command, how do the nodes know it is actually safe to execute (apply to their state machine)? 

1. The Leader appends the command to its log and sends it to the followers.
2. Once a majority of followers acknowledge it, the Leader increments its **Commit Index**.
3. The Leader includes this new `commitIndex` in its subsequent heartbeats.
4. When followers see the updated `commitIndex`, they finally execute the command locally.

**The Log Matching Property:** Raft guarantees that if two logs on different servers have an entry with the same index and the same term, then the logs are 100% identical in all preceding entries. If a follower's log conflicts with the leader's log, the leader forces the follower to delete the conflicting entries and duplicate the leader's log.

## 3. Core Safety Properties
Raft's design guarantees several absolute safety properties to prevent data corruption during network partitions or crashes:

1. **Election Safety:** At most one leader can be elected in a given term. (A node only has one vote per term).
2. **Leader Append-Only:** A leader never overwrites or deletes entries in its own log; it only appends new entries.
3. **Leader Completeness:** If a log entry is safely committed in a term, that exact entry will be present in the logs of *all* future leaders. (A candidate cannot win an election unless its log is at least as up-to-date as the majority of the cluster).
4. **State Machine Safety:** If a server has applied a log entry at a specific index to its state machine, no other server will ever apply a different command for that same index.
