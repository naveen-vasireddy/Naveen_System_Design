import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import { AuthService } from './auth';

// 1. Create a basic HTTP server to attach the WebSocket server to
const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

// 2. Presence Tracking (In-memory for Day 45. Will move to Redis later)
// Maps userId -> active WebSocket connection
const presenceMap = new Map<string, WebSocket>();

// 3. Handle the HTTP Upgrade process (Handshake + Auth)
server.on('upgrade', (request:any, socket, head) => {
  const { query } = url.parse(request.url || '', true);
  const token = query.token as string;
  let user: any;

  // Simply check if the raw request string contains our test token
  if (request.url && request.url.includes('token=mock-token-for-testing')) {
    // Skip JWT verification and allow the connection for the load test
    user = { userId: `simulated-user-${Math.random()}`, username: `test-user-${Math.random().toString(36).slice(2, 9)}` };
  } else if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  } else {
    const authenticatedUser = AuthService.verifyToken(token);
    if (!authenticatedUser) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    user = authenticatedUser;
  }

  // If authenticated, complete the upgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, user);
  });
});

// 4. Handle Active Connections
wss.on('connection', (ws: WebSocket, user: { userId: string, username: string }) => {
  console.log(`[Gateway] User connected: ${user.username} (${user.userId})`);
  
  // Mark user as online
  presenceMap.set(user.userId, ws);
  broadcastPresence(user.userId, 'online');

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      console.log(`[Gateway] Received from ${user.username}: ${message}`);
      // Tomorrow (Day 46) we will route these messages to a Message Store / Outbox
    } catch (error) {
      console.error(`[Gateway] Error handling message from ${user.username}:`, error);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[Gateway] WebSocket error for ${user.username}:`, error);
  });

  // Handle disconnections
  ws.on('close', () => {
    console.log(`[Gateway] User disconnected: ${user.username}`);
    presenceMap.delete(user.userId);
    broadcastPresence(user.userId, 'offline');
  });
});

// Helper: Broadcast presence updates to everyone on this node
function broadcastPresence(userId: string, status: 'online' | 'offline') {
  const event = JSON.stringify({ type: 'presence', userId, status });
  presenceMap.forEach((clientWs) => {
    try {
      if (clientWs.readyState === 1) { // WebSocket.OPEN === 1
        clientWs.send(event);
      }
    } catch (error) {
      console.error(`[Gateway] Error broadcasting presence:`, error);
    }
  });
}

// 5. Start the Gateway
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket Gateway running on ws://localhost:${PORT}`);
});