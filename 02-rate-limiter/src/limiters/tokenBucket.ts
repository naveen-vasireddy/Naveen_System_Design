import { RateLimiter } from './index';

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class InMemoryTokenBucket implements RateLimiter {
  private buckets = new Map<string, Bucket>();
  private refillRatePerSec: number;

  constructor(refillRatePerSec: number = 1) {
    this.refillRatePerSec = refillRatePerSec;
  }

  async allow(key: string, cost: number, capacity: number) {
    const now = Date.now();
    
    // Initialize if missing
    if (!this.buckets.has(key)) {
      this.buckets.set(key, { tokens: capacity, lastRefill: now });
    }

    const bucket = this.buckets.get(key)!;
    
    // Refill Logic
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRatePerSec;
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    // Consume Logic
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens), resetAtMs: 0 };
    }

    // Calculate time until enough tokens exist
    const missing = cost - bucket.tokens;
    const timeToWaitMs = (missing / this.refillRatePerSec) * 1000;

    return { 
      allowed: false, 
      remaining: Math.floor(bucket.tokens), 
      resetAtMs: now + timeToWaitMs 
    };
  }
}