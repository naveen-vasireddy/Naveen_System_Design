export enum CBState {
  CLOSED = 'CLOSED',       // Normal operation: requests pass through
  OPEN = 'OPEN',           // Failing: requests are blocked immediately
  HALF_OPEN = 'HALF_OPEN'  // Testing: allowing a trial request to see if fixed
}

export class CircuitBreaker {
  private state: CBState = CBState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private failureThreshold: number = 3,    // Trips after 3 failures
    private resetTimeoutMs: number = 5000     // Wait 5s before testing again
  ) {}

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.updateState();

    if (this.state === CBState.OPEN) {
      throw new Error("Circuit Breaker is OPEN: Request blocked.");
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private updateState() {
    // If Open and the timeout has passed, move to Half-Open to test the waters
    if (this.state === CBState.OPEN && this.lastFailureTime) {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = CBState.HALF_OPEN;
      }
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = CBState.CLOSED;
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold || this.state === CBState.HALF_OPEN) {
      this.state = CBState.OPEN;
    }
  }

  public getState(): CBState {
    return this.state;
  }
}