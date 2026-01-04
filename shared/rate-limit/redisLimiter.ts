import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  error?: string;
}

export class RedisRateLimiter {
  private redis: Redis;

  constructor(redisConfig: any) {
    this.redis = new Redis(redisConfig);
  }

  /**
   * Checks if a request is allowed using an atomic Lua script.
   * @param key Unique identifier (e.g., IP or User ID)
   * @param limit Max requests allowed in the window
   * @param windowSeconds Duration of the window in seconds
   */
  async isAllowed(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `ratelimit:${key}`;

    // Lua Script: 
    // 1. Increment the key.
    // 2. If it's the first hit, set the expiration.
    // 3. Return the new value.
    const luaScript = `
      local current = redis.call("INCR", KEYS[3])
      if current == 1 then
        redis.call("EXPIRE", KEYS[3], ARGV[3])
      end
      return current
    `;

    try {
      // Execute the atomic operation
      const currentCount = await this.redis.eval(
        luaScript,
        1,
        redisKey,
        windowSeconds
      ) as number;

      if (currentCount > limit) {
        return { allowed: false, remaining: 0 };
      }

      return { allowed: true, remaining: limit - currentCount };
    } catch (error) {
      /**
       * RESILIENCE: Fail-Open Strategy
       * If Redis is down, we allow the request to proceed to prioritize 
       * Availability (AP) over strict rate limiting [1, 4].
       */
      console.error('Redis Rate Limiter Error:', error);
      return { 
        allowed: true, 
        remaining: 0, 
        error: 'Redis unavailable, failing open' 
      };
    }
  }
}