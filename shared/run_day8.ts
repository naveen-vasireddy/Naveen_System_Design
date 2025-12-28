import { LRUCache } from './cache/lru';

/**
 * Test 1: Eviction Throughput
 * Fills the cache to capacity and then forces a high volume of evictions.
 * This tests the O(1) performance of the Doubly Linked List updates.
 */
async function runEvictionBenchmark(capacity: number, operations: number) {
    const cache = new LRUCache<number, string>(capacity);
    
    console.log(`--- Starting Eviction Benchmark: ${operations} operations ---`);
    const start = Date.now();

    for (let i = 0; i < operations; i++) {
        // Once i > capacity, every 'set' triggers an eviction of the tail
        cache.set(i, `value-${i}`, 100000); 
    }

    const duration = Date.now() - start;
    const opsPerSec = Math.floor(operations / (duration / 1000));
    
    console.log(`Eviction Results: ${duration}ms total (${opsPerSec} ops/sec)`);
    return { duration, opsPerSec };
}

/**
 * Test 2: TTL-Heavy Workload
 * Measures the "Lazy Eviction" cost by checking expired items during 'get' calls.
 */
async function runTTLBenchmark(operations: number) {
    const cache = new LRUCache<number, string>(operations);
    
    console.log(`--- Starting TTL Stress Benchmark: ${operations} operations ---`);
    
    // 1. Fill cache with short-lived data (10ms)
    for (let i = 0; i < operations; i++) {
        cache.set(i, `data-${i}`, 10);
    }

    // 2. Wait for items to expire
    await new Promise(resolve => setTimeout(resolve, 50));

    // 3. Measure how fast the cache handles "get" requests for expired data
    const start = Date.now();
    for (let i = 0; i < operations; i++) {
        cache.get(i); // This triggers lazy eviction check and deletion
    }
    const duration = Date.now() - start;

    console.log(`TTL Results (Lazy Eviction): ${duration}ms total`);
    return duration;
}

// Execute the benchmarks
async function main() {
    await runEvictionBenchmark(10000, 1000000);
    console.log("");
    await runTTLBenchmark(500000);
}

main();