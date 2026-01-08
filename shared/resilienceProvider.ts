import { CircuitBreaker, CBState } from './circuitBreaker'; // From Day 15
import { withResilience, RetryConfig } from './retry'; // From Day 6
/**
 * Day 16 Integration: Wrapping your retry logic with a Circuit Breaker
 */
export async function executeFullResilienceStack<T>(
  cb: CircuitBreaker,
  task: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  
  // The Circuit Breaker is the outermost layer of protection [2].
  return cb.execute(async () => {
    
    // Your existing logic handles transient blips and slowness [1].
    // If this function throws after all retries are exhausted, 
    // the Circuit Breaker will record a failure.
    return withResilience(task, config);
  });
}