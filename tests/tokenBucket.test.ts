import { TokenBucket } from '../shared/rate-limit/tokenBucket';

describe('TokenBucket Rate Limiter', () => {
  
  test('should allow consumption up to capacity (Bursting)', () => {
    // Capacity of 5 tokens, refill rate of 1 per second
    const bucket = new TokenBucket(5, 1);

    // Consume all 5 tokens immediately
    expect(bucket.consume(1)).toBe(true);
    expect(bucket.consume(1)).toBe(true);
    expect(bucket.consume(1)).toBe(true);
    expect(bucket.consume(1)).toBe(true);
    expect(bucket.consume(1)).toBe(true);

    // The 6th attempt should fail (Bucket empty)
    expect(bucket.consume(1)).toBe(false);
  });

  test('should block requests when bucket is empty (Exhaustion)', () => {
    const bucket = new TokenBucket(1, 1);
    
    bucket.consume(1); // Empty the bucket
    const result = bucket.consume(1);
    
    expect(result).toBe(false);
  });

  test('should refill tokens over time (Lazy Refill)', async () => {
    const bucket = new TokenBucket(5, 10); // 10 tokens per second

    bucket.consume(5); // Empty the bucket
    expect(bucket.getAvailableTokens()).toBe(0);

    // Wait 500ms - should refill 5 tokens (0.5s * 10 tokens/s)
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(bucket.getAvailableTokens()).toBeGreaterThanOrEqual(5);
    expect(bucket.consume(1)).toBe(true);
  });

  test('should not exceed maximum capacity during refill', async () => {
    const bucket = new TokenBucket(5, 100); // Very fast refill

    // Wait for refill logic to trigger
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Even with a high refill rate, it should never exceed the capacity of 5
    expect(bucket.getAvailableTokens()).toBe(5);
  });

  test('should handle fractional tokens correctly', async () => {
    const bucket = new TokenBucket(5, 1); // 1 token per second
    
    bucket.consume(5); // Empty
    
    // Wait 500ms
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Should have 0.5 tokens. Trying to consume 1 should fail.
    expect(bucket.consume(1)).toBe(false);
    
    // Wait another 600ms (Total 1.1s)
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    // Now should have ~1.1 tokens. Consuming 1 should succeed.
    expect(bucket.consume(1)).toBe(true);
  });
});