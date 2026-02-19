import express from 'express';
import Redis from 'ioredis';
import client from 'prom-client'; // <-- ADDED: Prometheus client
import { RedisTokenBucket } from './redisLimiter';
import { RateLimiterMiddleware } from './middleware';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// ==========================================
// 1. Setup Observability & Metrics (Day 43)
// ==========================================

// Initialize default system metrics (CPU, RAM, Event Loop)
client.collectDefaultMetrics();

// Define custom RED metrics
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1] // Latency buckets
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to automatically track metrics for all routes
app.use((req, res, next) => {
  // We don't want to track the /metrics endpoint itself
  if (req.path === '/metrics') return next();

  const endTimer = httpRequestDurationMicroseconds.startTimer();
  
  // Wait for the response to finish before recording metrics
  res.on('finish', () => {
    // Use req.route?.path to get the parameterized route (e.g., /limit/check) instead of raw URL
    const route = req.route?.path || req.path;
    
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    endTimer({ method: req.method, route, status_code: res.statusCode });
  });
  
  next();
});

// Expose the /metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// ==========================================
// 2. Setup Redis & Rate Limiter Components
// ==========================================
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: 1, // Fail fast to trigger resilience fallback
});

const redisLimiter = new RedisTokenBucket(redisClient);
const middleware = new RateLimiterMiddleware(redisLimiter);

// ==========================================
// 3. Define Routes
// ==========================================

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

// ==========================================
// 4. Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`Rate Limiter Service running on port ${PORT}`);
  console.log(`Connected to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Metrics available at http://localhost:${PORT}/metrics`);
});