import { MOCK_SERVERS, Server } from './types';
import { RoundRobinBalancer } from './roundRobin';
import { LeastConnectionsBalancer } from './leastConnections';

// 1. Setup: Reset server connections for a clean test
const resetServers = () => MOCK_SERVERS.map(s => ({ ...s, activeConnections: 0 }));

console.log("--- Starting Load Balancer Verification ---");

// --- TEST 1: Round-robin (Sequential) ---
const rrServers = resetServers();
const rrBalancer = new RoundRobinBalancer(rrServers);

console.log("\nTesting Round-robin (10 requests):");
for (let i = 1; i <= 10; i++) {
  const server = rrBalancer.getNextServer();
  console.log(`Request ${i} -> Directed to: ${server.id}`);
}
// Expected Output: srv-1, srv-2, srv-3, srv-4, srv-5, srv-1...


// --- TEST 2: Least-connections (Load-aware) ---
const lcServers = resetServers();
const lcBalancer = new LeastConnectionsBalancer(lcServers);

console.log("\nTesting Least-connections (Simulating uneven load):");

// Manually simulate that Server 1 and Server 2 are busy
lcBalancer.reportRequestStart('srv-1'); // Load: 1
lcBalancer.reportRequestStart('srv-1'); // Load: 2
lcBalancer.reportRequestStart('srv-2'); // Load: 1

// The next request should go to srv-3, srv-4, or srv-5 (all have 0 load)
const target = lcBalancer.getNextServer();
console.log(`Next request directed to: ${target.id} (Current load: ${target.activeConnections})`);

// Finish a request on srv-1 and see the balancer adapt
lcBalancer.reportRequestEnd('srv-1');
lcBalancer.reportRequestEnd('srv-1');
console.log("Reduced load on srv-1. Next request should now favor srv-1.");
const newTarget = lcBalancer.getNextServer();
console.log(`Next request directed to: ${newTarget.id}`);