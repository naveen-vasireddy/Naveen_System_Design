export interface Task {
  id: string;
  agentType: string;
  payload: any;
  retryCount: number;
}

export interface AgentConfig {
  agentType: string;
  orchestratorUrl: string; // URL to pull tasks from
  timeoutMs?: number;      // Maximum allowed time for task execution
}

// 1. THE SDK INTERFACE
export abstract class AgentSDK {
  private isRunning: boolean = false;
  private processedTaskIds: Set<string> = new Set(); // Local cache for idempotency
  private timeoutMs: number;

  constructor(private config: AgentConfig) {
    this.timeoutMs = config.timeoutMs || 5000;
  }

  // Lifecycle: INIT
  public async init(): Promise<void> {
    console.log(`[AgentSDK] Initializing ${this.config.agentType} worker...`);
    console.log(`[AgentSDK] Connecting to Orchestrator at ${this.config.orchestratorUrl}`);
    this.isRunning = true;
    // In a real implementation, you would start a long-polling loop or WebSocket here
  }

  // Lifecycle: SHUTDOWN
  public async shutdown(): Promise<void> {
    console.log(`\n[AgentSDK] Shutting down ${this.config.agentType} worker...`);
    this.isRunning = false;
    // Clean up network connections and gracefully drain active tasks
  }

  // 2. SANDBOX RUNNER WITH TIMEOUTS & IDEMPOTENT EXECUTION
  public async executeTask(task: Task): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Agent is not running. Call init() first.');
    }

    // IDEMPOTENCY: Check if we've already successfully processed this exact task ID
    if (this.processedTaskIds.has(task.id)) {
      console.log(`[AgentSDK] ⚠️ Task ${task.id} already processed. Skipping to prevent duplicate execution.`);
      return { status: 'skipped', reason: 'already_processed' };
    }

    console.log(`[AgentSDK] Sandboxing task ${task.id}...`);

    return new Promise((resolve, reject) => {
      // TIMEOUT: Prevent malfunctioning AI/LLM calls from hanging the worker forever
      const timer = setTimeout(() => {
        reject(new Error(`[Timeout] Task ${task.id} exceeded strict ${this.timeoutMs}ms sandbox limit.`));
      }, this.timeoutMs);

      // Execute the actual user-defined handler logic
      this.handle(task)
        .then((result) => {
          clearTimeout(timer);
          this.processedTaskIds.add(task.id); // Mark as processed for future idempotency checks
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // Lifecycle: HANDLE (To be implemented by the specific agent subclass)
  protected abstract handle(task: Task): Promise<any>;
}

// --- DEMO EXECUTION ---
// How a developer uses the SDK to create a specific agent
class ResearchAgent extends AgentSDK {
  protected async handle(task: Task): Promise<any> {
    console.log(`   -> [ResearchAgent] 🧠 Executing prompt:`, task.payload.prompt);
    
    return new Promise((resolve) => {
      // Simulate an unpredictable LLM API call (takes between 1s and 4s)
      const executionTime = Math.random() * 4000; 
      
      setTimeout(() => {
        resolve({ result: "Research data gathered successfully." });
      }, executionTime);
    });
  }
}

async function runDemo() {
  console.log("=== STARTING AGENT SDK DEMO ===\n");
  
  const agent = new ResearchAgent({
    agentType: 'RESEARCH_AGENT',
    orchestratorUrl: 'http://orchestrator:8080',
    timeoutMs: 3000 // Strict 3-second timeout limit
  });

  await agent.init();

  const mockTask: Task = {
    id: 'task-abc',
    agentType: 'RESEARCH_AGENT',
    payload: { prompt: 'Analyze recent AI trends' },
    retryCount: 0
  };

  try {
    const result = await agent.executeTask(mockTask);
    console.log(`   -> ✅ Success:`, result);
  } catch (error: any) {
    console.log(`   -> ❌ Failed:`, error.message);
  }

  // Idempotency Demo: Try sending the exact same task again
  console.log("\n--- Testing Idempotency Safeguard ---");
  await agent.executeTask(mockTask);

  await agent.shutdown();
}

if (require.main === module) {
  runDemo();
}
