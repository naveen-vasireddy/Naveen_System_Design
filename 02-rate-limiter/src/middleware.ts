
import { RedisTokenBucket } from './redisLimiter';
import { InMemoryTokenBucket } from './limiters/tokenBucket';
import { getPolicy } from './policy';

export class RateLimiterMiddleware {
  private redisLimiter: RedisTokenBucket;
  private memoryLimiter: InMemoryTokenBucket;

  constructor(redisLimiter: RedisTokenBucket) {
    this.redisLimiter = redisLimiter;
    // Initialize fallback with a generous default capacity.
    // Ideally, we would resize this dynamically, but for now, we use a safe default.
    this.memoryLimiter = new InMemoryTokenBucket(10); 
  }

  async handle(clientId: string) {
    // 1. Get the Policy (How many tokens does this user get?)
    const policy = await getPolicy(clientId);

    // 2. Try Distributed Redis Limiter
    try {
      const result = await this.redisLimiter.allow(clientId, 1, policy.capacity);
      return { ...result, source: 'redis' };
    } catch (error) {
      // 3. Fallback Logic (Circuit Breaker)
      console.warn(`[RateLimiter] ⚠️ Redis failed for ${clientId}. Falling back to In-Memory. Error: ${(error as Error).message}`);
      
      // Use the local memory bucket
      // Note: We use the same policy capacity, but enforcement is now local-only.
      const result = await this.memoryLimiter.allow(clientId, 1, policy.capacity);
      return { ...result, source: 'memory' };
    }
  }
}
