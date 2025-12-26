import { simulateRequest } from './latency_sim';
import { withResilience } from './retry';

async function runDay6Benchmark(iterations: number = 10000) {
    const results: number[] = [];
    const config = {
        maxRetries: 3,
        baseDelay: 50,  // ms
        timeoutMs: 100  // We cap "spikes" at 100ms to trigger retries
    };

    console.log(`Starting Day 6 Benchmark: ${iterations} requests with Resilience...`);

    for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        try {
            // We wrap the simulateRequest in our resilience logic
            await withResilience(() => simulateRequest(), config);
            results.push(Date.now() - start);
        } catch (err) {
            // Even if it fails after 3 retries, we record the total time taken
            results.push(Date.now() - start);
        }
    }

    // Sort results to calculate percentiles
    results.sort((a, b) => a - b);

    const p50 = results[Math.floor(iterations * 0.5)];
    const p95 = results[Math.floor(iterations * 0.95)];
    const p99 = results[Math.floor(iterations * 0.99)];
    const max = results[results.length - 1];

    console.log("=== Day 6 Results (With Resilience) ===");
    console.log(`P50: ${p50}ms`);
    console.log(`P95: ${p95}ms`);
    console.log(`P99: ${p99}ms`);
    console.log(`Max: ${max}ms`);
}

runDay6Benchmark();