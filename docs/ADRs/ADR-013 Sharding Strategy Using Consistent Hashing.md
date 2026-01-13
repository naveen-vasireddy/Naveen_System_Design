## ADR-013: Consistent Hashing with Virtual Nodes for Sharding.

Status: Accepted
Date: Day 21

Context
- As systems like URL Shortener (Day 17) and Distributed Cache (Day 36) scale, a single node cannot handle the       
total storage or request volume. A sharding strategy is needed to distribute data across multiple nodes while        
maintaining high availability and minimizing the cost of rebalancing when nodes are added or removed.

Decision
- Implement Consistent Hashing with Virtual Nodes as the primary sharding mechanism for all distributed
components:
  - Hash Ring: Both data keys and server nodes are mapped onto a 32-bit integer ring.
  - Virtual Nodes: Each physical node will be mapped to 100+ points on the ring to ensure uniform distribution.
  - Node Selection: Data is assigned to the first node encountered when moving clockwise on the ring from the        
key’s hash position.

Rationale
- Minimal Rebalancing: In a standard hash(key) % N strategy, adding a node moves nearly all data. Our benchmark      
confirms that consistent hashing reduces this to only ~19% for a 5-node cluster, meeting our performance
criteria.
- Horizontal Scalability: Allows for seamless expansion of the Distributed Cache (Day 37) and Social Feed 
sharding (Day 71) without significant downtime.
- Hotspot Mitigation: Virtual nodes prevent "hotspots" by ensuring that if one physical node fails, its load is      
distributed across all remaining nodes rather than just one.

Consequences
- Increased Metadata: The client or a "Cluster Manager" must maintain and update the hash ring state.
- Complexity: Implementing the hash ring and virtual nodes is more complex than simple modulo hashing.
- Lookup Overhead: Finding the correct node requires a binary search on the ring (O(logN)), though this is 
negligible compared to network I/O.
```

This markdown provides a clean and structured presentation of your content, making it easier to read and
understand.