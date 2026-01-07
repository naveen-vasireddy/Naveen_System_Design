import { CircuitBreaker, CBState } from '../shared/circuitBreaker';

describe('Circuit Breaker Day 15', () => {
  const failureAction = () => Promise.reject(new Error("Fail"));
  const successAction = () => Promise.resolve("Success");

  it('should start in CLOSED state', async () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe(CBState.CLOSED);
  });

  it('should trip to OPEN after reaching failure threshold', async () => {
    const cb = new CircuitBreaker(2); // Threshold of 2
    
    await expect(cb.execute(failureAction)).rejects.toThrow();
    await expect(cb.execute(failureAction)).rejects.toThrow();
    
    expect(cb.getState()).toBe(CBState.OPEN);
  });

  it('should block requests immediately when OPEN', async () => {
    const cb = new CircuitBreaker(1);
    await expect(cb.execute(failureAction)).rejects.toThrow();
    
    // This call should be blocked by the CB, not the action failing
    await expect(cb.execute(successAction)).rejects.toThrow("Circuit Breaker is OPEN");
  });

  it('should transition to HALF_OPEN after timeout', async () => {
    const resetTimeout = 100;
    const cb = new CircuitBreaker(1, resetTimeout);
    
    await expect(cb.execute(failureAction)).rejects.toThrow();
    
    // Wait for timeout
    await new Promise(res => setTimeout(res, resetTimeout + 10));
    
    // Call the checker (internally updates state)
    await expect(cb.execute(successAction)).resolves.toBe("Success");
    expect(cb.getState()).toBe(CBState.CLOSED);
  });
});