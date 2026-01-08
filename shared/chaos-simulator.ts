import { CircuitBreaker } from './circuitBreaker';
import { withResilience } from './retry'; // Your Day 6 implementation
import { executeFullResilienceStack } from './resilienceProvider';
// Define the chaos rate as 20%
const FAILURE_RATE = 0.2; 

/**
 * Simulates a flaky downstream service.
 * Returns success after 50ms or throws an error.
 */
async function flakyService(): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < FAILURE_RATE) {
        reject(new Error("Downstream service failure"));
      } else {
        resolve("Success");
      }
    }, 50); // Simulated network/processing latency
  });
}


async function runChaosBenchmark(name: string, executionLogic: () => Promise<any>) {
  const TOTAL_REQUESTS = 1000;
  let successCount = 0;
  let totalCallsToService = 0; // Track "system load"
  const start = Date.now();

  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    try {
      // We wrap the service to track actual calls made
      await executionLogic();
      successCount++;
    } catch (e) {
      // Failed or blocked by CB
    }
  }

  const duration = Date.now() - start;
  console.log(`--- ${name} ---`);
  console.log(`Success Rate: ${(successCount / TOTAL_REQUESTS * 100).toFixed(1)}%`);
  console.log(`Total Time: ${duration}ms`);
}


async function runAllTests() {
  const cb = new CircuitBreaker(5, 2000); // 5 failures to trip, 2s reset
  const retryConfig = { maxRetries: 3, baseDelay: 10, timeoutMs: 100 };

  // Scenario A: No Protection
  await runChaosBenchmark("Baseline (No Protection)", () => flakyService());

  // Scenario B: Retries Only (Day 6 logic)
  await runChaosBenchmark("Retries Only", () => withResilience(flakyService, retryConfig));

  // Scenario C: Integrated (Day 16 Full Stack)
  await runChaosBenchmark("Integrated CB + Retries", () => 
    executeFullResilienceStack(cb, flakyService, retryConfig)
  );
}

runAllTests();
