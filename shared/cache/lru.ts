/**
 * Day 7 — LRU Cache (Build)
 * Core implementation with TTL and O(1) eviction logic. [1, 2]
 */

// A node represents an entry in our Doubly Linked List
class ListNode<K, V> {
  key: K;
  value: V;
  expiresAt: number; // TTL support [2]
  next: ListNode<K, V> | null = null;
  prev: ListNode<K, V> | null = null;

  constructor(key: K, value: V, ttlMs: number) {
    this.key = key;
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
  }
}

export class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, ListNode<K, V>>;
  private head: ListNode<K, V> | null = null;
  private tail: ListNode<K, V> | null = null;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * Retrieves a value from the cache. 
   * Includes lazy TTL eviction and moves the item to the 'head' (MRU).
   */
  public get(key: K): V | null {
    const node = this.cache.get(key);
    if (!node) return null;

    // Lazy Eviction: Check if the item has expired
    if (Date.now() > node.expiresAt) {
      this.removeNode(node);
      this.cache.delete(key);
      return null;
    }

    // Move to head because it was recently accessed
    this.moveToHead(node);
    return node.value;
  }

  /**
   * Adds or updates a value in the cache with a specific TTL.
   */
  public set(key: K, value: V, ttlMs: number): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing value and refresh TTL
      existingNode.value = value;
      existingNode.expiresAt = Date.now() + ttlMs;
      this.moveToHead(existingNode);
    } else {
      // Create new node
      const newNode = new ListNode(key, value, ttlMs);
      
      // Check capacity and evict Least Recently Used (tail) if necessary
      if (this.cache.size >= this.capacity) {
        if (this.tail) {
          this.cache.delete(this.tail.key);
          this.removeNode(this.tail);
        }
      }

      this.cache.set(key, newNode);
      this.addNodeToHead(newNode);
    }
  }

  // --- Private Helper Methods for O(1) List Manipulation ---

  private addNodeToHead(node: ListNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: ListNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;

    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
  }

  private moveToHead(node: ListNode<K, V>): void {
    this.removeNode(node);
    this.addNodeToHead(node);
  }
}