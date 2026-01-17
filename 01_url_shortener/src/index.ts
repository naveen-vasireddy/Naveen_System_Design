import express from 'express';
import { generateBase62Code } from './codegen';
import { urlCache } from './cache';
import { rateLimit, validateRequest } from './middleware'; // Import the new middleware

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Write Endpoint (Protected) ---
// Order of middleware matters:
// 1. rateLimit: Stop spam bots immediately (saves CPU).
// 2. validateRequest: Ensure URL is valid and not on the blocklist.
app.post('/shorten', rateLimit, validateRequest, async (req, res) => {
  const { url } = req.body;

  // Logic from Day 23 (Codegen + Collision Handling)
  const MAX_RETRIES = 3;
  let attempts = 0;
  let code = generateBase62Code();

  while (await urlCache.exists(code) && attempts < MAX_RETRIES) {
    code = generateBase62Code();
    attempts++;
  }

  if (await urlCache.exists(code)) {
    return res.status(500).json({ 
      error: "Could not generate a unique short link. Please try again." 
    });
  }

  await urlCache.set(code, url);
  
  return res.status(201).json({
    shortUrl: `http://localhost:${PORT}/${code}`,
    code: code
  });
});

// --- Read Endpoint (Public/Fast) ---
// We generally do NOT rate limit the redirect path as aggressively, 
// or we use a much higher limit (e.g., 1000/min), as this is the "Hot Path".
app.get('/:code', async (req, res) => {
  const { code } = req.params;

  const longUrl = await urlCache.get(code);

  if (!longUrl) {
    return res.status(404).json({ error: "URL not found" });
  }

  return res.redirect(301, longUrl);
});

app.listen(PORT, () => {
  console.log(`URL Shortener listening on port ${PORT}`);
});