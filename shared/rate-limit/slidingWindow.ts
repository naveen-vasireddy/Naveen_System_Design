/**
 * Sliding Window Log Rate Limiter
 * Provides high precision and fairness by tracking individual request timestamps.
 */
export class SlidingWindowLimiter {
  private windowSizeMs: number;
  private maxRequests: number;
  private requestLog: number[] = [];

  /**
   * @param windowSizeMs - The duration of the sliding window (e.g., 60000 for 1 minute)
   * @param maxRequests - Maximum allowed requests within that window
   */
  constructor(windowSizeMs: number, maxRequests: number) {
    this.windowSizeMs = windowSizeMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Checks if a request is allowed and updates the log.
   * @returns boolean - true if allowed, false if rate limited
   */
  public checkLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    // 1. SLIDE: Remove timestamps that have fallen out of the window
    // This is the "cleanup" phase
    this.requestLog = this.requestLog.filter(timestamp => timestamp > windowStart);

    // 2. DECIDE: Check if we have room for a new request
    if (this.requestLog.length < this.maxRequests) {
      this.requestLog.push(now);
      return true;
    }

    return false;
  }

  /**
   * Utility to see the current log size
   */
  public getLogSize(): number {
    return this.requestLog.length;
  }
}