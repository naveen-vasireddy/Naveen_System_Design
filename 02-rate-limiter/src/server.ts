import express, { Request, Response } from 'express';
import Redis from 'ioredis';
import { RateLimiterMiddleware } from './middleware';
import { RedisTokenBucket } from './redisLimiter';

const app = express();
const PORT = process.env.PORT || 3000;
let redisConnected = false;
let redisErrorLogged = false;

// Initialize Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    // Stop retrying after 10 attempts (max ~20 seconds)
    if (times > 10) {
      if (!redisErrorLogged) {
        console.log('[Redis] ⚠️  Could not connect. Using in-memory rate limiting fallback.');
        redisErrorLogged = true;
      }
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    return false; // Don't auto-reconnect on errors
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
});

redis.on('error', (err) => {
  if (!redisErrorLogged && redisConnected === false) {
    console.log('[Redis] ⚠️  Connection failed. Will use in-memory rate limiting.');
    redisErrorLogged = true;
  }
});

redis.on('connect', () => {
  redisConnected = true;
  console.log('[Redis] ✅ Connected');
});

// Initialize rate limiter middleware
const redisLimiter = new RedisTokenBucket(redis, 10); // 10 tokens per second
const rateLimiterMiddleware = new RateLimiterMiddleware(redisLimiter);

app.use(express.json());

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Rate-limited API endpoint
 * Usage: POST /api/request?clientId=<id>
 * 
 * Example client IDs:
 * - "free-user" → 5 req/sec (free tier)
 * - "pro-user" → 10 req/sec (pro tier)
 * - "enterprise-account" → 100 req/sec (enterprise tier)
 */
app.post('/api/request', async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string || 'anonymous';

  if (!clientId) {
    res.status(400).json({ error: 'Missing clientId query parameter' });
    return;
  }

  try {
    const result = await rateLimiterMiddleware.handle(clientId);

    if (!result.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: result.remaining,
        resetAtMs: result.resetAtMs,
        source: result.source,
      });
      return;
    }

    res.json({
      message: 'Request allowed',
      clientId,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
      source: result.source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Server] Request error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
});

/**
 * GET endpoint to check rate limit status
 */
app.get('/api/status', async (req: Request, res: Response) => {
  const clientId = req.query.clientId as string || 'anonymous';

  if (!clientId) {
    res.status(400).json({ error: 'Missing clientId query parameter' });
    return;
  }

  try {
    const result = await rateLimiterMiddleware.handle(clientId);
    res.json({
      clientId,
      allowed: result.allowed,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
      source: result.source,
    });
  } catch (error) {
    console.error('[Server] Status error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /limit/incr - Rate limit increment endpoint (for k6 benchmarks)
 * Request body: { key: string, cost?: number }
 */
app.post('/limit/incr', async (req: Request, res: Response) => {
  const { key, cost = 1 } = req.body;

  if (!key) {
    res.status(400).json({ error: 'Missing "key" in request body' });
    return;
  }

  try {
    const result = await rateLimiterMiddleware.handle(key);

    if (!result.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        remaining: result.remaining,
        retryAfter: result.resetAtMs ? Math.ceil((result.resetAtMs - Date.now()) / 1000) : 0,
      });
      return;
    }

    res.status(200).json({
      success: true,
      remaining: result.remaining,
      resetAtMs: result.resetAtMs,
    });
  } catch (error) {
    console.error('[Server] /limit/incr error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Rate Limiter Server running on http://localhost:${PORT}`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   GET  /health                  - Health check`);
  console.log(`   POST /api/request?clientId=<id> - Make a rate-limited request`);
  console.log(`   GET  /api/status?clientId=<id>  - Check rate limit status`);
  console.log(`   POST /limit/incr              - Rate limit with key in body (k6 load test)`);
  console.log(`\n💡 Example client IDs:`);
  console.log(`   free-user         → 5 req/sec`);
  console.log(`   pro-user          → 10 req/sec`);
  console.log(`   enterprise-account → 100 req/sec`);
  console.log(`\n`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📍 Shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});
