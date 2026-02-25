import { WebSocket } from 'ws';

const NUM_CLIENTS = 100;  // Reduced from 2000 for initial testing
const WS_URL = 'ws://localhost:8080?token=mock-token-for-testing';
const clients: WebSocket[] = [];
const latencies: number[] = [];
let connectedCount = 0;

console.log(`Starting simulation for ${NUM_CLIENTS} clients...`);

// Helper to calculate percentiles
function getPercentile(arr: number[], p: number) {
  if (arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// 1. Connect all clients
for (let i = 0; i < NUM_CLIENTS; i++) {
  const ws = new WebSocket(WS_URL);
  
  ws.on('open', () => {
    connectedCount++;
    if (connectedCount % 10 === 0 || connectedCount === NUM_CLIENTS) {
      console.log(`[Simulation] Connected: ${connectedCount}/${NUM_CLIENTS}`);
    }
    // When the connection opens, send join message
    try {
      ws.send(JSON.stringify({ action: 'join', roomId: 'room-1' }));
    } catch (error) {
      console.error('[Simulation] Error sending join message:', error);
    }
  });
  
  ws.on('message', (data) => {
    try {
      const payload = JSON.parse(data.toString());
      const now = Date.now();
      
      // Check if it's a batch of messages
      if (payload.type === 'batch' && payload.messages) {
        payload.messages.forEach((msg: any) => {
          if (msg.timestamp) latencies.push(now - msg.timestamp);
        });
      } 
      // Check if it's a single direct message
      else if (payload.timestamp) {
        latencies.push(now - payload.timestamp);
      }
      // Silently ignore other message types (like presence)
    } catch (error) {
      console.error('[Simulation] Error processing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error(`[Simulation] WebSocket error (client ${i}):`, error.message);
  });

  ws.on('close', () => {
    connectedCount--;
  });

  clients.push(ws);
}

// 2. Wait for connections to establish, then print stats periodically
setTimeout(() => {
  console.log(`[Simulation] All clients initiated. Connected: ${connectedCount}/${NUM_CLIENTS}. Waiting for messages...`);
  
  setInterval(() => {
    if (latencies.length > 0) {
      console.log(`\n--- Latency Stats (${latencies.length} messages received, ${connectedCount}/${NUM_CLIENTS} clients active) ---`);
      console.log(`p50 (Median): ${getPercentile(latencies, 50)} ms`);
      console.log(`p95:          ${getPercentile(latencies, 95)} ms`);
      console.log(`p99:          ${getPercentile(latencies, 99)} ms`);
      console.log(`Max:          ${Math.max(...latencies)} ms`);
      console.log(`Min:          ${Math.min(...latencies)} ms`);
      console.log(`Avg:          ${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)} ms`);
      
      // Clear array for the next window
      latencies.length = 0; 
    } else {
      console.log(`[Simulation] No messages received (${connectedCount}/${NUM_CLIENTS} clients active)`);
    }
  }, 5000);
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Simulation] Shutting down...');
  clients.forEach(ws => ws.close());
  process.exit(0);
});
