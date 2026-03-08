
const PUBLISHER_COUNT = 10000;
const TOTAL_FOLLOWERS = 1000000;
const MEGA_USER_THRESHOLD = 100000;

// Calculate average followers per normal user
const AVG_FOLLOWERS = Math.floor(TOTAL_FOLLOWERS / PUBLISHER_COUNT);

console.log(`[Simulator] Initializing Load Test...`);
console.log(`[Simulator] Publishers: ${PUBLISHER_COUNT} | Total Followers: ${TOTAL_FOLLOWERS}`);

/**
 * Simulates a single background fan-out job
 * Returns the latency in milliseconds
 */
async function simulateFanOutJob(publisherId: string, followerCount: number): Promise<number> {
  const startTime = performance.now();

  if (followerCount >= MEGA_USER_THRESHOLD) {
    // Mega user: Pull model (Instant)
    await new Promise(resolve => setTimeout(resolve, 2)); // 2ms overhead
  } else {
    // Normal user: Push model (Fan-out write)
    // Simulating a 1ms database write penalty for every 10 followers
    const dbWriteLatency = (followerCount / 10) * 1; 
    await new Promise(resolve => setTimeout(resolve, dbWriteLatency));
  }

  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Runs the massive load simulation
 */
async function runSimulation() {
  const latencies: number[] = [];
  console.log(`[Simulator] Starting fan-out for ${PUBLISHER_COUNT} posts...`);

  const simulationStartTime = performance.now();

  // We will process these in batches to avoid crashing the Node event loop
  const BATCH_SIZE = 500;
  
  for (let i = 0; i < PUBLISHER_COUNT; i += BATCH_SIZE) {
    const batchPromises = [];
    
    for (let j = 0; j < BATCH_SIZE && (i + j) < PUBLISHER_COUNT; j++) {
      const publisherId = `user-${i + j}`;
      
      // Simulate 1% of users being "Mega Users" with 150k followers
      const isMegaUser = Math.random() < 0.01;
      const followerCount = isMegaUser ? 150000 : AVG_FOLLOWERS;

      batchPromises.push(simulateFanOutJob(publisherId, followerCount));
    }

    // Wait for the batch to finish and record latencies
    const batchResults = await Promise.all(batchPromises);
    latencies.push(...batchResults);
    
    if ((i + BATCH_SIZE) % 2500 === 0) {
      console.log(`[Simulator] Processed ${i + BATCH_SIZE} posts...`);
    }
  }

  const simulationEndTime = performance.now();
  
  // Calculate Metrics
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const totalTime = (simulationEndTime - simulationStartTime) / 1000;

  console.log(`\n=== SIMULATION COMPLETE ===`);
  console.log(`Total Time: ${totalTime.toFixed(2)} seconds`);
  console.log(`p50 Latency: ${p50.toFixed(2)} ms`);
  console.log(`p95 Latency: ${p95.toFixed(2)} ms`);
  console.log(`p99 Latency: ${p99.toFixed(2)} ms`);
}

runSimulation().catch(console.error);
