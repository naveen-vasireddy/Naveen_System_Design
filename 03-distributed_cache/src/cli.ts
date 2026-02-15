import net from 'net';
import { ClusterManager } from './clusterManager';

// 1. Initialize the Smart Client Logic
const cluster = new ClusterManager();
// Assuming we are running 3 local nodes for this test
cluster.addNode('127.0.0.1:6379');
cluster.addNode('127.0.0.1:6380');
cluster.addNode('127.0.0.1:6381');

// 2. Parse Arguments
const args = process.argv.slice(2);
const command = args[0]
const key = args[1]
const value = args[2]

if (!command || !key) {
  console.log('Usage: npx ts-node src/cli.ts <SET|GET> <KEY> [VALUE]');
  process.exit(1);
}

// 3. Execute
async function run() {
  // Find the correct node for this key
  const targetNode = cluster.getNodeForKey(key);
  console.log(`[CLI] Key "${key}" maps to node ${targetNode}`);

  const [host, port] = targetNode.split(':');

  // Connect and send command
  const socket = new net.Socket();
  
  socket.connect(parseInt(port), host, () => {
    let payload = `${command} ${key}`;
    if (value) payload += ` ${value}`;
    socket.write(`${payload}\r\n`);
  });

  socket.on('data', (data) => {
    console.log(`[Response from ${targetNode}]: ${data.toString().trim()}`);
    socket.destroy();
  });

  socket.on('error', (err) => {
    console.error(`[Error] Could not connect to ${targetNode}: ${err.message}`);
    console.log(`[Failover] In a real app, we would now try the replica...`);
    socket.destroy();
  });
}

run();