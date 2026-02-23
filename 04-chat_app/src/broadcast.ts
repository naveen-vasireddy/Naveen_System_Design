import Redis from 'ioredis';
import { WebSocket } from 'ws';

// In a real app, this would be passed from your gateway.ts
export interface ChatClient {
  ws: WebSocket;
  userId: string;
  roomId: string;
  messageBuffer: any[];
}

export class BroadcastService {
  private redisSub: Redis;
  private clients: Set<ChatClient> = new Set();
  
  // Configuration from ADR-026
  private readonly BATCH_INTERVAL_MS = 100;
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(redisUrl: string) {
    this.redisSub = new Redis(redisUrl);
    
    // Subscribe to the global messages topic
    this.redisSub.subscribe('chat-messages-topic');
    this.redisSub.on('message', this.handleIncomingMessage.bind(this));

    // Start the batching loop
    setInterval(this.flushBuffers.bind(this), this.BATCH_INTERVAL_MS);
  }

  public registerClient(client: ChatClient) {
    this.clients.add(client);
  }

  public removeClient(client: ChatClient) {
    this.clients.delete(client);
  }

  // 1. Fan-out logic
  private handleIncomingMessage(channel: string, messageStr: string) {
    const message = JSON.parse(messageStr);
    
    // Route message to all clients in the target room
    for (const client of this.clients) {
      if (client.roomId === message.roomId) {
        this.enqueueMessage(client, message);
      }
    }
  }

  // 2. Backpressure / Drop Strategy logic
  private enqueueMessage(client: ChatClient, message: any) {
    client.messageBuffer.push(message);

    // Drop strategy for slow consumers
    if (client.messageBuffer.length > this.MAX_BUFFER_SIZE) {
      console.warn(`[Backpressure] Dropping messages for user ${client.userId}`);
      
      // Keep the newest messages, drop the oldest, and insert a gap warning
      client.messageBuffer = client.messageBuffer.slice(-this.MAX_BUFFER_SIZE / 2);
      client.messageBuffer.unshift({ type: 'gap_detected', error: 'buffer_overflow' });
    }
  }

  // 3. Batching logic
  private flushBuffers() {
    for (const client of this.clients) {
      if (client.messageBuffer.length > 0 && client.ws.readyState === WebSocket.OPEN) {
        // Send all buffered messages as a single batched array
        const payload = JSON.stringify({ type: 'batch', messages: client.messageBuffer });
        
        client.ws.send(payload);
        
        // Clear the buffer after sending
        client.messageBuffer = [];
      }
    }
  }
}