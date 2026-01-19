import express from 'express';
import { generateBase62Code } from './codegen';
import { urlCache } from './cache';
import cors from 'cors';
import { rateLimit, validateRequest, counters } from './middleware'; // Import counters

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// 1. POST /shorten with Custom TTL
app.post('/shorten', rateLimit, validateRequest, async (req, res) => {
  const { url, ttl } = req.body; // Accept optional TTL

  // Enforce a max TTL (e.g., 7 days) to prevent abuse
  const effectiveTtl = ttl && typeof ttl === 'number' && ttl < 604800 ? ttl : 86400;

  // Logic from Day 23 (Codegen + Collision Handling)
  const MAX_RETRIES = 3;
  let attempts = 0;
  let code = generateBase62Code();

  while (await urlCache.exists(code) && attempts < MAX_RETRIES) {
    code = generateBase62Code();
    attempts++;
  }

  if (await urlCache.exists(code)) {
    return res.status(500).json({ error: "Collision detected" });
  }

  // Pass the effective TTL
  await urlCache.set(code, url, effectiveTtl);
  
  // Increment success metric
  counters.total_requests++;

  return res.status(201).json({
    shortUrl: `http://localhost:${PORT}/${code}`,
    code: code,
    ttl: effectiveTtl
  });
});

// 2. GET /stats/:code (New Endpoint)
app.get('/stats/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await urlCache.get(code);

  if (!longUrl) {
    return res.status(404).json({ error: "URL not found" });
  }

  const ttl = await urlCache.getTtl(code);

  return res.json({
    code,
    originalUrl: longUrl,
    ttlSeconds: ttl,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString()
  });
});

// 3. GET /metrics (Prometheus Format)
app.get('/metrics', (req, res) => {
  const metrics = [
    `# HELP url_shortener_requests_total Total number of successful shorten requests`,
    `# TYPE url_shortener_requests_total counter`,
    `url_shortener_requests_total ${counters.total_requests || 0}`,
    
    `# HELP url_shortener_blocked_total Total requests blocked by validation`,
    `# TYPE url_shortener_blocked_total counter`,
    `url_shortener_blocked_total ${counters.abuse_validation_blocked_count}`,
    
    `# HELP url_shortener_rate_limited_total Total requests rejected by rate limit`,
    `# TYPE url_shortener_rate_limited_total counter`,
    `url_shortener_rate_limited_total ${counters.rate_limit_exceeded_count}`
  ];

  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

// GET /:code (Redirect)
app.get('/:code', async (req, res) => {
  const { code } = req.params;
  const longUrl = await urlCache.get(code);

  if (!longUrl) return res.status(404).json({ error: "URL not found" });
  return res.redirect(301, longUrl);
});

app.listen(PORT, () => {
  console.log(`URL Shortener listening on port ${PORT}`);
});
