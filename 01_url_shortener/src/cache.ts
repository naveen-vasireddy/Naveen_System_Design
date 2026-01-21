// 01-url-shortener/src/cache.ts
import Redis from 'ioredis';

// Lightweight in-memory fallback when no Redis and no mock package is available
class InMemoryStore {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, ttlSeconds?: number): Promise<'OK' | void> {
    let expiresAt: number | null = null;
    if (typeof mode === 'string' && mode.toUpperCase() === 'EX' && typeof ttlSeconds === 'number') {
      expiresAt = Date.now() + ttlSeconds * 1000;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async exists(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return 0;
    }
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const secs = Math.floor((entry.expiresAt - Date.now()) / 1000);
    if (secs <= 0) {
      this.store.delete(key);
      return -2;
    }
    return secs;
  }
}

// Choose runtime client:
// - If REDIS_URL present, use real ioredis client (Docker production path)
// - Otherwise try to dynamically require 'ioredis-mock' (dev/test)
// - If mock not present, fall back to the internal InMemoryStore
export let redis: any;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
} else {
  try {
    // dynamic require to avoid failing when the mock package isn't installed in production images
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RedisMock = require('ioredis-mock');
    redis = new RedisMock();
  } catch (e) {
    redis = new InMemoryStore();
  }
}

export const urlCache = {
  async get(code: string): Promise<string | null> {
    return await redis.get(`url:${code}`);
  },

  async set(code: string, url: string, ttlSeconds: number = 3600): Promise<void> {
    // Some clients (ioredis) use set(key, val, 'EX', seconds)
    await redis.set(`url:${code}`, url, 'EX', ttlSeconds);
  },

  async exists(code: string): Promise<boolean> {
    const exists = await redis.exists(`url:${code}`);
    // ioredis returns 1/0, in-memory returns 1/0
    return exists === 1 || exists === true;
  },

  async getTtl(code: string): Promise<number> {
    return await redis.ttl(`url:${code}`);
  }
};
