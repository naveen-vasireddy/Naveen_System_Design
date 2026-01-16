// 01-url-shortener/src/cache.ts
import Redis from 'ioredis';

// Standard Redis connection (using default local port)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const urlCache = {
  /**
   * Retrieves a long URL from the cache using its short code.
   */
  async get(code: string): Promise<string | null> {
    return await redis.get(`url:${code}`);
  },

  /**
   * Stores a code-to-URL mapping with an optional TTL (Days 25 requirement).
   */
  async set(code: string, url: string, ttlSeconds: number = 3600): Promise<void> {
    await redis.set(`url:${code}`, url, 'EX', ttlSeconds);
  },

  /**
   * Checks if a code already exists (for collision detection).
   */
  async exists(code: string): Promise<boolean> {
    const exists = await redis.exists(`url:${code}`);
    return exists === 1;
  }
};
