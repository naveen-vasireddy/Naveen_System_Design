import { ClusterManager } from './clusterManager';

interface CacheResult {
  value: string | null;
  node: string;
}

export class ReplicationManager {
  private cluster: ClusterManager;
  private replicas: number;

  constructor(cluster: ClusterManager, replicas: number = 3) {
    this.cluster = cluster;
    this.replicas = replicas;
  }

  /**
   * Returns the primary node and its successors (replicas).
   */
  public getReplicaSet(key: string): string[] {
    const primary = this.cluster.getNodeForKey(key);
    const allNodes = this.cluster.getAllNodes();
    
    // In a real ring, we walk the circle. 
    // Simplified logic: index of primary + next N-1 nodes
    // Note: This relies on the nodes array being sorted or fixed order, 
    // but for Consistent Hashing we usually ask the ring for the "next" nodes.
    // Since our Day 37 ConsistentHash might purely return one node, 
    // we will simulate the ring walk by getting the full sorted list from the ring if possible.
    // FALLBACK: For this exercise, we simply pick distinct nodes ensuring primary is first.
    
    // 1. Start with primary
    const set = new Set<string>();
    set.add(primary);

    // 2. Add others until we reach N (simple implementation)
    // In a production system, you'd ask the Hash Ring for "next distinct nodes"
    for (const node of allNodes) {
      if (set.size >= this.replicas) break;
      set.add(node);
    }
    
    return Array.from(set);
  }

  /**
   * SIMULATE a Write to N nodes (Quorum Write).
   */
  public async set(key: string, value: string): Promise<boolean> {
    const nodes = this.getReplicaSet(key);
    console.log(`[Replication] SET ${key}=${value} to nodes: [${nodes.join(', ')}]`);

    let successCount = 0;
    
    // Simulate parallel network requests
    const promises = nodes.map(async (node) => {
      try {
        // TODO: Real TCP client calls go here (Day 40)
        // await client.connect(node).set(key, value);
        console.log(`  -> OK: Wrote to ${node}`);
        return true;
      } catch (err) {
        console.log(`  -> FAIL: Could not write to ${node}`);
        return false;
      }
    });

    const results = await Promise.all(promises);
    successCount = results.filter(r => r).length;

    // Consistency Level: Majority (W > N/2)
    const isSuccess = successCount >= Math.ceil(this.replicas / 2);
    return isSuccess;
  }

  /**
   * Read with Repair (Quorum Read).
   */
  public async get(key: string): Promise<string | null> {
    const nodes = this.getReplicaSet(key);
    console.log(`[Replication] GET ${key} from nodes: [${nodes.join(', ')}]`);

    // Simulate getting values (some might be missing/stale)
    // Mocking: Node A has value, Node B is missing it
    const results: CacheResult[] = nodes.map((node, index) => ({
      node,
      value: index === 0 ? "some_data" : null // Simulate data loss on replicas
    }));

    // 1. Collect valid values
    const foundValues = results.filter(r => r.value !== null);
    
    if (foundValues.length === 0) return null;

    // 2. Read Repair: If some nodes missed it, fix them
    if (foundValues.length < nodes.length) {
      const winner = foundValues[0].value!; // Simple "First found wins" strategy
      const missingNodes = results.filter(r => r.value === null);
      
      console.log(`[ReadRepair] Detected inconsistency! Fixing ${missingNodes.length} nodes...`);
      missingNodes.forEach(n => {
        console.log(`  -> Repairing ${n.node} with value "${winner}"`);
        // TODO: await client.connect(n.node).set(key, winner);
      });
      
      return winner;
    }

    return foundValues[0].value;
  }
}

