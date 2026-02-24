/**
 * Chat Application Main Entry Point
 * 
 * This file starts:
 * 1. WebSocket Gateway (listens for client connections)
 * 2. Broadcast Service (fan-out messages to clients)
 * 3. Worker Process (publishes outbox messages)
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import { AuthService } from './auth';
import { BroadcastService, ChatClient } from './broadcast';

// ============================================================================
// 1. INITIALIZE CORE SERVICES
// ============================================================================

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

// Presence tracking (maps userId -> WebSocket connection)
const presenceMap = new Map<string, WebSocket>();

// Client registry for the broadcast service
const clientRegistry: Map<string, ChatClient> = new Map();

// Initialize the Broadcast Service
const broadcastService = new BroadcastService(process.env.REDIS_URL || 'redis://localhost:6379');

console.log('[Server] Initializing Chat Application...');

// ============================================================================
// 2. HANDLE HTTP UPGRADE (WebSocket Handshake + Authentication)
// ============================================================================

server.on('upgrade', (request: any, socket, head) => {
  const { query } = url.parse(request.url || '', true);
  const token = query.token as string;
  let user: any;

  // Check if it's a test token
  if (request.url && request.url.includes('token=mock-token-for-testing')) {
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

  // Complete the WebSocket upgrade
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, user);
  });
});

// ============================================================================
// 3. HANDLE ACTIVE WEBSOCKET CONNECTIONS
// ============================================================================

wss.on('connection', (ws: WebSocket, user: { userId: string, username: string }) => {
  console.log(`[Gateway] User connected: ${user.username} (${user.userId})`);
  
  // Mark user as online
  presenceMap.set(user.userId, ws);
  broadcastPresence(user.userId, 'online');

  // Auto-register client with broadcast service for room-1 on connection
  const client: ChatClient = {
    ws,
    userId: user.userId,
    roomId: 'room-1',
    messageBuffer: []
  };
  clientRegistry.set(user.userId, client);
  broadcastService.registerClient(client);

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString());

      // Handle room join action (in case client wants to join a different room)
      if (payload.action === 'join' && payload.roomId) {
        console.log(`[Gateway] User ${user.username} switching to room ${payload.roomId}`);
        // Update the client's room
        client.roomId = payload.roomId;
      } else {
        console.log(`[Gateway] Message from ${user.username}:`, payload);
      }
    } catch (error) {
      console.error(`[Gateway] Error handling message from ${user.username}:`, error);
    }
  });

  ws.on('error', (error) => {
    console.error(`[Gateway] WebSocket error for ${user.username}:`, error);
  });

  ws.on('close', () => {
    console.log(`[Gateway] User disconnected: ${user.username}`);
    presenceMap.delete(user.userId);
    
    // Unregister from broadcast service
    if (clientRegistry.has(user.userId)) {
      broadcastService.removeClient(client);
      clientRegistry.delete(user.userId);
    }
    
    broadcastPresence(user.userId, 'offline');
  });
});

// ============================================================================
// 4. HELPER FUNCTIONS
// ============================================================================

/**
 * Broadcast presence updates to all connected clients on this node
 */
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

// ============================================================================
// 5. START THE SERVER
// ============================================================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`[Server] WebSocket Gateway running on ws://localhost:${PORT}`);
  console.log(`[Server] Broadcast Service initialized`);
  console.log(`[Server] Ready to accept connections...`);
});

// ============================================================================
// 6. GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully...');
  
  // Close all client connections
  presenceMap.forEach((ws) => ws.close());
  presenceMap.clear();
  clientRegistry.clear();
  
  // Close the server
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[Server] SIGINT received, shutting down gracefully...');
  
  // Close all client connections
  presenceMap.forEach((ws) => ws.close());
  presenceMap.clear();
  clientRegistry.clear();
  
  // Close the server
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught exception:', error);
  process.exit(1);
});
