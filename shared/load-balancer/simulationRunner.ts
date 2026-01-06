import { Server } from './types';

export interface RequestResult {
  latencyMs: number;
  dropped: boolean;
}

export function simulateRequest(server: Server): RequestResult {
  if (server.queue.length >= server.maxQueueSize) {
    return { latencyMs: 0, dropped: true };
  }
  
  // Latency = (Items already in queue + current request) * Processing Time
  const latency = (server.queue.length + 1) * server.processingTimeMs;
  server.queue.push(`req-${Date.now()}`);
  
  return { latencyMs: latency, dropped: false };
}

/**
 * Simulates time passing. Servers clear their queues based on their speeds.
 */
export function drainQueues(servers: Server[]) {
  servers.forEach(server => {
    if (server.queue.length > 0) {
      server.queue.shift(); // Remove the oldest request from the queue
    }
  });
}