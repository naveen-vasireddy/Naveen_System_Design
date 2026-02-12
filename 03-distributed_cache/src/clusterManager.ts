import { ConsistentHash } from '../../shared/consistentHash';

export class ClusterManager {
  private ring: ConsistentHash;
  private nodes: Set<string>;

  constructor(initialNodes: string[] = []) {
    // Initialize the ring with 3 replicas (virtual nodes) per server
    this.ring = new ConsistentHash(3);
    this.nodes = new Set(initialNodes);
  }

  /**
   * Adds a new node to the cluster.
   * Example: manager.addNode('127.0.0.1:6380');
   */
  public addNode(node: string): void {
    if (this.nodes.has(node)) {
      console.log(`Node ${node} already exists.`);
      return;
    }
    console.log(`[Cluster] Adding node: ${node}`);
    this.ring.addNode(node);
    this.nodes.add(node);
  }

  /**
   * Removes a node (simulating failure or scale-down).
   */
  public removeNode(node: string): void {
    if (!this.nodes.has(node)) {
      console.log(`Node ${node} not found.`);
      return;
    }
    console.log(`[Cluster] Removing node: ${node}`);
    this.ring.removeNode(node);
    this.nodes.delete(node);
  }

  /**
   * Determines which node owns a specific key.
   */
  public getNodeForKey(key: string): string {
    const node = this.ring.getNode(key);
    if (node === null) {
      throw new Error('No nodes available in the cluster');
    }
    return node;
  }

  /**
   * Returns all active nodes.
   */
  public getAllNodes(): string[] {
    return Array.from(this.nodes);
  }
}
