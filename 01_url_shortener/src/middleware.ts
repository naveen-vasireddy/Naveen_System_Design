import { Request, Response, NextFunction } from 'express';
import { redis } from './cache'; // Ensure 'redis' is exported from your cache.ts

// --- Configuration ---
const BLOCKLIST = ['malware.site', 'phishing.com', 'bad-actor.net'];
const RATE_LIMIT_WINDOW = 60; // 60 seconds
const RATE_LIMIT_MAX = 10;    // 10 requests per window per IP

// --- Observability Counters (Placeholders for Day 42) ---
const counters = {
  abuse_validation_blocked_count: 0,
  rate_limit_exceeded_count: 0
};

/**
 * Step 1: Input Validation & Blocklist
 * Verifies URL format and checks against banned domains.
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const parsedUrl = new URL(url);

    // Blocklist Check
    if (BLOCKLIST.includes(parsedUrl.hostname)) {
      console.warn(`[Security] Blocked malicious domain: ${parsedUrl.hostname}`);
      counters.abuse_validation_blocked_count++;
      
      return res.status(400).json({ 
        error: 'This domain is on our blocklist and cannot be shortened.' 
      });
    }

    // Protocol Check (optional: enforce http/https)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS protocols are supported.' });
    }

    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }
};

/**
 * Step 2: Per-IP Rate Limiting
 * Uses Redis Fixed Window strategy (INCR + EXPIRE).
 */
export const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rate_limit:${ip}`;

  try {
    // Atomic increment
    const currentCount = await redis.incr(key);

    // If this is the first request, set the expiry window
    if (currentCount === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    // Check Limit
    if (currentCount > RATE_LIMIT_MAX) {
      console.warn(`[RateLimit] IP ${ip} exceeded limit.`);
      counters.rate_limit_exceeded_count++;
      
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: await redis.ttl(key) // Inform client when to retry
      });
    }

    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open: If Redis is down, allow the request to proceed (Availability > Consistency for rate limits)
    next();
  }
};