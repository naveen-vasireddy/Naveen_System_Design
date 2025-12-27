import { LRUCache } from '../shared/cache/lru';

describe('LRUCache with TTL', () => {
  
  test('should store and retrieve values (Basic Operations)', () => {
    const cache = new LRUCache<string, string>(10);
    cache.set('key1', 'value1', 1000);
    
    expect(cache.get('key1')).toBe('value1');
  });

  test('should evict the least recently used item when at capacity', () => {
    // Capacity of 2
    const cache = new LRUCache<string, string>(2);
    
    cache.set('a', '1', 1000);
    cache.set('b', '2', 1000);
    
    // Access 'a' so it becomes Most Recently Used (MRU)
    cache.get('a');
    
    // Adding 'c' should evict 'b' (the new LRU)
    cache.set('c', '3', 1000);
    
    expect(cache.get('a')).toBe('1');
    expect(cache.get('c')).toBe('3');
    expect(cache.get('b')).toBeNull(); // Evicted
  });

  test('should expire items after TTL (Lazy Eviction)', async () => {
    const cache = new LRUCache<string, string>(10);
    
    // Set item with a very short TTL (50ms)
    cache.set('short-lived', 'data', 50);
    
    // Wait for 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    expect(cache.get('short-lived')).toBeNull();
  });

  test('should refresh TTL and position on update', async () => {
    const cache = new LRUCache<string, string>(10);
    
    cache.set('update-me', 'v1', 100);
    
    // Update before it expires
    setTimeout(() => {
      cache.set('update-me', 'v2', 1000);
    }, 50);

    // Wait 150ms (initial 100ms would have expired v1)
    await new Promise((resolve) => setTimeout(resolve, 150));
    
    expect(cache.get('update-me')).toBe('v2');
  });
});