import { WebSocket } from 'ws';

const WS_URL = 'ws://localhost:8080/?token=mock-token-for-testing';
let attempt = 0;

function connect() {
  console.log(`[Client] Attempting to connect to ${WS_URL}...`);
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('[Client] Connected successfully!');
    attempt = 0; // Reset attempts on successful connection
    ws.send(JSON.stringify({ action: 'join', roomId: 'room-1' }));
  });

  ws.on('close', () => {
    console.log('[Client] Connection lost (DC Outage Simulated).');
    reconnect();
  });

  ws.on('error', (err) => {
    // Suppress error logs to keep the console clean during outage simulation
  });
}

function reconnect() {
  attempt++;
  // Exponential backoff: 2^attempt * 100ms (Max 5 seconds)
  const baseDelay = Math.min(Math.pow(2, attempt) * 100, 5000);
  
  // Jitter: Randomize the delay slightly to prevent the thundering herd problem
  const jitter = Math.floor(Math.random() * 200);
  const delay = baseDelay + jitter;

  console.log(`[Client] Reconnecting in ${delay}ms (Attempt ${attempt})...`);
  setTimeout(connect, delay);
}

// Start initial connection
connect();