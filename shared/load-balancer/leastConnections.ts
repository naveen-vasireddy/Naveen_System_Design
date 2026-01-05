import { Server } from './types';

/**
 * Least-connections Load Balancer
 * A dynamic algorithm that selects the server with the fewest active connections.
 * Optimizes for fairness in scenarios where request processing times vary.
 */
export class LeastConnectionsBalancer {
  private servers: Server[];

  constructor(servers: Server[]) {
    if (servers.length === 0) {
      throw new Error("Balancer requires at least one server.");
    }
    this.servers = servers;
  }

  /**
   * Selects the server currently handling the least amount of traffic.
   * @returns The selected Server object
   */
  public getNextServer(): Server {
    // We use the activeConnections field to find the minimum load
    return this.servers.reduce((prev, curr) => {
      return prev.activeConnections < curr.activeConnections ? prev : curr;
    });
  }

  /**
   * Simulation Helper: Manually increment a server's load.
   * In a real system, this would happen when a request starts.
   */
  public reportRequestStart(serverId: string): void {
    const server = this.servers.find(s => s.id === serverId);
    if (server) {
      server.activeConnections++;
    }
  }

  /**
   * Simulation Helper: Manually decrement a server's load.
   * In a real system, this would happen when a request completes.
   */
  public reportRequestEnd(serverId: string): void {
    const server = this.servers.find(s => s.id === serverId);
    if (server && server.activeConnections > 0) {
      server.activeConnections--;
    }
  }
}