import crypto from 'crypto';

export class ConsistentHash {
  // Map of hash values to physical node names
  private ring: Map<number, string> = new Map();
  private sortedKeys: number[] = [];
  private nodes: Set<string> = new Set();

  /**
   * @param replicas Number of virtual nodes per physical node
   */
  constructor(private replicas: number = 100) {}

  /**
   * Generates a numeric hash for a string key.
   */
  private hash(key: string): number {
    return crypto.createHash('md5').update(key).digest().readUInt32BE(0);
  }

  /**
   * Adds a physical node to the ring with its associated virtual nodes.
   */
  addNode(node: string): void {
    this.nodes.add(node);
    for (let i = 0; i < this.replicas; i++) {
      const vNodeKey = `${node}#${i}`;
      const hash = this.hash(vNodeKey);
      this.ring.set(hash, node);
      this.sortedKeys.push(hash);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  /**
   * Removes a node and all its virtual replicas from the ring.
   */
  removeNode(node: string): void {
    this.nodes.delete(node);
    this.sortedKeys = this.sortedKeys.filter((hash) => {
      if (this.ring.get(hash) === node) {
        this.ring.delete(hash);
        return false;
      }
      return true;
    });
  }

  /**
   * Locates the nearest node on the ring for a given key.
   */
  getNode(key: string): string | null {
    if (this.ring.size === 0) return null;

    const hash = this.hash(key);
    
    // Binary search to find the first hash in the ring >= the key's hash
    let low = 0;
    let high = this.sortedKeys.length - 1;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedKeys[mid] >= hash) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // Wrap around to the start of the ring if needed
    const index = low % this.sortedKeys.length;
    return this.ring.get(this.sortedKeys[index]) || null;
  }

  getNodes(): string[] {
    return Array.from(this.nodes);
  }
}