import express, { Request, Response, NextFunction } from 'express';
// Note: In a real implementation, you'd import your LRU cache from Day 7
// import { LRUCache } from '../../cache/lru'; 

const app = express();
app.use(express.json());

// Simple in-memory store for the demo; in production, use Redis (Day 12/32)
const idempotencyStore = new Map<string, { status: number; body: any; processing: boolean }>();

/**
 * Step 2: Idempotency Middleware
 * Intercepts requests with X-Idempotency-Key to prevent duplicate side effects.
 */
const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.header('X-Idempotency-Key');

  // Skip idempotency for GET/HEAD as they are naturally idempotent
  if (!key || req.method === 'GET') {
    return next();
  }

  const cachedResponse = idempotencyStore.get(key);

  if (cachedResponse) {
    if (cachedResponse.processing) {
      // Step 2.1: Handle "Concurrent Request" scenario
      return res.status(409).send('Conflict: Request is already being processed.');
    }
    // Step 2.2: Return cached response immediately (Fail-fast/Success-fast)
    console.log(`Idempotency Hit: Returning cached result for ${key}`);
    return res.status(cachedResponse.status).json(cachedResponse.body);
  }

  // Step 2.3: Set "Processing" flag to handle race conditions
  idempotencyStore.set(key, { status: 0, body: null, processing: true });

  // Patch res.send to capture the final response for caching
  const originalSend = res.json;
  res.json = function (body: any): Response {
    idempotencyStore.set(key, { 
      status: res.statusCode, 
      body, 
      processing: false 
    });
    return originalSend.call(this, body);
  };

  next();
};

// Apply middleware to write endpoints
app.post('/orders', idempotencyMiddleware, (req:any, res) => {
  // Simulate heavy database/payment processing logic
  console.log("Processing new order...");
  const orderId = Math.floor(Math.random() * 100000);
  
  // Return a success response that will be cached by our middleware
  res.status(201).json({ 
    message: "Order created successfully", 
    orderId,
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => console.log('Idempotency Demo Server running on port 3000'));
