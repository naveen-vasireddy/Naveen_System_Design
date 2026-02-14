import { ClusterManager } from './clusterManager';
import { HealthMonitor } from './health';
import net from 'net';

// 1. Start a real server on port 6379 (Node A)
const server = net.createServer((socket) => {
  socket.on('data', () => socket.write('PONG\r\n'));
});
server.listen(6379, () => console.log('Fake Node A running on 6379'));

// 2. Setup Cluster
const cluster = new ClusterManager();
cluster.addNode('127.0.0.1:6379'); // Alive
cluster.addNode('127.0.0.1:6380'); // Dead (nothing running here)

console.log('Initial Nodes:', cluster.getAllNodes());

// 3. Start Health Monitor
// Short interval for testing
const monitor = new HealthMonitor(cluster, 1000, 2); 
monitor.start();

// 4. Observe removal
setTimeout(() => {
  console.log('Nodes after health check:', cluster.getAllNodes());
  process.exit(0);
}, 4000);