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
server.on('upgrade', (request, socket, head) => {
  const { query } = url.parse(request.url || '', true);
  const token = query.token as string;

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  const user = AuthService.verifyToken(token);
  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // If authenticated, complete the upgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, user);
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
    console.log(`[Gateway] Received from ${user.username}: ${message}`);
    // Tomorrow (Day 46) we will route these messages to a Message Store / Outbox
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
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(event);
    }
  });
}

// 5. Start the Gateway
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket Gateway running on ws://localhost:${PORT}`);
});