import RedisMock from 'ioredis-mock';
import { RedisTokenBucket } from '../src/redisLimiter';

describe('Redis Limiter Concurrency', () => {
  let redis: any;

  beforeEach(() => {
    redis = new RedisMock();
  });

  test('handles concurrent requests accurately (no refill)', async () => {
    // FIX: Set refill rate to near-zero (1 token per 10,000 secs)
    // This ensures no tokens are added during the 300ms test execution
    const limiter = new RedisTokenBucket(redis, 0.0001); 

    const KEY = 'concurrent-test';
    const CAPACITY = 20; 
    const TOTAL_REQUESTS = 50;

    const promises = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
      promises.push(limiter.allow(KEY, 1, CAPACITY));
    }

    const results = await Promise.all(promises);

    const successful = results.filter(r => r.allowed).length;
    const failed = results.filter(r => !r.allowed).length;

    console.log(`Concurrency Result: ${successful} passed, ${failed} blocked`);

    // Now this should be exactly 20, because no refill happened
    expect(successful).toBe(CAPACITY);
    expect(failed).toBe(TOTAL_REQUESTS - CAPACITY);
  });

  test('refills correctly after concurrency', async () => {
    // FIX: Set a high refill rate (10/sec) for this specific test
    const limiter = new RedisTokenBucket(redis, 10);
    
    const KEY = 'refill-test';
    const CAPACITY = 5;
    
    // 1. Drain the bucket
    await limiter.allow(KEY, 5, CAPACITY);
    
    // 2. Verify empty
    const res = await limiter.allow(KEY, 1, CAPACITY);
    expect(res.allowed).toBe(false);

    // 3. Wait 0.2s (should add 2 tokens at 10/sec rate)
    await new Promise(r => setTimeout(r, 210));

    // 4. Verify refill
    const res2 = await limiter.allow(KEY, 1, CAPACITY);
    expect(res2.allowed).toBe(true);
  });
});