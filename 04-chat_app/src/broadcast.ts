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
  private messageCount = 0;
  private lastLogTime = Date.now();

  constructor(redisUrl: string) {
    this.redisSub = new Redis(redisUrl);
    
    // Set up error handler first
    this.redisSub.on('error', (error) => {
      console.error('[BroadcastService] Redis error:', error);
    });
    
    // Subscribe to the global messages topic
    this.redisSub.on('ready', () => {
      console.log('[BroadcastService] Redis connection ready');
    });
    
    this.redisSub.subscribe('chat-messages-topic', (err, count) => {
      if (err) {
        console.error('[BroadcastService] Failed to subscribe:', err);
      } else {
        console.log(`[BroadcastService] Subscribed to ${count} channel(s)`);
      }
    });
    
    // Listen for messages on the subscription
    this.redisSub.on('message', (channel: string, messageStr: string) => {
      try {
        const message = JSON.parse(messageStr);
        this.messageCount++;
        
        // Log every 500 messages to avoid spam
        if (this.messageCount % 500 === 0) {
          console.log(`[BroadcastService] Received ${this.messageCount} messages from Redis`);
        }
        
        // Route message to all clients in the target room
        let routedCount = 0;
        for (const client of this.clients) {
          if (client.roomId === message.roomId) {
            this.enqueueMessage(client, message);
            routedCount++;
          }
        }
      } catch (error) {
        console.error('[BroadcastService] Error processing message:', error);
      }
    });

    // Start the batching loop
    setInterval(this.flushBuffers.bind(this), this.BATCH_INTERVAL_MS);
    
    console.log('[BroadcastService] Initialized');
  }

  public registerClient(client: ChatClient) {
    this.clients.add(client);
    console.log(`[BroadcastService] Client registered: ${client.userId} in room ${client.roomId} (total: ${this.clients.size})`);
  }

  public removeClient(client: ChatClient) {
    this.clients.delete(client);
    console.log(`[BroadcastService] Client removed: ${client.userId} (total: ${this.clients.size})`);
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
      if (client.messageBuffer.length > 0 && client.ws.readyState === 1) { // WebSocket.OPEN === 1
        try {
          // Send all buffered messages as a single batched array
          const payload = JSON.stringify({ type: 'batch', messages: client.messageBuffer });
          
          client.ws.send(payload);
          
          // Clear the buffer after sending
          client.messageBuffer = [];
        } catch (error) {
          console.error(`[BroadcastService] Error sending batch to user ${client.userId}:`, error);
        }
      }
    }
  }
}