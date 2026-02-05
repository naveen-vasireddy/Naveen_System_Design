export interface RateLimiter {
  /**
   * Attempts to consume tokens.
   * @param key Unique identifier (e.g., "user:123")
   * @param cost How many tokens to consume (default 1)
   * @param capacity Total bucket size or max window requests
   */
  allow(key: string, cost: number, capacity: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetAtMs: number;
  }>;
}
