export interface RateLimitPolicy {
  capacity: number;
  refillRate: number; // tokens per second
}

// Default limits for unknown users
const DEFAULT_POLICY: RateLimitPolicy = { capacity: 10, refillRate: 5 };

// Hardcoded tiers for simulation
const POLICIES: Record<string, RateLimitPolicy> = {
  'free': { capacity: 5, refillRate: 1 },         // 1 req/sec
  'pro': { capacity: 50, refillRate: 10 },        // 10 req/sec
  'enterprise': { capacity: 500, refillRate: 100 }, // 100 req/sec
};

/**
 * Determines the rate limit policy based on the client ID.
 * In production, this would look up the user's tier in a DB.
 */
export async function getPolicy(clientId: string): Promise<RateLimitPolicy> {
  // Mock Logic: Check if the ID contains "pro", "free", etc.
  if (clientId.includes('pro')) return POLICIES['pro'] ?? DEFAULT_POLICY;
  if (clientId.includes('enterprise')) return POLICIES['enterprise'] ?? DEFAULT_POLICY;
  if (clientId.includes('free')) return POLICIES['free'] ?? DEFAULT_POLICY;
  
  return DEFAULT_POLICY;
}