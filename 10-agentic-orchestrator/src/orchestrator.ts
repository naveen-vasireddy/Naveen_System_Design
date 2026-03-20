// Replaced with single orchestrator implementation per Step 1 requirements
import * as crypto from 'crypto';

interface Task {
  id: string;
  agentType: string;
  payload: any;
  retryCount: number;
  maxRetries: number;
}

// 1. Consistent Hashing Ring for Task Routing
export class ConsistentHash {
  private ring: Map<number, string> = new Map();
  private sortedKeys: number[] = [];
  constructor(nodes: string[], private vNodes: number = 50) {
    nodes.forEach(node => this.addNode(node));
  }

  private hash(key: string): number {
    return parseInt(crypto.createHash('md5').update(key).digest('hex').substring(0, 8), 16);
  }

  public addNode(node: string) {
    for (let i = 0; i < this.vNodes; i++) {
      const key = this.hash(`${node}:${i}`);
      this.ring.set(key, node);
      this.sortedKeys.push(key);
    }
    this.sortedKeys.sort((a, b) => a - b);
  }

  // Shards tasks based on agentType
  public getNode(agentType: string): string {
    if (this.ring.size === 0) return '';
    const hashKey = this.hash(agentType);
    const target = this.sortedKeys.find(k => k >= hashKey) || this.sortedKeys[0];
    return this.ring.get(target)!;
  }
}

// 2. The Orchestrator Service
export class OrchestratorService {
  public dlq: Task[] = [];
  private agentQueues: Map<string, Task[]> = new Map();
  private inFlightTasks: Map<string, number> = new Map();
  
  // Backpressure threshold: Max concurrent tasks per node
  private MAX_CONCURRENT_TASKS = 2; 
  private ring: ConsistentHash;

  constructor(agentNodes: string[]) {
    this.ring = new ConsistentHash(agentNodes);
    agentNodes.forEach(node => {
      this.agentQueues.set(node, []);
      this.inFlightTasks.set(node, 0);
    });
  }

  public submitTask(task: Task) {
    console.log(`\n[Orchestrator] Received task ${task.id} (${task.agentType})`);
    
    // Shard via consistent hashing
    const targetNode = this.ring.getNode(task.agentType);
    console.log(`   -> Routed to ${targetNode} via Consistent Hashing`);
    
    this.schedule(targetNode, task);
  }

  private schedule(node: string, task: Task) {
    const inFlight = this.inFlightTasks.get(node) || 0;

    // BACKPRESSURE: If node is at capacity, queue it instead of executing
    if (inFlight >= this.MAX_CONCURRENT_TASKS) {
      console.log(`   -> [Backpressure] ${node} at capacity (${inFlight}/${this.MAX_CONCURRENT_TASKS}). Queuing task.`);
      this.agentQueues.get(node)!.push(task);
      return;
    }

    this.executeTask(node, task);
  }

  private executeTask(node: string, task: Task) {
    this.inFlightTasks.set(node, (this.inFlightTasks.get(node) || 0) + 1);
    console.log(`[${node}] 🏃 Executing task ${task.id} (Attempt ${task.retryCount + 1})`);

    // Simulate async agent execution (50% failure rate for demo)
    setTimeout(() => {
      const success = Math.random() > 0.5; 
      this.inFlightTasks.set(node, this.inFlightTasks.get(node)! - 1);

      if (success) {
        console.log(`[${node}] ✅ Task ${task.id} COMPLETED.`);
      } else {
        console.log(`[${node}] ❌ Task ${task.id} FAILED.`);
        this.handleFailure(node, task);
      }

      // Process next task in the node's queue if backpressure has eased
      const nextTask = this.agentQueues.get(node)!.shift();
      if (nextTask) this.schedule(node, nextTask);

    }, 300);
  }

  private handleFailure(node: string, task: Task) {
    if (task.retryCount < task.maxRetries) {
      task.retryCount++;
      
      // JITTERED RETRIES: Base delay (1000ms) + random jitter (0-1000ms)
      const jitter = Math.floor(Math.random() * 1000);
      const delay = 1000 + jitter;
      
      console.log(`   -> [Retry] Scheduling task ${task.id} retry in ${delay}ms (Jittered)`);
      setTimeout(() => this.schedule(node, task), delay);
    } else {
      // DLQ: Max retries exceeded
      console.log(`   -> 🚨 [DLQ] Task ${task.id} exhausted all retries. Moving to Dead Letter Queue.`);
      this.dlq.push(task);
    }
  }
}

// (compatibility export defined later)

// --- Compatibility Orchestrator (keeps existing test API) ---
function jitteredDelay(baseMs: number, attempt: number) {
  const exp = baseMs * Math.pow(2, attempt);
  const jitter = exp * 0.3 * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(exp + jitter));
}

export type Handler<T = any> = (task: any) => Promise<void>;

export class OrchestratorCompat<T = any> {
  private queue: any[] = [];
  private working = 0;
  private readonly concurrency: number;
  private readonly maxQueue: number;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly dlq: any[] = [];
  private readonly handlers: Map<string, Handler<T>> = new Map();
  private readonly shardRing: ConsistentHash;

  constructor(opts: {
    shards: string[];
    concurrency: number;
    maxQueue: number;
    maxRetries?: number;
    baseDelayMs?: number;
  }) {
    this.shardRing = new ConsistentHash(opts.shards);
    this.concurrency = opts.concurrency;
    this.maxQueue = opts.maxQueue;
    this.maxRetries = opts.maxRetries ?? 5;
    this.baseDelayMs = opts.baseDelayMs ?? 50;
  }

  registerHandler(agentType: string, handler: Handler<T>) {
    this.handlers.set(agentType, handler);
  }

  getDLQ() {
    return [...this.dlq];
  }

  enqueue(task: any): Promise<void> {
    if (this.queue.length + this.working >= this.maxQueue) {
      return Promise.reject(new Error('queue_full'));
    }
    this.queue.push(task);
    this.tryProcess();
    return Promise.resolve();
  }

  private tryProcess() {
    while (this.working < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.working++;
      this.processWithRetries(task)
        .catch(() => {})
        .finally(() => {
          this.working--;
          setImmediate(() => this.tryProcess());
        });
    }
  }

  private async processWithRetries(task: any) {
    const agentType = task.agentType;
    const handler = this.handlers.get(agentType);
    if (!handler) {
      this.dlq.push(task);
      return;
    }

    const shard = this.shardRing.getNode(agentType);

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        await handler(task);
        return;
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) break;
        const delay = jitteredDelay(this.baseDelayMs, attempt - 1);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    (task as any).__shard = shard;
    this.dlq.push(task);
  }
}

// Export under the original name used in tests
export { OrchestratorCompat as Orchestrator };

// --- DEMO EXECUTION ---
if (require.main === module) {
  console.log("=== STARTING ORCHESTRATOR DEMO ===\n");
  
  // Initialize Orchestrator with 3 Agent Worker Nodes
  const orchestrator = new OrchestratorService(['Worker-A', 'Worker-B', 'Worker-C']);

  // Submit multiple tasks rapidly to trigger Backpressure and Hashing
  for (let i = 1; i <= 5; i++) {
    orchestrator.submitTask({
      id: `task-${i}`,
      agentType: i % 2 === 0 ? 'RESEARCH_AGENT' : 'SUMMARY_AGENT', // Will hash differently
      payload: { data: "test" },
      retryCount: 0,
      maxRetries: 2
    });
  }
}
