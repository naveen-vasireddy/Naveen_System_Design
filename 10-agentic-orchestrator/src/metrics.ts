import * as http from 'http';

export class MetricsRegistry {
  // Counters
  public totalTasksReceived = 0;
  public successfulTasks = 0;
  public failedTasks = 0;
  public totalRetries = 0;
  public dlqTasks = 0;

  // Traces & Latency
  private taskStartTimes: Map<string, number> = new Map();
  private taskLatenciesMs: number[] = [];

  // --- TRACING METHODS ---
  public recordTaskStart(taskId: string) {
    this.totalTasksReceived++;
    this.taskStartTimes.set(taskId, Date.now());
    console.log(`[Trace] 🟢 Task ${taskId} started.`);
  }

  public recordTaskSuccess(taskId: string) {
    this.successfulTasks++;
    const startTime = this.taskStartTimes.get(taskId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.taskLatenciesMs.push(duration);
      this.taskStartTimes.delete(taskId);
      console.log(`[Trace] ✅ Task ${taskId} completed in ${duration}ms.`);
    }
  }

  public recordTaskFailure(taskId: string, isFinal: boolean) {
    if (isFinal) {
      this.failedTasks++;
      this.dlqTasks++;
      this.taskStartTimes.delete(taskId);
      console.log(`[Trace] 🚨 Task ${taskId} permanently failed (DLQ).`);
    } else {
      this.totalRetries++;
      console.log(`[Trace] ⚠️ Task ${taskId} failed and is being retried.`);
    }
  }

  // --- METRICS CALCULATION ---
  private calculateSuccessRatio(): string {
    if (this.totalTasksReceived === 0) return "0.00%";
    const ratio = (this.successfulTasks / this.totalTasksReceived) * 100;
    return `${ratio.toFixed(2)}%`;
  }

  private calculateAverageLatency(): number {
    if (this.taskLatenciesMs.length === 0) return 0;
    const sum = this.taskLatenciesMs.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.taskLatenciesMs.length);
  }

  // --- /METRICS ENDPOINT SERVER ---
  public startMetricsServer(port: number = 9090) {
    const server = http.createServer((req, res) => {
      if (req.url === '/metrics' && req.method === 'GET') {
        const metricsOutput = {
          system: "multi_agent_orchestrator",
          counters: {
            total_tasks: this.totalTasksReceived,
            successful_tasks: this.successfulTasks,
            failed_tasks: this.failedTasks,
            total_retries: this.totalRetries,
            dlq_size: this.dlqTasks
          },
          ratios: {
            success_ratio: this.calculateSuccessRatio()
          },
          performance: {
            average_task_latency_ms: this.calculateAverageLatency(),
            active_in_flight_tasks: this.taskStartTimes.size
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metricsOutput, null, 2));
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(port, () => {
      console.log(`📊 Metrics server running at http://localhost:${port}/metrics`);
    });
  }
}

// --- DEMO EXECUTION ---
if (require.main === module) {
  const metrics = new MetricsRegistry();
  metrics.startMetricsServer(9090);

  // Simulate a task lifecycle
  metrics.recordTaskStart('task-123');
  
  setTimeout(() => {
    metrics.recordTaskFailure('task-123', false); // Trigger a retry
    
    setTimeout(() => {
      metrics.recordTaskSuccess('task-123'); // Succeed on second try
    }, 1500);
  }, 1000);
}