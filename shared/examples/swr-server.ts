import { LRUCache } from '../cache/lru';

// Configuration for our SWR logic
const FRESH_TTL = 5000;      // 5 seconds: Data is fresh
const STALE_LIMIT = 30000;   // 30 seconds: Data is stale but servable
const DB_LATENCY = 1000;     // 1 second: Simulated DB delay

/**
 * A mock database fetch function. 
 * Uses a delay to simulate real-world latency [2].
 */
async function mockDatabaseFetch(id: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Data for ${id} (fetched at ${new Date().toISOString()})`);
    }, DB_LATENCY);
  });
}

/**
 * SWR Wrapper Logic
 */
export class SWRServer {
  private cache: LRUCache<string, { value: string; fetchedAt: number }>;

  constructor(capacity: number) {
    // Reusing our O(1) LRU Cache from Day 7 [1]
    this.cache = new LRUCache(capacity);
  }

  public async handleRequest(id: string): Promise<{ data: string; source: string }> {
    const cachedEntry = this.cache.get(id);
    const now = Date.now();

    // 1. CACHE MISS: No data exists at all
    if (!cachedEntry) {
      const data = await mockDatabaseFetch(id);
      this.cache.set(id, { value: data, fetchedAt: Date.now() }, STALE_LIMIT);
      return { data, source: 'database (sync)' };
    }

    const age = now - cachedEntry.fetchedAt;

    // 2. FRESH HIT: Data is within the Fresh TTL
    if (age <= FRESH_TTL) {
      return { data: cachedEntry.value, source: 'cache (fresh)' };
    }

    // 3. STALE-WHILE-REVALIDATE: Data is stale but within the SWR limit
    if (age > FRESH_TTL && age <= STALE_LIMIT) {
      // TRIGGER BACKGROUND REFRESH (Do not await!)
      this.revalidate(id);

      // Return the stale data immediately to the user
      return { data: cachedEntry.value, source: 'cache (stale-swr)' };
    }

    // 4. HARD EXPIRY: Data is too old (This shouldn't happen often with lazy eviction)
    const data = await mockDatabaseFetch(id);
    this.cache.set(id, { value: data, fetchedAt: Date.now() }, STALE_LIMIT);
    return { data, source: 'database (expired)' };
  }

  private async revalidate(id: string) {
    console.log(`[SWR] Revalidating ${id} in background...`);
    const freshData = await mockDatabaseFetch(id);
    this.cache.set(id, { value: freshData, fetchedAt: Date.now() }, STALE_LIMIT);
    console.log(`[SWR] Cache updated for ${id}`);
  }
}

// Demo Execution
async function runDemo() {
  const server = new SWRServer(10);
  
  console.log("1. First request (Miss)...");
  console.log(await server.handleRequest("user_1"));

  console.log("\n2. Immediate second request (Fresh Hit)...");
  console.log(await server.handleRequest("user_1"));

  console.log("\n3. Waiting 6 seconds to make data stale...");
  await new Promise(r => setTimeout(r, 6000));

  console.log("4. Requesting stale data (SWR Triggered)...");
  // This should return instantly even though the DB takes 1 second
  console.log(await server.handleRequest("user_1"));

  console.log("\n5. Waiting for background refresh to finish...");
  await new Promise(r => setTimeout(r, 1500));

  console.log("6. Final request (Fresh Hit from refreshed data)...");
  console.log(await server.handleRequest("user_1"));
}

runDemo();