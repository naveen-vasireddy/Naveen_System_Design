import Redis from 'ioredis'; // Assumes 'ioredis' is installed (npm install ioredis)

class RedisLeaderElector {
  private redis: Redis;
  public isLeader: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    public nodeId: string, 
    private lockKey: string = 'microservice:leader:lock',
    private ttlSeconds: number = 3
  ) {
    this.redis = new Redis(); // Connects to local Redis on port 6379
  }

  // --- 1. REDIS ELECTION MECHANISM ---
  public async start() {
    console.log(`[Node ${this.nodeId}] Booting up. Competing for leadership...`);
    
    // Heartbeat loop: Run at half the TTL to ensure we renew before expiration
    this.intervalId = setInterval(() => this.campaign(), (this.ttlSeconds * 1000) / 2);
    await this.campaign();
  }

  public stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.redis.disconnect();
    console.log(`[Node ${this.nodeId}] Shutting down.`);
  }

  private async campaign() {
    // Attempt to acquire the lock: SET key value NX EX ttl
    // NX = Only set if it does NOT exist. EX = Expire after N seconds.
    const result = await this.redis.set(this.lockKey, this.nodeId, 'EX', this.ttlSeconds, 'NX');

    if (result === 'OK') {
      if (!this.isLeader) {
        console.log(`\n👑 [Node ${this.nodeId}] Acquired leadership! (SET NX succeeded)`);
        this.isLeader = true;
      } else {
        console.log(`[Node ${this.nodeId}] Heartbeat: Renewed leadership. (TTL reset)`);
      }
    } else {
      // We didn't get 'OK', meaning the lock already exists. Check who the leader is.
      const currentLeader = await this.redis.get(this.lockKey);
      
      if (currentLeader === this.nodeId) {
        // We are the leader, but NX failed because the key already exists!
        // We must renew our lock without NX.
        await this.redis.set(this.lockKey, this.nodeId, 'EX', this.ttlSeconds);
        console.log(`[Node ${this.nodeId}] Heartbeat: Renewed leadership. (TTL reset)`);
        this.isLeader = true;
      } else {
        if (this.isLeader) {
            console.log(`\n❌ [Node ${this.nodeId}] Lost leadership!`);
        }
        this.isLeader = false;
        console.log(`[Node ${this.nodeId}] Follower mode. Current leader is: ${currentLeader}`);
      }
    }
  }
}

// --- 2. FAILOVER DEMO ---
async function runFailoverDemo() {
  console.log("=== STARTING REDIS LEADER ELECTION DEMO ===\n");
  
  // Create 3 nodes competing for the same lock
  const node1 = new RedisLeaderElector("Node-1");
  const node2 = new RedisLeaderElector("Node-2");
  const node3 = new RedisLeaderElector("Node-3");

  // Start them slightly staggered
  await node1.start();
  setTimeout(() => node2.start(), 500);
  setTimeout(() => node3.start(), 1000);

  // Simulate a crash of the Leader (Node-1) after 5 seconds
  setTimeout(() => {
    console.log("\n🔥 [Simulated Crash] Node-1 (Current Leader) has suddenly crashed!");
    node1.stop();
    // Because Node-1 stopped sending heartbeats, its Redis key will EXPIRE in 3 seconds.
    // Node-2 or Node-3 will then successfully execute SET NX and take over!
  }, 5000);

  // End demo after 12 seconds
  setTimeout(() => {
    console.log("\n=== END OF DEMO ===");
    node2.stop();
    node3.stop();
    process.exit(0);
  }, 12000);
}

// Execute demo
if (require.main === module) {
  runFailoverDemo();
}