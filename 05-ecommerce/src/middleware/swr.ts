// 05-ecommerce/src/middleware/swr.ts

// In a real distributed system, this would be a Redis client.
// For our implementation, we will use an in-memory map to simulate the edge cache.
const edgeCache = new Map<string, { data: any; timestamp: number }>();

const FRESH_TTL_MS = 60 * 1000; // 60 seconds (Fresh)
const STALE_TTL_MS = 60 * 60 * 1000; // 1 hour (Stale)

/**
 * Stale-While-Revalidate (SWR) Middleware for Product Pages
 */
export async function swrProductCache(req: any, res: any, next: Function) {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;
  const cachedRecord = edgeCache.get(cacheKey);
  const now = Date.now();

  if (cachedRecord) {
    const age = now - cachedRecord.timestamp;

    // 1. Cache Hit (Fresh)
    if (age < FRESH_TTL_MS) {
      console.log(`[SWR] CACHE HIT (Fresh): Serving product ${productId} immediately.`);
      return res.status(200).json(cachedRecord.data);
    }

    // 2. Cache Hit (Stale) - Serve immediately, revalidate in the background
    if (age < STALE_TTL_MS) {
      console.log(`[SWR] CACHE HIT (Stale): Serving stale product ${productId}. Triggering background revalidation...`);
      
      // Send the stale response to the user without blocking
      res.status(200).json(cachedRecord.data);

      // Asynchronously fetch fresh data (Mocked database call)
      fetchFreshProductData(productId).then(freshData => {
        edgeCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
        console.log(`[SWR] BACKGROUND REVALIDATION COMPLETE: Product ${productId} updated in cache.`);
      }).catch(err => {
        console.error(`[SWR] Background revalidation failed for ${productId}:`, err.message);
      });

      return; // End the request here since we already responded
    }
  }

  // 3. Cache Miss (or extremely expired data)
  console.log(`[SWR] CACHE MISS: Fetching product ${productId} synchronously from DB...`);
  
  try {
    const freshData = await fetchFreshProductData(productId);
    edgeCache.set(cacheKey, { data: freshData, timestamp: Date.now() });
    return res.status(200).json(freshData);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch product' });
  }
}

/**
 * Mock database fetch function
 */
async function fetchFreshProductData(id: string) {
  // Simulate network/database latency
  await new Promise(resolve => setTimeout(resolve, 300));
  return { id, name: 'Sample Product', price: 99.99, stock: 42 };
}