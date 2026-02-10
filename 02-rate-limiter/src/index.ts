import express from 'express';
import Redis from 'ioredis';
import { RedisTokenBucket } from './redisLimiter';
import { RateLimiterMiddleware } from './middleware';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// 1. Setup Redis Client
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: 1, // Fail fast to trigger resilience fallback
});

// 2. Setup Rate Limiter Components
const redisLimiter = new RedisTokenBucket(redisClient);
const middleware = new RateLimiterMiddleware(redisLimiter);

// 3. Define Routes

// GET /limit/check?key=user_123 (Read-Only)
app.get('/limit/check', async (req, res) => {
  const key = req.query.key as string;
  if (!key) return res.status(400).json({ error: 'Missing key parameter' });

  // Simple check (cost 0) just to see remaining balance
  try {
    const result = await redisLimiter.allow(key, 0, 10);
    res.json(result);
  } catch (err) {
    res.json({ allowed: true, remaining: 10, source: 'fallback-check' });
  }
});

// POST /limit/incr (Consume Tokens)
app.post('/limit/incr', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Missing key in body' });

  // Use the Middleware (handles Redis -> Memory fallback)
  const result = await middleware.handle(key);

  if (result.allowed) {
    res.status(200).json(result);
  } else {
    res.status(429).json(result);
  }
});

// 4. Start Server
app.listen(PORT, () => {
  console.log(`Rate Limiter Service running on port ${PORT}`);
  console.log(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
});