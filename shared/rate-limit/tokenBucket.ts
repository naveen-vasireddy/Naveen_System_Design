/**
 * Token Bucket Rate Limiter
 * Designed for: O(1) performance and burst handling [2].
 */
export class TokenBucket {
  private maxTokens: number;
  private refillRate: number; // Tokens per second
  private currentTokens: number;
  private lastRefillTimestamp: number;

  /**
   * @param capacity - Maximum tokens the bucket can hold (Burst size)
   * @param refillRate - How many tokens are added per second
   */
  constructor(capacity: number, refillRate: number) {
    this.maxTokens = capacity;
    this.refillRate = refillRate;
    this.currentTokens = capacity; // Start full
    this.lastRefillTimestamp = Date.now();
  }

  /**
   * Attempts to consume a specified number of tokens.
   * @param tokens - Number of tokens to consume (default: 1)
   * @returns boolean - true if tokens were consumed, false if rate limited
   */
  public consume(tokens: number = 1): boolean {
    this.refill();

    if (this.currentTokens >= tokens) {
      this.currentTokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Lazy refill logic: calculates tokens based on elapsed time [1].
   * This ensures we don't need a background 'setInterval' for every bucket.
   */
  private refill(): void {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTimestamp;
    
    // Convert ms to seconds and calculate new tokens
    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;
    
    if (tokensToAdd > 0) {
      this.currentTokens = Math.min(
        this.maxTokens, 
        this.currentTokens + tokensToAdd
      );
      this.lastRefillTimestamp = now;
    }
  }

  /**
   * Helper to check current bucket state without consuming
   */
  public getAvailableTokens(): number {
    this.refill();
    return this.currentTokens;
  }
}