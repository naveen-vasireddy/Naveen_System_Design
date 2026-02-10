import Redis from 'ioredis';
import type { RateLimiter } from './limiters/index';

// LUA SCRIPT: Atomically refills and consumes tokens
// Returns: [allowed (1/0), remainingTokens, resetAtMs]
// LUA SCRIPT: Atomically refills and consumes tokens
const TOKEN_BUCKET_SCRIPT = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refillRate = tonumber(ARGV[2])
  local cost = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])

  -- 1. Get current state
  local state = redis.call("HMGET", key, "tokens", "lastRefill")
  -- BUG FIX HERE: Access array indices [1] and [2]
  local tokens = tonumber(state[1])
  local lastRefill = tonumber(state[2])

  -- 2. Initialize if missing
  if not tokens then
    tokens = capacity
    lastRefill = now
  end

  -- 3. Refill Logic
  local elapsedSeconds = (now - lastRefill) / 1000
  if elapsedSeconds > 0 then
    local newTokens = elapsedSeconds * refillRate
    tokens = math.min(capacity, tokens + newTokens)
    lastRefill = now
  end

  -- 4. Consume Logic
  local allowed = 0
  local retryAfterMs = 0

  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
    redis.call("HMSET", key, "tokens", tokens, "lastRefill", lastRefill)
    redis.call("EXPIRE", key, 3600)
  else
    local missing = cost - tokens
    retryAfterMs = (missing / refillRate) * 1000
  end

  return { allowed, tokens, retryAfterMs }
`;

export class RedisTokenBucket implements RateLimiter {
  private redis: Redis;
  private refillRate: number;

  constructor(client: Redis, refillRatePerSec: number = 1) {
    this.redis = client;
    this.refillRate = refillRatePerSec;
  }

  async allow(key: string, cost: number, capacity: number) {
    const now = Date.now();
    
    // Execute the Lua script
    const result = await this.redis.eval(
      TOKEN_BUCKET_SCRIPT,
      1,           // Number of keys
      key,         // Key name
      capacity,    // Arg 1
      this.refillRate, // Arg 2
      cost,        // Arg 3
      now          // Arg 4
    ) as [number, number, number];

    const [allowed, remaining, retryAfterMs] = result;

    return {
      allowed: allowed === 1,
      remaining: Math.floor(remaining),
      resetAtMs: allowed === 1 ? 0 : now + retryAfterMs
    };
  }
}
