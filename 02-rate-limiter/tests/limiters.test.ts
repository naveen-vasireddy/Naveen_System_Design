import { InMemoryTokenBucket } from '../src/limiters/tokenBucket';
import { InMemorySlidingWindow } from '../src/limiters/slidingWindow';
// C:\Users\deepa\naveen\Naveen_System_Design\02-rate-limiter\src\limiters\tokenBucket.ts
describe('InMemory Rate Limiters', () => {
  
  test('Token Bucket refills over time', async () => {
    // 10 tokens per sec
    const limiter = new InMemoryTokenBucket(10);
    const key = 'test-bucket';
    
    // Consume all 5
    let res = await limiter.allow(key, 5, 5);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(0);

    // Immediate next call should fail
    res = await limiter.allow(key, 1, 5);
    expect(res.allowed).toBe(false);

    // Wait 0.2s (adds 2 tokens)
    await new Promise(r => setTimeout(r, 200));
    
    res = await limiter.allow(key, 1, 5);
    expect(res.allowed).toBe(true);
  });

  test('Sliding Window respects time window', async () => {
    // 1 second window
    const limiter = new InMemorySlidingWindow(1000); 
    const key = 'test-window';

    // Allow 2 requests
    await limiter.allow(key, 1, 2);
    const res1 = await limiter.allow(key, 1, 2);
    expect(res1.allowed).toBe(true);

    // 3rd request fails
    const res2 = await limiter.allow(key, 1, 2);
    expect(res2.allowed).toBe(false);

    // Wait 1.1s for window to slide
    await new Promise(r => setTimeout(r, 1100));

    // Should succeed now
    const res3 = await limiter.allow(key, 1, 2);
    expect(res3.allowed).toBe(true);
  });
});