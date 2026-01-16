// 01-url-shortener/src/index.ts
import express from 'express';
import { generateBase62Code } from './codegen';
import { urlCache } from './cache';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// POST /shorten - Generates a short code for a given long URL
app.post('/shorten', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Basic collision retry logic (Strategy for ADR-014)
  let code = generateBase62Code();
  let attempts = 0;
  while (await urlCache.exists(code) && attempts < 3) {
    code = generateBase62Code();
    attempts++;
  }

  await urlCache.set(code, url);
  
  return res.status(201).json({
    shortUrl: `http://localhost:${PORT}/${code}`,
    code: code
  });
});

// GET /:code - Redirects to the original long URL
app.get('/:code', async (req, res) => {
  const { code } = req.params;

  const longUrl = await urlCache.get(code);

  if (!longUrl) {
    // In a real system, we would check the DB here if cache misses [2]
    return res.status(404).json({ error: "URL not found" });
  }

  return res.redirect(301, longUrl);
});

app.listen(PORT, () => {
  console.log(`URL Shortener listening on port ${PORT}`);
});
