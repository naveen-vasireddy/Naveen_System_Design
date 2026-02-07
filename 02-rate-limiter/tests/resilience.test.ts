import RedisMock from 'ioredis-mock';
import { RedisTokenBucket } from '../src/redisLimiter';
import { RateLimiterMiddleware } from '../src/middleware';

describe('RateLimiterMiddleware Resilience', () => {
  let redis: any;
  let redisLimiter: RedisTokenBucket;
  let middleware: RateLimiterMiddleware;

  beforeEach(() => {
    redis = new RedisMock();
    // Initialize logic with 1 token/sec default rate
    redisLimiter = new RedisTokenBucket(redis, 1);
    middleware = new RateLimiterMiddleware(redisLimiter);
  });

  test('uses Redis when healthy', async () => {
    // Spy on the redis limiter to ensure it is called
    const spy = jest.spyOn(redisLimiter, 'allow');
    
    // 'user_pro' triggers the Pro policy (capacity 50)
    const res = await middleware.handle('user_pro');
    
    expect(res.allowed).toBe(true);
    expect(res.source).toBe('redis');
    expect(spy).toHaveBeenCalled();
  });

  test('falls back to Memory when Redis fails', async () => {
    // 1. Simulate a Redis crash
    jest.spyOn(redisLimiter, 'allow').mockRejectedValue(new Error('Connection Refused'));

    // 2. Call the middleware
    const res = await middleware.handle('user_pro');

    // 3. Verify it succeeded anyway (Fail Open)
    expect(res.allowed).toBe(true);
    expect(res.source).toBe('memory'); // Check that we used the backup
  });
});
