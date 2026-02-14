import { LRUCache } from './lru';

function simulateWorkload(label: string, pattern: number[]) {
  const cache = new LRUCache<string, string>(5); // Tiny capacity to force eviction
  let hits = 0;
  let misses = 0;

  console.log(`\n--- Simulating: ${label} ---`);
  
  pattern.forEach(i => {
    const key = `k${i}`;
    const val = cache.get(key);
    if (val) {
      hits++;
    } else {
      misses++;
      cache.set(key, `v${i}`, 10000);
    }
  });

  console.log(`Hits: ${hits}, Misses: ${misses}, Ratio: ${(hits / pattern.length).toFixed(2)}`);
}

// 1. Recency-Friendly (LRU Ideal)
// We keep accessing 1, 2, 3... but recently accessed items come back often.
const lruFriendly = [
  1, 2, 3, 
  1, 2, 3, 
  1, 2, 3, 
  1, 2, 3
];  

// 2. Frequency-Friendly (LFU Ideal, LRU Worst Case)
// Items 1 and 2 are VERY popular, but a "scan" of new items (10-20) 
// floods the cache, evicting 1 and 2 because they weren't "recent" enough.
const lruKiller = [
  1, 2, 1, 2, 1, 2, // 1 & 2 are hot
  10, 11, 12, 13, 14, 15, // Scan operation (floods capacity 5)
  1, 2 // LRU will miss these now! LFU would have kept them.
];

simulateWorkload("LRU Friendly Workload", lruFriendly);
simulateWorkload("Scan / LFU Friendly Workload", lruKiller);
