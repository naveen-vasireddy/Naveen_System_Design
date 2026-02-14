import net from 'net';
import { ClusterManager } from './clusterManager';

export class HealthMonitor {
  private cluster: ClusterManager;
  private intervalMs: number;
  private failureThreshold: number;
  private failures: Map<string, number>;
  private isRunning: boolean = false;

  constructor(cluster: ClusterManager, intervalMs = 5000, failureThreshold = 3) {
    this.cluster = cluster;
    this.intervalMs = intervalMs;
    this.failureThreshold = failureThreshold;
    this.failures = new Map();
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Health] Monitor started.');
    
    setInterval(() => this.checkNodes(), this.intervalMs);
  }

  private async checkNodes(): Promise<void> {
    const nodes = this.cluster.getAllNodes();

    for (const node of nodes) {
      const isAlive = await this.ping(node);

      if (isAlive) {
        // Reset failure counter on success
        if (this.failures.has(node)) {
          this.failures.delete(node);
          console.log(`[Health] Node ${node} recovered.`);
        }
      } else {
        // Increment failure counter
        const count = (this.failures.get(node) || 0) + 1;
        this.failures.set(node, count);
        console.warn(`[Health] Node ${node} failed ping (${count}/${this.failureThreshold})`);

        if (count >= this.failureThreshold) {
          console.error(`[Health] removing dead node: ${node}`);
          this.cluster.removeNode(node);
          this.failures.delete(node); // Stop tracking it once removed
        }
      }
    }
  }

  private ping(nodeAddress: string): Promise<boolean> {
    return new Promise((resolve) => {
      const [host, port] = nodeAddress.split(':');
      const socket = new net.Socket();
      
      socket.setTimeout(2000); // 2s timeout

      socket.connect(parseInt(port), host, () => {
        socket.write('PING\r\n');
      });

      socket.on('data', (data) => {
        if (data.toString().includes('PONG')) {
          socket.destroy();
          resolve(true);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
    });
  }
}

