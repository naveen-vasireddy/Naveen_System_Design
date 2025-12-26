// Core implementation for Day 5
export async function simulateRequest(): Promise<number> {
    const isSpike = Math.random() < 0.05; // 5% chance of a spike
    const baseLatency = Math.floor(Math.random() * 40) + 10; // 10-50ms
    const spikeLatency = Math.floor(Math.random() * 300) + 200; // 200-500ms
    
    const latency = isSpike ? spikeLatency : baseLatency;
    // Simulate the actual delay
    await new Promise(resolve => setTimeout(resolve, latency));
    return latency;
}

async function runBenchmark(iterations: number = 10000) {
    const results: number[] = [];
    for (let i = 0; i < iterations; i++) {
        results.push(await simulateRequest());
    }
    
    // Calculate percentiles
    results.sort((a, b) => a - b);
    
    const getPercentile = (arr: number[], p: number): number => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
    };
    
    const p50 = getPercentile(results, 50);
    const p95 = getPercentile(results, 95);
    const p99 = getPercentile(results, 99);
    const avg = results.reduce((a, b) => a + b, 0) / results.length;
    const min = results[0];
    const max = results[results.length - 1];
    
    console.log('=== Latency Benchmark Results ===');
    console.log(`Iterations: ${iterations}`);
    console.log(`Min: ${min}ms`);
    console.log(`Avg: ${avg.toFixed(2)}ms`);
    console.log(`P50: ${p50}ms`);
    console.log(`P95: ${p95}ms`);
    console.log(`P99: ${p99}ms`);
    console.log(`Max: ${max}ms`);
}

// Run the benchmark
// runBenchmark(10000).catch(err => console.error('Error running benchmark:', err));