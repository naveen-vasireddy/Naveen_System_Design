import { MOCK_SERVERS_DAY_14, Server } from './types';
import { RoundRobinBalancer } from './roundRobin';
import { LeastConnectionsBalancer } from './leastConnections';
import { simulateRequest, drainQueues, RequestResult } from './simulationRunner';

function getStats(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p: number) => sorted[Math.floor(p * (sorted.length - 1))];
  return { p50: getP(0.5), p95: getP(0.95), p99: getP(0.99) };
}

function runBenchmark(name: string, balancer: any) {
  const results: RequestResult[] = [];
  const TOTAL_REQUESTS = 1000;
  
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const server = balancer.getNextServer();
    results.push(simulateRequest(server));

    // DRAIN LOGIC: Simulate time passing.
    // Instead of draining all at once, we drain based on their speed.
    // Faster servers drain more often.
    balancer.servers.forEach((s: Server) => {
      // Every 'X' iterations, a server processes one request from its queue.
      // Srv-1 (10ms) drains almost every iteration.
      // Srv-5 (500ms) only drains once every 50 iterations.
      const drainInterval = Math.max(1, Math.floor(s.processingTimeMs / 10));
      if (i % drainInterval === 0 && s.queue.length > 0) {
        s.queue.shift();
      }
    });
  }

  const success = results.filter(r => !r.dropped).map(r => r.latencyMs);
  const dropped = results.filter(r => r.dropped).length;
  const stats = getStats(success);

  console.log(`\n--- ${name} ---`);
  console.log(`p95: ${stats.p95}ms | p99: ${stats.p99}ms | Dropped: ${dropped}`);
}
// Ensure deep copies so tests don't leak state to each other
const rrCluster = JSON.parse(JSON.stringify(MOCK_SERVERS_DAY_14));
const lcCluster = JSON.parse(JSON.stringify(MOCK_SERVERS_DAY_14));

runBenchmark("Round-Robin", new RoundRobinBalancer(rrCluster));
runBenchmark("Least-Connections", new LeastConnectionsBalancer(lcCluster));