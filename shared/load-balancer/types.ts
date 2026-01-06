export interface Server {
  id: string;
  activeConnections: number; 
  queue: string[];           // Backpressure queue
  maxQueueSize: number;      // Maximum capacity before dropping
  processingTimeMs: number;  // Latency to simulate "uneven loads"
}

export const MOCK_SERVERS_DAY_14: Server[] = [
  { id: 'srv-1', activeConnections: 0, queue: [], maxQueueSize: 20, processingTimeMs: 10 },  // Fast
  { id: 'srv-2', activeConnections: 0, queue: [], maxQueueSize: 20, processingTimeMs: 10 },  // Fast
  { id: 'srv-3', activeConnections: 0, queue: [], maxQueueSize: 20, processingTimeMs: 10 },  // Fast
  { id: 'srv-4', activeConnections: 0, queue: [], maxQueueSize: 20, processingTimeMs: 100 }, // Slow
  { id: 'srv-5', activeConnections: 0, queue: [], maxQueueSize: 20, processingTimeMs: 500 }, // Struggling
];