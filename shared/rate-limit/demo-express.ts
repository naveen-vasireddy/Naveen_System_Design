import express, { Request, Response, NextFunction } from 'express';
import { TokenBucket } from './tokenBucket';

const app = express();
const PORT = 3000;

// Initialize a Token Bucket: 
// Capacity (Burst size): 5 tokens
// Refill Rate: 1 token per second
const bucket = new TokenBucket(5, 1);

/**
 * Middleware: Rate Limiter
 * Uses the TokenBucket instance to decide if a request should proceed.
 */
const rateLimiterMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (bucket.consume(1)) {
    // Attach current state to headers for visibility
    res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.getAvailableTokens()));
    next();
  } else {
    // Return 429 as per system design standards for rate limiting
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait for the bucket to refill.',
      retryAfterSeconds: 1 // Based on our refill rate
    });
  }
};

// Apply middleware to the demo route
app.get('/api/resource', rateLimiterMiddleware, (req: Request, res: Response) => {
  res.json({
    data: 'Success! You accessed the protected resource.',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Rate Limiter Demo Server running at http://localhost:${PORT}`);
  console.log(`Config: Capacity=5, RefillRate=1/sec`);
  console.log(`Try hitting http://localhost:${PORT}/api/resource rapidly to see the burst and limit.`);
});