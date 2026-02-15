import { ClusterManager } from './clusterManager';
import net from 'net';

const cluster = new ClusterManager();
cluster.addNode('127.0.0.1:6379');
cluster.addNode('127.0.0.1:6380');
cluster.addNode('127.0.0.1:6381');

const TOTAL_REQUESTS = 500;
let success = 0;
let failures = 0;

async function sendRequest(i: number) {
  const key = `key-${i}`;
  const node = cluster.getNodeForKey(key);
  const [host, port] = node.split(':');

  return new Promise<void>((resolve) => {
    const socket = new net.Socket();
    const start = Date.now();

    // 200ms Timeout to simulate "Fail Fast"
    socket.setTimeout(200); 

    socket.connect(parseInt(port), host, () => {
      socket.write(`SET ${key} value-${i}\r\n`);
    });

    socket.on('data', () => {
      success++;
      socket.destroy();
      resolve();
    });

    socket.on('timeout', () => {
      failures++;
      socket.destroy();
      resolve();
    });

    socket.on('error', () => {
      failures++;
      resolve();
    });
  });
}

async function run() {
  console.log('--- Starting Chaos Test ---');
  // Send requests in batches
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    await sendRequest(i);
    // Slow down slightly to give us time to kill a node
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 50));
    
    if (i === 100) console.log('!!! KILL ONE NODE NOW !!!');
  }
  
  console.log('\n--- Results ---');
  console.log(`Success: ${success}`);
  console.log(`Failures: ${failures}`);
  console.log(`Availability: ${((success / TOTAL_REQUESTS) * 100).toFixed(2)}%`);
}

run();