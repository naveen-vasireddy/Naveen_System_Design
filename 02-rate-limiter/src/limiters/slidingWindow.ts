import type { RateLimiter } from './index';

export class InMemorySlidingWindow implements RateLimiter {
  // Stores timestamps of requests: key -> [ts1, ts2, ts3]
  private history = new Map<string, number[]>();
  private windowSizeMs: number;

  constructor(windowSizeMs: number = 60000) { // Default 1 minute
    this.windowSizeMs = windowSizeMs;
  }

  async allow(key: string, cost: number, capacity: number) {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    // Get existing history
    let timestamps = this.history.get(key) || [];

    // 1. Remove expired timestamps (Sliding effect)
    timestamps = timestamps.filter(ts => ts > windowStart);

    // 2. Check if we have space
    if (timestamps.length + cost <= capacity) {
      // Add new requests
      for (let i = 0; i < cost; i++) timestamps.push(now);
      this.history.set(key, timestamps);
      
      const oldestTimestamp = timestamps[0] ?? now;

      return { 
        allowed: true, 
        remaining: capacity - timestamps.length,
        resetAtMs: oldestTimestamp + this.windowSizeMs 
      };
    }

    // 3. Reject
    // FIX: Grab the first item (oldest). 
    // If empty here (unlikely unless cost > capacity), fallback to 'now'.
    const oldestTimestamp = timestamps[0] ?? now;

    return { 
      allowed: false, 
      remaining: capacity - timestamps.length,
      resetAtMs: oldestTimestamp + this.windowSizeMs
    };
  }
}